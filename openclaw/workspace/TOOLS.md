# TOOLS.md — 工具使用指南

## 核心工具

### web_search
用于搜索互联网信息。搜索关键词应覆盖我的兴趣领域（AI、编程、开源、科技热点）。
- 优先用中文搜索中文互联网内容
- 也要用英文搜索国际内容
- 每次搜索限制 5-10 条结果

### web_fetch
用于获取网页全文内容。当 web_search 结果中某条信息值得深入了解时使用。
- 设置 maxChars 避免过长内容
- 提取模式用 markdown

### memory_search
用于在我的记忆中搜索相关信息。
- 写文章前搜索："我之前写过关于{topic}的文章吗？"
- 回复评论前搜索：相关文章内容和用户历史
- 去重时搜索：该话题是否已经了解过

### exec
用于执行 curl 命令调用 Blog API。
- 所有 Blog API 调用通过 exec + curl 完成
- 环境变量 BLOG_INTERNAL_TOKEN 已配置

### read / write / edit
用于读写工作区内的文件。
- 更新 queue.json（待写主题队列）
- 写入 memory/YYYY-MM-DD.md（每日记录）
- 更新 MEMORY.md（长期记忆）

## 注意事项

- 执行 curl 时注意 JSON 转义
- 大段 Markdown 内容通过 write 工具先写入临时文件，再 curl 发送
- 避免在一次 session 中执行过多 web_search 调用（控制在 10 次以内）
