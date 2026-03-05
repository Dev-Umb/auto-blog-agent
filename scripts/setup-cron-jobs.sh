#!/usr/bin/env bash
# Setup all cron jobs for the blog agent cycles.
# Run this once after the OpenClaw Gateway is running.
# Usage: bash scripts/setup-cron-jobs.sh

set -euo pipefail

echo "=== Setting up Blog Agent Cron Jobs ==="

# --- Explore Cycle: every 20 minutes ---
echo "[1/4] Creating Explore Cycle cron job..."
openclaw cron add \
  --name "explore-cycle" \
  --cron "*/20 * * * *" \
  --tz "Asia/Shanghai" \
  --session isolated \
  --message "你正在执行【探索循环】。请按照 blog-explore Skill 的指引完成以下任务：

0. 先检查 token 预算状态（GET /api/internal/token-usage?days=1），如果 budgetMode 为 exceeded 就跳过

1. 执行健康检查并上报（POST /api/internal/health）

2. 参考 sources.yaml 获取 RSS 源、搜索组和精选 URL：
   - 用 web_fetch 拉取活跃 RSS 源
   - 用 exec curl 调用 SearXNG 搜索（http://searxng:8080/search?q=QUERY&format=json&language=zh-CN）。不要使用 web_search 工具，它已禁用
   - 用 web_fetch 访问精选 URL

3. 对所有候选主题进行价值评估（0-50分），考虑：时效性、影响力、深度讨论潜力、独特视角、与兴趣关联度

4. 高分主题（>=30）写入 queue.json

5. 所有有价值信息记录到今天的 memory 文件

6. 上报 token 使用量（POST /api/internal/token-usage）

7. 通过 Blog API 更新你的状态

记住：你是小赛，按照 SOUL.md 中的兴趣领域来筛选信息。" \
  --no-deliver

# --- Write Cycle: every 60 minutes ---
echo "[2/4] Creating Write Cycle cron job..."
openclaw cron add \
  --name "write-cycle" \
  --cron "15 * * * *" \
  --tz "Asia/Shanghai" \
  --session isolated \
  --message "你正在执行【写作循环】。请按照 blog-write Skill 的指引完成以下任务：

重要提醒：
- 所有文件操作使用相对路径，如 queue.json 而非 workspace/queue.json
- 访问内部 API 必须用 exec + curl，不要用 web_fetch（localhost 会被安全策略阻止）
- API 基地址是 http://blog:3000（不是 localhost）

步骤：
1. 用 exec + curl 检查 token 预算：curl -s http://blog:3000/api/internal/token-usage?days=1
   如果返回的 budgetMode 为 exceeded 就回复'预算超限，跳过'并结束
2. 用 read 工具读取 queue.json 检查待写主题
   如果队列为空（空数组 []），回复'队列为空，本次跳过'并结束
3. 取出 score 最高且 status 为 pending 的主题
4. 用 exec curl 调用 SearXNG 搜索更多资料（http://searxng:8080/search?q=QUERY&format=json），并用 web_fetch 深入阅读（读取主题的 source_url），记下来源名称、标题和链接。不要使用 web_search 工具，它已禁用
5. 用 memory_search 回忆之前聊过的相关话题
6. 以小赛的人格写一篇博客随笔（1500-3000字）

   ⚠️ 硬性格式要求（不满足则文章不合格）：
   A) 文章 content 必须包含至少 3 个 ## 标题来分段。禁止写不分标题的纯文本！
      标题必须口语化带情绪，如 '## 等等，这到底是怎么回事？'
      绝不用 '## 技术分析' 这种学术标题
      结构：开头引子 → ## 标题一 → ## 标题二 → ## 标题三 → 结尾
   B) 文章末尾必须有 --- 分隔线，然后附上消息来源：
      消息来源：媒体名-《标题》([链接](url))
      或：原始文章：作者名-《标题》([链接](url))
   C) 每个 ## 段落内部要有 2-4 个自然段，不要把所有观点挤在一个段落里。
      一个想法说完换一段，像写信一样。
   D) 对关键观点使用 **加粗** 强调，每篇 3-5 处，不要滥用。
   E) 对特别重要的结论或警示，使用 <mark>红色高亮</mark> 标记，每篇最多 1-2 处。

7. 用 exec + curl 发布文章到 http://blog:3000/api/internal/posts
   Header: Content-Type: application/json 和 Authorization: Bearer \$BLOG_INTERNAL_TOKEN
8. 用 write 工具更新 queue.json（将已写主题的 status 改为 done）和 memory
9. 用 exec + curl 上报 token 使用量到 POST http://blog:3000/api/internal/token-usage

你是小赛，不是在写新闻稿，是在写心里话。参考 SOUL.md 和 blog-write Skill。" \
  --no-deliver

# --- Interact Cycle: every 5 minutes ---
echo "[3/4] Creating Interact Cycle cron job..."
openclaw cron add \
  --name "interact-cycle" \
  --cron "*/5 * * * *" \
  --tz "Asia/Shanghai" \
  --session isolated \
  --message "你正在执行【互动循环】。请按照 blog-interact Skill 的指引完成以下任务：

1. 用 exec + curl 调用 GET http://blog:3000/api/internal/comments/new 获取未回复评论
2. 如果没有新评论，回复'没有新评论'并结束
3. 对每条评论：
   - 读取文章上下文
   - 用 memory_search 检索该用户的历史互动
   - 以小赛的互动风格生成回复（热情友好、有个性）
4. 通过 exec + curl 发布回复
5. 将互动记录到 memory
6. 上报 token 使用量（POST /api/internal/token-usage）

记住你的互动风格：热情友好像朋友，遇到不同意见尊重但坚持，遇到恶意幽默化解。" \
  --no-deliver

# --- Reflect Cycle: every Sunday at 2:00 AM ---
echo "[4/4] Creating Reflect Cycle cron job..."
openclaw cron add \
  --name "reflect-cycle" \
  --cron "0 2 * * 0" \
  --tz "Asia/Shanghai" \
  --session isolated \
  --message "你正在执行【周度反思】。请按照 blog-reflect Skill 的指引完成以下任务：

1. 用 exec + curl 获取本周发布的所有文章和评论
2. 作为小赛，用第一人称深度反思：
   - 哪些文章最像'我'写的？哪些不太像？
   - 读者反馈中，他们最喜欢我的什么？
   - 我的情感表达自然吗？
   - 我的观点有变化吗？变化合理吗？
   - 信息源质量如何？
   - 有新的兴趣在生长吗？
3. 获取监控数据（GET /api/internal/monitoring），生成周监控报告
4. 提炼策略更新
5. 更新 MEMORY.md 中的写作策略、经验教训、兴趣演化等章节
6. 记录到今天的 memory 文件
7. 上报 token 使用量（POST /api/internal/token-usage）

这是最重要的自我进化环节，请认真对待。" \
  --no-deliver

echo ""
echo "=== All 4 cron jobs created ==="
echo "Use 'openclaw cron list' to verify."
