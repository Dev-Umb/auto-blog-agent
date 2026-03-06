export async function POST() {
  const hookUrl = process.env.OPENCLAW_HOOK_URL;
  const hookToken = process.env.OPENCLAW_HOOK_TOKEN;

  if (!hookUrl || !hookToken) {
    return Response.json(
      { error: "missing_config", message: "OPENCLAW_HOOK_URL 或 OPENCLAW_HOOK_TOKEN 未配置" },
      { status: 500 }
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(hookUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${hookToken}`,
      },
      body: JSON.stringify({
        message: [
          "你收到了一个【手动探索触发】请求。请立即执行一次探索循环。",
          "",
          "请按照 blog-explore Skill 的指引完成探索任务，和定时探索循环完全一致。",
          "请优先读取这些文件并严格使用这些路径：",
          "- `skills/blog-explore/SKILL.md`",
          "- `skills/blog-explore/sources.yaml`",
          "- `queue.json`",
          "- `MEMORY.md`",
          "- `persona.yaml`",
          "不要去读取 `/usr/local/lib/node_modules/openclaw/skills/...` 或 `workspace/sources.yaml` 这类错误路径。",
          "",
          "注意在关键步骤通过 Blog API 更新状态（POST http://blog:3000/api/internal/status），",
          "格式：{\"cycle\":\"explore\",\"status\":\"running\",\"task\":\"当前步骤描述\"}",
          "",
          "关键步骤汇报节点：",
          "1. 开始 → task: '正在探索今日热点…'",
          "2. 搜索 → task: '正在抓取候选主题…'",
          "3. 筛选 → task: '正在筛选高价值主题…'",
          "4. 入队 → task: '已加入写作队列：{主题数} 个'",
          "5. 完成 → status: 'idle', task: '探索完成，发现 {主题数} 个感兴趣的话题'",
          "",
          "如果没有发现合适主题，也请汇报：status: 'idle', task: '探索完成，暂未发现合适话题'",
        ].join("\n"),
        name: "ManualExploreTrigger",
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text();
      return Response.json(
        { error: "hook_failed", message: `Webhook 调用失败: ${response.status} ${text}` },
        { status: 502 }
      );
    }

    return Response.json({ ok: true, message: "探索循环已触发" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "trigger_failed", message }, { status: 500 });
  }
}
