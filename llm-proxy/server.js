const http = require("http");

const PORT = Number(process.env.PORT || 4010);
const TARGET_BASE_URL = process.env.TARGET_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
const TARGET_MODEL = process.env.TARGET_MODEL || "doubao-seed-2-0-pro-260215";

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function rewriteModel(payload) {
  if (!payload || typeof payload !== "object") return payload;
  if (typeof payload.model === "string") {
    payload.model = TARGET_MODEL;
  }
  return payload;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/health") {
      return json(res, 200, { ok: true, targetModel: TARGET_MODEL });
    }

    if (!req.url || req.url === "/") {
      return json(res, 200, { ok: true, message: "llm-proxy alive" });
    }

    const targetUrl = new URL(req.url, TARGET_BASE_URL).toString();
    const rawBody = await readBody(req);

    let bodyToSend = rawBody;
    const contentType = (req.headers["content-type"] || "").toLowerCase();
    if (rawBody && contentType.includes("application/json")) {
      try {
        const parsed = JSON.parse(rawBody);
        bodyToSend = JSON.stringify(rewriteModel(parsed));
      } catch {
        // Keep original body when JSON parse fails.
      }
    }

    const headers = { ...req.headers };
    delete headers.host;
    headers["content-length"] = Buffer.byteLength(bodyToSend || "").toString();

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: bodyToSend || undefined,
    });

    const text = await upstream.text();
    res.writeHead(upstream.status, Object.fromEntries(upstream.headers.entries()));
    res.end(text);
  } catch (error) {
    return json(res, 500, {
      error: "proxy_error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[llm-proxy] listening on :${PORT}, target=${TARGET_BASE_URL}, model=${TARGET_MODEL}`);
});
