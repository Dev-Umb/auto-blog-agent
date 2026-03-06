const http = require("http");
const { readFileSync } = require("fs");

const PORT = Number(process.env.PORT || 4010);
const ROUTES_FILE = process.env.LLM_PROXY_ROUTES_PATH || "/app/routes.json";
const ADMIN_TOKEN = process.env.LLM_PROXY_ADMIN_TOKEN || "";
const BLOG_ALERTS_URL =
  process.env.BLOG_ALERTS_URL || "http://blog:3000/api/internal/alerts";
const BLOG_INTERNAL_TOKEN = process.env.BLOG_INTERNAL_TOKEN || "";

let MODEL_ROUTES = buildModelRoutes();

function buildModelRoutes() {
  const routes = {};

  if (process.env.TARGET_BASE_URL) {
    routes.default = {
      baseUrl: process.env.TARGET_BASE_URL,
      model: process.env.TARGET_MODEL || "doubao-seed-2-0-pro-260215",
      match: "default",
    };
  }

  const routeEnvPattern = /^MODEL_ROUTE_(\w+)$/;
  for (const [key, value] of Object.entries(process.env)) {
    const match = key.match(routeEnvPattern);
    if (match && value) {
      try {
        const parsed = JSON.parse(value);
        routes[match[1].toLowerCase()] = {
          baseUrl: parsed.baseUrl,
          model: parsed.model,
          apiKey: parsed.apiKey,
          match: match[1].toLowerCase(),
        };
      } catch {
        console.warn(`[llm-proxy] Failed to parse ${key}: ${value}`);
      }
    }
  }

  try {
    const raw = readFileSync(ROUTES_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && parsed.routes && typeof parsed.routes === "object") {
      for (const [key, value] of Object.entries(parsed.routes)) {
        if (!value || typeof value !== "object") continue;
        const route = value;
        routes[key.toLowerCase()] = {
          baseUrl: route.baseUrl,
          model: route.model,
          apiKey: route.apiKey,
          apiKeyEnv: route.apiKeyEnv,
          match: (route.match || key).toLowerCase(),
        };
      }
    }
  } catch {
    // Ignore missing/invalid routes file and keep env defaults.
  }

  if (!routes.default) {
    routes.default = {
      baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
      model: "doubao-seed-2-0-pro-260215",
      match: "default",
    };
  }

  return routes;
}

function routeApiKey(route) {
  if (route.apiKey) return route.apiKey;
  if (route.apiKeyEnv && process.env[route.apiKeyEnv]) return process.env[route.apiKeyEnv];
  return "";
}

function resolveRoute(requestedModel) {
  if (!requestedModel) return MODEL_ROUTES.default;

  const lower = requestedModel.toLowerCase();

  for (const [routeKey, route] of Object.entries(MODEL_ROUTES)) {
    if (routeKey === "default") continue;
    const matchKey = (route.match || routeKey || "").toLowerCase();
    if (matchKey && lower.includes(matchKey)) return route;
    if (lower.includes(routeKey)) return route;
  }

  return MODEL_ROUTES.default;
}

// --- Upstream error alerting with dedup ---
const ALERT_COOLDOWN_MS = 5 * 60 * 1000;
const recentAlerts = new Map();

function alertKey(status, routeMatch) {
  return `${status}:${routeMatch}`;
}

function shouldAlert(status, routeMatch) {
  const key = alertKey(status, routeMatch);
  const last = recentAlerts.get(key);
  if (last && Date.now() - last < ALERT_COOLDOWN_MS) return false;
  recentAlerts.set(key, Date.now());
  return true;
}

