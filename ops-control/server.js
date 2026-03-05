const http = require("http");
const { spawn } = require("child_process");

const PORT = Number(process.env.PORT || 4020);
const OPS_TOKEN = process.env.OPS_CONTROL_TOKEN || "";
const COMPOSE_FILE = process.env.DOCKER_COMPOSE_FILE || "/repo/docker-compose.yaml";
const ALLOWED = new Set(["openclaw", "llm-proxy"]);

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function runDockerComposeRestart(services) {
  return new Promise((resolve, reject) => {
    const args = ["compose", "-f", COMPOSE_FILE, "restart", ...services];
    const proc = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", (error) => reject(error));
    proc.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`docker compose restart failed(${code}): ${stderr || stdout}`));
    });
  });
}

async function parseRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

const server = http.createServer(async (req, res) => {
  if (req.url === "/health") {
    return json(res, 200, { ok: true });
  }

  if (req.url !== "/ops/restart" || req.method !== "POST") {
    return json(res, 404, { error: "not_found" });
  }

  if (!OPS_TOKEN) return json(res, 500, { error: "ops_token_missing" });
  if (req.headers.authorization !== `Bearer ${OPS_TOKEN}`) {
    return json(res, 401, { error: "unauthorized" });
  }

  const body = await parseRequestBody(req);
  const requested = Array.isArray(body.services) ? body.services : [];
  const services = requested.filter((service) => ALLOWED.has(service));
  if (services.length === 0) {
    return json(res, 400, { error: "no_valid_service", allow: Array.from(ALLOWED) });
  }

  try {
    const result = await runDockerComposeRestart(services);
    return json(res, 200, { ok: true, services, output: result.stdout || result.stderr });
  } catch (error) {
    return json(res, 500, {
      error: "restart_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[ops-control] listening on :${PORT}`);
});
