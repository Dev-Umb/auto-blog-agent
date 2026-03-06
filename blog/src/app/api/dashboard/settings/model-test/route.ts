interface ModelTestRequest {
  providerKey?: string;
  baseUrl?: string;
  apiKey?: string;
  apiKeyEnv?: string;
  modelId?: string;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    const body = (await request.json()) as ModelTestRequest;
    const providerKey = (body.providerKey ?? "").trim();
    const baseUrlRaw = (body.baseUrl ?? "").trim();
    const apiKeyInput = (body.apiKey ?? "").trim();
    const apiKeyEnv = (body.apiKeyEnv ?? "").trim();
    const modelId = (body.modelId ?? "").trim();

    if (!providerKey) {
      return Response.json({ error: "invalid_request", message: "providerKey 不能为空" }, { status: 400 });
    }
    if (!baseUrlRaw || !baseUrlRaw.startsWith("http")) {
      return Response.json({ error: "invalid_request", message: "baseUrl 必须是 http(s) URL" }, { status: 400 });
    }
    if (!apiKeyInput && !apiKeyEnv) {
      return Response.json(
        { error: "invalid_request", message: "apiKey 或 apiKeyEnv 至少提供一个" },
        { status: 400 }
      );
    }

    const apiKey = apiKeyInput || process.env[apiKeyEnv || ""];
    if (!apiKey) {
      return Response.json(
        {
          ok: false,
          providerKey,
          message: `环境变量 ${apiKeyEnv} 未设置`,
          code: "missing_api_key_env",
        },
        { status: 400 }
      );
    }

    const baseUrl = normalizeBaseUrl(baseUrlRaw);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      let response = await fetch(`${baseUrl}/models`, {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      });

      let method: "models" | "chat" = "models";
      if (!response.ok && modelId) {
        response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1,
            temperature: 0,
          }),
          signal: controller.signal,
        });
        method = "chat";
      }

      if (response.ok) {
        return Response.json({
          ok: true,
          providerKey,
          method,
          message: "连接成功，API Key 可用",
          latencyMs: Date.now() - startedAt,
        });
      }

      const text = await response.text();
      return Response.json(
        {
          ok: false,
          providerKey,
          method,
          message: `连接失败：HTTP ${response.status}`,
          detail: text.slice(0, 300),
          latencyMs: Date.now() - startedAt,
        },
        { status: 400 }
      );
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "连接超时（10s）"
        : error instanceof Error
          ? error.message
          : String(error);
    return Response.json(
      {
        ok: false,
        message: `测试失败：${message}`,
        latencyMs: Date.now() - startedAt,
      },
      { status: 500 }
    );
  }
}
