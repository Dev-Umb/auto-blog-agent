# 快速开始 (Quick Start)

从零部署自主博客 Agent 的完整步骤。

## 前置要求

- **Docker** ≥ 24.0 + **Docker Compose** v2
- **4GB+ 内存**的主机（推荐 4 核 4GB+）
- 以下 API Key（至少一个 LLM）：
  - [Doubao / 火山方舟](https://www.volcengine.com/product/doubao) — `OPENAI_API_KEY`
  - [Google Gemini](https://aistudio.google.com/) — `GEMINI_API_KEY`
  - [Anthropic Claude](https://console.anthropic.com/) — `ANTHROPIC_API_KEY`（可选，用于深度写作）

## 第一步：克隆项目

```bash
git clone <repo-url>
cd blog-agent
```

## 第二步：配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，**必须填写**的项：

```bash
# LLM API Keys（至少填一个）
OPENAI_API_KEY=your_ark_api_key
GEMINI_API_KEY=your_gemini_api_key

# 安全令牌（请替换为随机字符串）
OPENCLAW_HOOKS_TOKEN=随机字符串_32位以上
BLOG_INTERNAL_TOKEN=随机字符串_32位以上
OPS_CONTROL_TOKEN=随机字符串_32位以上
LLM_PROXY_ADMIN_TOKEN=随机字符串_32位以上

# 数据库密码
BLOG_PG_PASSWORD=你的数据库密码
```

可选项：

```bash
# Anthropic（深度写作用）
ANTHROPIC_API_KEY=your_anthropic_api_key

# 每日 Token 预算（单位：美分，默认 200 = $2.00/天）
DAILY_TOKEN_BUDGET_CENTS=200

# 告警 Webhook（Slack/Discord）
# ALERT_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
```

> **安全提示**：所有 token 请使用 `openssl rand -hex 24` 或类似命令生成随机字符串。

## 第三步：启动服务

```bash
docker compose up -d
```

首次启动会构建镜像，耗时约 2-5 分钟。启动顺序由 Docker Compose 自动管理：

```
blog-db (PostgreSQL) → ops-control → blog (Next.js) → llm-proxy → searxng → openclaw
```

检查所有服务是否健康：

```bash
docker compose ps
```

所有容器 STATUS 应显示 `(healthy)`。

## 第四步：注册 Cron Jobs

首次启动后需注册 Agent 的四个定时循环：

```bash
docker compose exec openclaw bash /scripts/setup-cron-jobs.sh
```

验证注册结果：

```bash
docker compose exec openclaw openclaw cron list
```

应看到 4 个 job：`explore`、`write`、`interact`、`reflect`。

## 第五步：访问服务

| 页面 | 地址 | 说明 |
|------|------|------|
| 博客首页 | http://localhost:3005 | 文章列表、阅读、评论 |
| Dashboard | http://localhost:3005/dashboard | Agent 状态、写作队列、监控 |
| 设置中心 | http://localhost:3005/settings | 模型/作者/内容方向/主题配置 |
| OpenClaw | http://localhost:18789 | Agent 运行时控制面板 |

## 配置内容方向

在设置中心的"内容方向"Tab 中，你可以：

1. **启用/禁用预设方向** — 科技热点、深度技术、娱乐花边、国家政策、世界局势、股市财经、互联网文化
2. **调整权重和频率** — 控制每个方向的搜索优先级和执行间隔
3. **编辑搜索关键词** — 精细调整每个方向使用的搜索词
4. **添加自定义方向** — 输入任意主题（如"宠物养护"、"独立游戏"）

配置完成后点击"保存并应用（重启服务）"即可生效。

## 自定义 Agent 人格

编辑 `openclaw/workspace/` 下的文件：

| 文件 | 用途 |
|------|------|
| `SOUL.md` | 核心灵魂：性格、价值观、说话风格 |
| `IDENTITY.md` | 身份信息：名字、标语 |
| `AGENTS.md` | 操作指令：循环行为定义 |
| `MEMORY.md` | 长期记忆：写作策略与经验 |

或者通过 Dashboard 设置中心的"AI 作者"Tab 在线调整。

## 常用运维命令

```bash
# 查看日志
docker compose logs -f blog          # 博客服务日志
docker compose logs -f openclaw      # Agent 运行日志
docker compose logs -f --tail=100    # 所有服务最近 100 行

# 重启单个服务
docker compose restart blog

# 重新构建并启动
docker compose up -d --build blog

# 停止所有服务
docker compose down

# 停止并清除数据卷（会删除数据库！）
docker compose down -v
```

## 健康检查

```bash
# 博客 API 健康检查
curl http://localhost:3005/api/health

# 所有服务状态
docker compose ps
```

## 故障排查

**服务启动失败**
```bash
docker compose logs <service-name>   # 查看具体服务日志
docker compose up blog               # 前台启动观察输出
```

**数据库连接失败**
- 确认 `BLOG_PG_PASSWORD` 在 `.env` 中已设置
- 确认 `blog-db` 容器 healthy：`docker compose ps blog-db`

**Agent 不执行循环**
- 确认 Cron Jobs 已注册：`docker compose exec openclaw openclaw cron list`
- 查看 OpenClaw 日志：`docker compose logs -f openclaw`

**LLM 调用失败**
- 确认 API Key 正确填写
- 检查 llm-proxy 日志：`docker compose logs llm-proxy`
