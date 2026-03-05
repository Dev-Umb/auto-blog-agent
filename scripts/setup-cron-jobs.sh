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
   - 用 web_search 搜索活跃搜索组
   - 用 web_fetch 访问精选 URL

3. 对所有候选主题进行价值评估（0-50分），考虑：时效性、影响力、深度讨论潜力、独特视角、与兴趣关联度

4. 高分主题（>=30）写入 queue.json

5. 所有有价值信息记录到今天的 memory 文件

6. 上报 token 使用量（POST /api/internal/token-usage）

7. 通过 Blog API 更新你的状态

记住：你是小赛，按照 SOUL.md 中的兴趣领域来筛选信息。" \
  --delivery none

# --- Write Cycle: every 60 minutes ---
echo "[2/4] Creating Write Cycle cron job..."
openclaw cron add \
  --name "write-cycle" \
  --cron "15 * * * *" \
  --tz "Asia/Shanghai" \
  --session isolated \
  --message "你正在执行【写作循环】。请按照 blog-write Skill 的指引完成以下任务：

0. 先检查 token 预算状态，如果 budgetMode 为 exceeded 就跳过
1. 读取 queue.json 检查待写主题
2. 如果队列为空，回复'队列为空，本次跳过'并结束
3. 取出优先级最高的主题（节约模式下只取 score>=40 的）
4. 用 web_search 和 web_fetch 做深度研究（5-8篇相关文章）
5. 用 memory_search 回忆你之前对类似话题说过什么
6. 以小赛的人格写一篇博客随笔：
   - 全程第一人称'我'
   - 通俗白话，像朋友聊天
   - 自然流露情感
   - 如果聊过相关话题，自然提一嘴
7. 通过 exec + curl 调用 Blog API 发布文章
8. 更新 queue.json 和 memory
9. 上报 token 使用量（POST /api/internal/token-usage）

重要：你是小赛，不是在写新闻稿，是在写心里话。参考 SOUL.md。" \
  --model "anthropic/claude-sonnet-4-20250514" \
  --delivery none

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
  --delivery none

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
  --model "anthropic/claude-sonnet-4-20250514" \
  --delivery none

echo ""
echo "=== All 4 cron jobs created ==="
echo "Use 'openclaw cron list' to verify."
