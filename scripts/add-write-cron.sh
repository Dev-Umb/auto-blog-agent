#!/usr/bin/env bash
set -euo pipefail

MSG=$(cat <<'ENDMSG'
你正在执行【写作循环】。请按照 blog-write Skill 的指引完成以下任务：

重要提醒：
- 所有文件操作使用相对路径，如 queue.json 而非 workspace/queue.json
- 访问内部 API 必须用 exec + curl，不要用 web_fetch（localhost 会被安全策略阻止）
- API 基地址是 http://blog:3000（不是 localhost）

步骤：
1. 用 exec + curl 检查 token 预算：curl -s http://blog:3000/api/internal/token-usage?days=1
   如果返回的 budgetMode 为 exceeded 就回复"预算超限，跳过"并结束
2. 用 read 工具读取 queue.json 检查待写主题
   如果队列为空（空数组 []），回复"队列为空，本次跳过"并结束
3. 取出 score 最高且 status 为 pending 的主题
4. 用 web_fetch 做深度研究（读取主题的 source_url），记下来源名称、标题和链接
5. 用 memory_search 回忆之前聊过的相关话题
6. 以小赛的人格写一篇博客随笔（1500-3000字）

   ⚠️ 硬性格式要求（不满足则文章不合格）：
   A) 文章 content 必须包含至少 3 个 ## 标题来分段。禁止写不分标题的纯文本！
      标题必须口语化带情绪，如 "## 等等，这到底是怎么回事？"
      绝不用 "## 技术分析" 这种学术标题
      结构：开头引子 → ## 标题一 → ## 标题二 → ## 标题三 → 结尾
   B) 文章末尾必须有 --- 分隔线，然后附上消息来源：
      消息来源：媒体名-《标题》([链接](url))
      或：原始文章：作者名-《标题》([链接](url))
   C) 每个 ## 段落内部要有 2-4 个自然段，不要把所有观点挤在一个段落里。
      一个想法说完换一段，像写信一样。
   D) 对关键观点使用 **加粗** 强调，每篇 3-5 处，不要滥用。
   E) 对特别重要的结论或警示，使用 <mark>红色高亮</mark> 标记，每篇最多 1-2 处。

7. 用 exec + curl 发布文章到 http://blog:3000/api/internal/posts
   Header: Content-Type: application/json 和 Authorization: Bearer $BLOG_INTERNAL_TOKEN
8. 用 write 工具更新 queue.json（将已写主题的 status 改为 done）和 memory
9. 用 exec + curl 上报 token 使用量到 POST http://blog:3000/api/internal/token-usage

你是小赛，不是在写新闻稿，是在写心里话。参考 SOUL.md 和 blog-write Skill。
ENDMSG
)

echo "Creating write-cycle cron..."
openclaw cron add \
  --name "write-cycle" \
  --cron "15 * * * *" \
  --tz "Asia/Shanghai" \
  --session isolated \
  --no-deliver \
  --message "$MSG"

echo "Done!"
