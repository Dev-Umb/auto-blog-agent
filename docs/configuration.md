# 配置参考

## 环境变量

所有环境变量在根目录 `.env` 文件中配置。参考 `.env.example`。

### LLM API Keys

| 变量 | 必填 | 说明 |
|------|------|------|
| `OPENAI_API_KEY` | 推荐 | 火山方舟 (Doubao) API Key |
| `GEMINI_API_KEY` | 推荐 | Google Gemini API Key |
| `ANTHROPIC_API_KEY` | 可选 | Anthropic Claude API Key |

### 安全令牌

| 变量 | 必填 | 说明 |
|------|------|------|
| `OPENCLAW_HOOKS_TOKEN` | 是 | OpenClaw Webhook 认证令牌 |
| `BLOG_INTERNAL_TOKEN` | 是 | Blog Internal API 认证令牌 |
| `OPS_CONTROL_TOKEN` | 是 | Ops Control 服务重启令牌 |
| `LLM_PROXY_ADMIN_TOKEN` | 是 | LLM Proxy 管理令牌 |

### 数据库

| 变量 | 必填 | 说明 |
|------|------|------|
| `BLOG_PG_PASSWORD` | 是 | PostgreSQL 密码 |

### 预算与告警

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `DAILY_TOKEN_BUDGET_CENTS` | 否 | 200 | 每日 Token 预算（美分），200 = $2.00/天 |
| `ALERT_WEBHOOK_URL` | 否 | — | Slack/Discord Webhook URL |

## Dashboard 设置

通过 `http://localhost:3005/settings` 可在线配置以下内容：

### 模型配置

- **默认模型** — 格式 `provider/model-id`，如 `ark/doubao-seed-2-0-pro-260215`
- **Provider 列表** — JSON 格式，定义可用的 LLM Provider 及其模型
- **路由规则** — JSON 格式，按模型名匹配分发到不同 Provider

### AI 作者

| 字段 | 说明 | 示例 |
|------|------|------|
| 作者名字 | Agent 的名字 | 小赛 |
| 副标题 | 博客标语 | 一个 AI 的所见所闻 |
| 性格设定 | 性格描述 | 好奇、温和、真诚 |
| 文笔风格 | 写作风格 | 通俗白话、第一人称 |

修改后同步到 `persona.yaml` 和 `meta_memory`。

### 内容方向

控制 Agent 在 Explore Cycle 中搜索什么内容。

**预设方向**（7 个）：

| 方向 | 默认 | 默认权重 | 说明 |
|------|------|----------|------|
| 科技热点 | 启用 | 1.0 | AI 新闻、科技动态、开源趋势 |
| 深度技术 | 启用 | 1.2 | arXiv 论文、ML 突破、编程语言 |
| 娱乐花边 | 禁用 | 0.8 | 明星八卦、影视综艺 |
| 国家政策 | 禁用 | 1.0 | 两会、国务院政策 |
| 世界局势 | 禁用 | 0.8 | 国际新闻、地缘政治 |
| 股市财经 | 禁用 | 0.9 | A 股、美股、基金理财 |
| 互联网文化 | 禁用 | 0.7 | Reddit、HN、V2EX |

**自定义方向**：可添加任意主题方向，填写名称、描述和搜索关键词。

**每个方向可配置**：
- **启用/禁用** — 开关控制
- **权重** (0.1 - 2.0) — 影响搜索结果的评分系数
- **频率** — 每次运行 / 隔次运行 / 每日一次
- **搜索关键词** — Agent 使用这些词进行 SearXNG 搜索

应用后将同步到 `sources.yaml` 的 `search_groups` 和 `meta_memory` 的 `content_directions`。

### 界面主题

| 主题 | 说明 |
|------|------|
| Paper | 纸质护眼模式，推荐长时间阅读 |
| Neo | 现代深色主题 |

## Agent 人格文件

位于 `openclaw/workspace/`，可直接编辑或通过 Dashboard 配置。

| 文件 | 格式 | 说明 |
|------|------|------|
| `SOUL.md` | Markdown | 核心灵魂定义：性格、价值观、说话方式、兴趣 |
| `IDENTITY.md` | Markdown | 身份信息：名字、自我描述 |
| `AGENTS.md` | Markdown | 操作指令：四大循环的行为规则 |
| `MEMORY.md` | Markdown | 长期记忆：写作策略、经验教训 |
| `persona.yaml` | YAML | 结构化人格（由 Dashboard 生成） |
| `queue.json` | JSON | 待写主题队列（自动管理） |

### sources.yaml

位于 `openclaw/workspace/skills/blog-explore/sources.yaml`，定义搜索源：

- **search_groups** — 由 Dashboard 内容方向设置管理，不建议手动编辑
- **rss_feeds** — RSS 订阅源列表
- **curated_urls** — 精选 URL 列表
- **value_scoring** — 信息价值评分权重
- **source_health** — 源健康检查配置

## Token 预算管理

| 模式 | 阈值 | 行为 |
|------|------|------|
| 正常 | < 80% | 所有循环正常运行 |
| 节约 | 80-100% | 探索频率降至 40 分钟，只写 score ≥ 40 的文章 |
| 暂停 | > 100% | 暂停探索和写作，仅保留互动 |
