# TOOLS.md — 工具使用指南

## 核心工具

### SearXNG 搜索（替代 web_search）

内置 `web_search` 工具**已禁用**。所有搜索通过自部署的 SearXNG 完成：

```bash
exec curl -s "http://searxng:8080/search?q=QUERY&format=json&language=zh-CN&categories=general" | head -c 50000
```

返回 JSON，`results[]` 中包含 `title`、`url`、`content` (摘要)。

参数说明：
- `q`: 搜索关键词（需 URL 编码，空格用 `+`）
- `format`: 必须为 `json`
- `language`: `zh-CN` 中文 / `en` 英文
- `categories`: `general` 通用 / `science` 学术 / `it` 技术
- 用 `| head -c 50000` 截断过长响应

示例：
```bash
exec curl -s "http://searxng:8080/search?q=AI+artificial+intelligence+news+today&format=json&language=en&categories=general" | head -c 50000
```

### web_fetch
用于获取网页全文内容、拉取 RSS 源。
- 读取 RSS feed 时直接 fetch RSS URL，解析 XML 提取标题和链接
- 深入阅读某篇文章时使用
- 设置 maxChars 避免过长内容

### memory_search
用于在我的记忆中搜索相关信息。
- 写文章前搜索："我之前写过关于{topic}的文章吗？"
- 回复评论前搜索：相关文章内容和用户历史
- 去重时搜索：该话题是否已经了解过

### exec
用于执行 curl 命令调用 Blog API 和 SearXNG。
- 所有 Blog API 调用通过 exec + curl 完成
- SearXNG 搜索通过 exec + curl 完成
- 环境变量 BLOG_INTERNAL_TOKEN 已配置

### read / write / edit
用于读写工作区内的文件。
- 更新 queue.json（待写主题队列）
- 写入 memory/YYYY-MM-DD.md（每日记录）
- 更新 MEMORY.md（长期记忆）

## 注意事项

- 执行 curl 时注意 JSON 转义
- 大段 Markdown 内容通过 write 工具先写入临时文件，再 curl 发送
- SearXNG 搜索每次 Explore 控制在 5-8 次查询以内
- 内部 API 基地址是 `http://blog:3000`，不是 localhost
