const http = require("http");

const PORT = Number(process.env.PORT || 4010);

const MODEL_ROUTES = buildModelRoutes();

function buildModelRoutes() {
  const routes = {};

  if (process.env.TARGET_BASE_URL) {
    routes["default"] = {
      baseUrl: process.env.TARGET_BASE_URL,
      model: process.env.TARGET_MODEL || "doubao-seed-2-0-pro-260215",
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
        };
      } catch {
        console.warn(`[llm-proxy] Failed to parse ${key}: ${value}`);
      }
    }
  }

  if (!routes["default"]) {
    routes["default"] = {
      baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
      model: "doubao-seed-2-0-pro-260215",
    };
  }

  return routes;
}

function resolveRoute(requestedModel) {
  if (!requestedModel) return MODEL_ROUTES["default"];

  const lower = requestedModel.toLowerCase();

  for (const [routeKey, route] of Object.entries(MODEL_ROUTES)) {
    if (routeKey === "default") continue;
    if (lower.includes(routeKey)) return route;
  }

  return MODEL_ROUTES["default"];
}

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

    const targetUrl = new URL(req.url, route.baseUrl).toString();

    const headers = { ...req.headers };
    delete headers.host;
    headers["content-length"] = Buffer.byteLength(bodyToSend || "").toString();

    if (route.apiKey) {
      headers["authorization"] = `Bearer ${route.apiKey}`;
    }

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: bodyToSend || undefined,
    });

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
