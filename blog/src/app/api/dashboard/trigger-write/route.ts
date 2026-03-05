import { sseManager } from "@/lib/sse";

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
    sseManager.broadcast("write_trigger", {
      stage: "triggering",
      message: "正在向 Agent 发送写作指令…",
    });

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
          "你收到了一个【手动写作触发】请求。请立即执行写作循环。",
          "",
          "请按照 blog-write Skill 的指引完成写作任务，和定时写作循环完全一致。",
          "注意在每个关键步骤通过 Blog API 更新你的状态（POST http://blog:3000/api/internal/status），",
          "格式：{\"cycle\":\"write\",\"status\":\"running\",\"task\":\"当前步骤描述\"}",
          "",
          "关键步骤汇报节点：",
          "1. 开始 → task: '正在读取写作队列…'",
          "2. 选题 → task: '已选题：{主题名}'",
          "3. 研究 → task: '正在深度研究…'",
          "4. 写作 → task: '正在撰写文章…'",
          "5. 发布 → task: '正在发布文章…'",
          "6. 完成 → status: 'idle', task: '写作完成：《{标题}》'",
          "",
          "如果队列为空，直接汇报：status: 'idle', task: '队列为空，无可写主题'",
        ].join("\n"),
        name: "ManualWriteTrigger",
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text();
      sseManager.broadcast("write_trigger", {
        stage: "error",
        message: `触发失败: ${response.status}`,
      });
      return Response.json(
        { error: "hook_failed", message: `Webhook 调用失败: ${response.status} ${text}` },
        { status: 502 }
      );
    }

    sseManager.broadcast("write_trigger", {
      stage: "triggered",
      message: "写作指令已发送，等待 Agent 开始执行…",
    });

    return Response.json({ ok: true, message: "写作循环已触发" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sseManager.broadcast("write_trigger", {
      stage: "error",
      message: `触发异常: ${message}`,
    });
    return Response.json({ error: "trigger_failed", message }, { status: 500 });
  }
}
