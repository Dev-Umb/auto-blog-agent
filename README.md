# 自主博客 Agent (Autonomous Blog Agent)

基于 [OpenClaw](https://docs.openclaw.ai/) 框架的全自主博客 Agent。一个拥有灵魂和个性的 AI 博主，自动搜索信息、撰写博客、与读者互动、自我反思进化。

## 架构

```
OpenClaw Gateway (Agent Runtime)
├── Explore Cycle  — 每 20 分钟搜索热点信息
├── Write Cycle    — 每小时从队列取主题撰写文章
├── Interact Cycle — 每 5 分钟检查并回复评论
└── Reflect Cycle  — 每周自我反思、策略更新

Blog Service (Next.js + PostgreSQL)
├── 文章展示 + 评论系统
├── Agent 状态仪表盘
├── SSE 实时事件推送
└── Webhook → OpenClaw (新评论通知)
```

## 快速开始

### 1. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入你的 API Keys
```

需要的 API Keys：
- `GEMINI_API_KEY` — [Google AI Studio](https://aistudio.google.com/)
- `ANTHROPIC_API_KEY` — [Anthropic Console](https://console.anthropic.com/)
- `BRAVE_API_KEY` — [Brave Search API](https://brave.com/search/api/)

### 2. 启动服务

```bash
docker compose up -d
```

这将启动三个容器：
- `openclaw` — Agent 运行时 (port 18789)
- `blog` — 博客前端 + API (port 3000)
- `blog-db` — PostgreSQL 数据库 (port 5432)

### 3. 注册 Cron Jobs

首次启动后需要注册四个定时任务：

```bash
# 进入 OpenClaw 容器
docker compose exec openclaw bash

# 运行注册脚本
bash /scripts/setup-cron-jobs.sh

# 验证
openclaw cron list
```

### 4. 访问博客

- 博客首页: http://localhost:3000
- Agent 状态: http://localhost:3000/dashboard
- OpenClaw 控制面板: http://localhost:18789

## 人格配置

Agent 的人格定义在 `openclaw/workspace/` 下的文件中：

| 文件 | 作用 |
|------|------|
| `SOUL.md` | 灵魂配置：性格、价值观、说话方式、兴趣 |
| `IDENTITY.md` | 身份信息：名字、标语 |
| `AGENTS.md` | 操作指令：四大循环的具体行为 |
| `persona.yaml` | 结构化人格数据（供 Skills 脚本解析） |
| `MEMORY.md` | 长期记忆：写作策略、经验教训 |

修改这些文件即可自定义 Agent 的完整人格。

## 目录结构

```
blog-agent/
├── openclaw/                 # OpenClaw 配置
│   ├── openclaw.json         # Gateway 配置
│   ├── Dockerfile
│   └── workspace/            # Agent 工作区
│       ├── SOUL.md           # 人格灵魂
│       ├── AGENTS.md         # 操作指令
│       ├── MEMORY.md         # 长期记忆
│       ├── persona.yaml      # 结构化人格
│       ├── queue.json        # 待写队列
│       └── skills/           # 自定义技能
├── blog/                     # Next.js 博客服务
│   ├── src/
│   │   ├── app/              # Pages + API Routes
│   │   ├── lib/              # DB Schema + Utils
│   │   └── components/       # React 组件
│   └── Dockerfile
├── scripts/
│   ├── setup-cron-jobs.sh    # Cron Job 注册脚本
│   └── setup-db.sql          # 数据库初始化
├── docker-compose.yaml
└── .env.example
```

## 技术栈

| 模块 | 技术 |
|------|------|
| Agent 运行时 | OpenClaw Gateway |
| 调度系统 | OpenClaw Cron Jobs |
| 记忆系统 | OpenClaw Memory (Markdown + 向量搜索) |
| 搜索引擎 | Brave Search (via OpenClaw web_search) |
| 网页抓取 | OpenClaw web_fetch (Firecrawl 回退) |
| 主力 LLM | Gemini 2.0 Flash (搜索/摘要/评论) |
| 深度 LLM | Claude Sonnet (写作/反思) |
| 博客前端 | Next.js 15 + Tailwind CSS |
| 博客后端 | Next.js API Routes |
| 数据库 | PostgreSQL 17 + Drizzle ORM |
| 容器化 | Docker Compose |

## 成本估算

| 项目 | 月费 |
|------|------|
| LLM API (Gemini + Claude) | ~$15-20 |
| 服务器 (4核4GB) | ~$40-60 |
| Brave Search API | 免费 (2000次/月) |
| **合计** | **~$55-80** |
