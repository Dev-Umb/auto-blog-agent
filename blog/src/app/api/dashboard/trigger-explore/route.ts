import { sseManager } from "@/lib/sse";
import { getDashboardSettings } from "@/lib/settings-service";

function buildExploreMessage(activeDirections: { label: string; keywords: string[] }[]): string {
  const directionsList = activeDirections
    .map((d) => `  - ${d.label}：搜索关键词 ${d.keywords.map((k) => `"${k}"`).join("、")}`)
    .join("\n");

  return [
    "你收到了一个【手动探索触发】请求。请立即执行一次完整的探索循环。",
    "",
    "⚠️ 这是手动触发，必须搜索 ALL search_groups（忽略 frequency 限制），也必须拉取 ALL RSS feeds（忽略 fetch_frequency）。",
    "",
    `当前用户启用的内容方向（共 ${activeDirections.length} 个）：`,
    directionsList,
    "",
    "请按照 blog-explore Skill 的指引完成探索任务。",
    "请优先读取这些文件并严格使用这些路径：",
    "- `skills/blog-explore/SKILL.md`",
    "- `skills/blog-explore/sources.yaml`",
    "- `queue.json`",
    "- `MEMORY.md`",
    "- `persona.yaml`",
    "不要去读取 `/usr/local/lib/node_modules/openclaw/skills/...` 或 `workspace/sources.yaml` 这类错误路径。",
    "",
    "🔑 评分指导：",
    "- 入队阈值已降至 20 分（满分 50）。只要话题有时效性且与用户的内容方向相关，大方给分。",
    "- 不要因为「深度潜力」或「独特性」不足就大幅扣分——有新闻价值就值得写。",
    "- 每个启用的方向都应该至少尝试找到 1-2 个话题入队。",
    "",
    "注意在关键步骤通过 Blog API 更新状态（POST http://blog:3000/api/internal/status），",
    '格式：{"cycle":"explore","status":"running","task":"当前步骤描述"}',
    "",
    "关键步骤汇报节点：",
    "1. 开始 → task: '正在探索今日热点…'",
    "2. 搜索 → task: '正在搜索：{方向名称}…'",
    "3. RSS → task: '正在拉取 RSS 源…'",
    "4. 筛选 → task: '正在筛选高价值主题…'",
    "5. 入队 → task: '已加入写作队列：{主题数} 个'",
    "6. 完成 → status: 'idle', task: '探索完成，发现 {主题数} 个感兴趣的话题'",
    "",
    "如果没有发现合适主题，也请汇报：status: 'idle', task: '探索完成，暂未发现合适话题'",
  ].join("\n");
}

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
    sseManager.broadcast("explore_trigger", {
      stage: "triggering",
      message: "正在向 Agent 发送探索指令…",
    });

    const { settings } = await getDashboardSettings();
    const activeDirections = settings.contentDirections.directions
      .filter((d) => d.enabled)
      .map((d) => ({ label: d.label, keywords: d.keywords }));

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
        message: buildExploreMessage(activeDirections),
        name: "ManualExploreTrigger",
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text();
      sseManager.broadcast("explore_trigger", {
        stage: "error",
        message: `触发失败: ${response.status}`,
      });
      return Response.json(
        { error: "hook_failed", message: `Webhook 调用失败: ${response.status} ${text}` },
        { status: 502 }
      );
    }

    sseManager.broadcast("explore_trigger", {
      stage: "triggered",
      message: "探索指令已发送，等待 Agent 开始执行…",
    });

    return Response.json({ ok: true, message: "探索循环已触发" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sseManager.broadcast("explore_trigger", {
      stage: "error",
      message: `触发异常: ${message}`,
    });
    return Response.json({ error: "trigger_failed", message }, { status: 500 });
  }
}