function reportUpstreamError(upstreamStatus, route, model, errorSnippet) {
  if (!BLOG_INTERNAL_TOKEN) return;
  if (!shouldAlert(upstreamStatus, route.match || "default")) return;

  const severity = upstreamStatus === 403 || upstreamStatus === 401 ? "error" : "warning";
  const statusHints = {
    401: "API Key 无效或已过期",
    403: "账户欠费或权限不足",
    429: "请求频率超限",
    500: "服务端内部错误",
    502: "上游网关错误",
    503: "服务暂时不可用",
  };
  const hint = statusHints[upstreamStatus] || `HTTP ${upstreamStatus}`;
  const message = `LLM 调用失败 [${hint}]：模型 ${model}，路由 ${route.match || "default"}（${route.baseUrl}）`;

  fetch(BLOG_ALERTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BLOG_INTERNAL_TOKEN}`,
    },
    body: JSON.stringify({
      severity,
      category: "llm_error",
      message,
      details: {
        upstreamStatus,
        model,
        routeKey: route.match || "default",
        baseUrl: route.baseUrl,
        errorSnippet: (errorSnippet || "").slice(0, 500),
      },
    }),
  }).catch((err) => {
    console.error("[llm-proxy] Failed to send alert:", err.message);
  });
}

setInterval(() => {
  const cutoff = Date.now() - ALERT_COOLDOWN_MS;
  for (const [key, ts] of recentAlerts) {
    if (ts < cutoff) recentAlerts.delete(key);
  }
}, ALERT_COOLDOWN_MS);

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/admin/reload" && req.method === "POST") {
      if (!ADMIN_TOKEN) return json(res, 500, { error: "admin_token_missing" });
      if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) {
        return json(res, 401, { error: "unauthorized" });
      }
      MODEL_ROUTES = buildModelRoutes();
      return json(res, 200, {
        ok: true,
        routes: Object.fromEntries(
          Object.entries(MODEL_ROUTES).map(([k, v]) => [k, { model: v.model, baseUrl: v.baseUrl }])
        ),
      });
    }

    if (req.url === "/health") {
      return json(res, 200, {
        ok: true,
        routes: Object.fromEntries(
          Object.entries(MODEL_ROUTES).map(([k, v]) => [
            k,
            { model: v.model, baseUrl: v.baseUrl },
          ])
        ),
      });
    }

    if (!req.url || req.url === "/") {
      return json(res, 200, { ok: true, message: "llm-proxy alive" });
    }

    const rawBody = await readBody(req);
    const contentType = (req.headers["content-type"] || "").toLowerCase();

    let bodyToSend = rawBody;
    let route = MODEL_ROUTES["default"];

    if (rawBody && contentType.includes("application/json")) {
      try {
        const parsed = JSON.parse(rawBody);
        route = resolveRoute(parsed.model);
        parsed.model = route.model;
        bodyToSend = JSON.stringify(parsed);
      } catch {
        // keep original
      }
    }

    const PROXY_BASE_PATH = "/api/v3";
    const relativePath = req.url.startsWith(PROXY_BASE_PATH)
      ? req.url.slice(PROXY_BASE_PATH.length)
      : req.url;
    const normalizedBase = route.baseUrl.replace(/\/+$/, "");
    const targetUrl = normalizedBase + relativePath;
    console.log(`[llm-proxy] ${req.method} ${req.url} -> ${route.match || "default"} (${route.model}) -> ${targetUrl}`);

    const headers = { ...req.headers };
    delete headers.host;
    headers["content-length"] = Buffer.byteLength(bodyToSend || "").toString();

    const key = routeApiKey(route);
    if (key) {
      headers["authorization"] = `Bearer ${key}`;
    }

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: bodyToSend || undefined,
    });

    if (upstream.status >= 400) {
      const text = await upstream.text();
      reportUpstreamError(upstream.status, route, route.model, text);
      res.writeHead(upstream.status, Object.fromEntries(upstream.headers.entries()));
      res.end(text);
      return;
    }

    const isStreaming =
      upstream.headers.get("content-type")?.includes("text/event-stream") ||
      upstream.headers.get("transfer-encoding") === "chunked";

    if (isStreaming && upstream.body) {
      const responseHeaders = Object.fromEntries(upstream.headers.entries());
      res.writeHead(upstream.status, responseHeaders);

      const reader = upstream.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            return;
          }
          res.write(value);
        }
      };
      await pump();
    } else {
      const text = await upstream.text();
      res.writeHead(upstream.status, Object.fromEntries(upstream.headers.entries()));
      res.end(text);
    }
  } catch (error) {
    return json(res, 500, {
      error: "proxy_error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[llm-proxy] listening on :${PORT}`);
  console.log(`[llm-proxy] routes:`, Object.fromEntries(
    Object.entries(MODEL_ROUTES).map(([k, v]) => [k, `${v.baseUrl} -> ${v.model}`])
  ));
});
