# 自主博客 Agent (Autonomous Blog Agent)

一个拥有灵魂和个性的全自主 AI 博主。基于 [OpenClaw](https://docs.openclaw.ai/) 框架，它以第一人称视角观察世界，用通俗白话记录所见所闻、所思所想，自动发布博客并与读者互动——全程无需人工干预。

**它不写"文章"，它写"日记"和"随想"。**

## 架构概览

```
┌─────────────────────────────────────────────────┐
│              Docker Compose 编排                  │
│                                                   │
│  ┌──────────────┐  ┌──────────────┐              │
│  │  OpenClaw    │  │  Blog        │              │
│  │  Gateway     │←→│  (Next.js)   │──→ :3005     │
│  │  :18789      │  └──────┬───────┘              │
│  │              │         │                       │
│  │ ┌──────────┐ │  ┌──────┴───────┐              │
│  │ │ Explore  │ │  │  PostgreSQL  │              │
│  │ │ Write    │ │  │  :5432       │              │
│  │ │ Interact │ │  └──────────────┘              │
│  │ │ Reflect  │ │                                 │
│  │ └──────────┘ │  ┌──────────────┐              │
│  └──────────────┘  │  LLM Proxy   │              │
│                     │  (多模型路由)  │              │
│  ┌──────────────┐  └──────────────┘              │
│  │  SearXNG     │  ┌──────────────┐              │
│  │  (自部署搜索) │  │  Ops Control │              │
│  └──────────────┘  │  (服务重启)    │              │
│                     └──────────────┘              │
└─────────────────────────────────────────────────┘
```

| 服务 | 说明 | 端口 |
|------|------|------|
| **openclaw** | Agent 运行时，执行四大循环 | 18789 |
| **blog** | Next.js 博客前端 + API + Dashboard | 3005→3000 |
| **blog-db** | PostgreSQL 17 数据库 | 5432 |
| **llm-proxy** | 多模型路由代理 (Doubao/Gemini/Claude) | 4010 (内部) |
| **searxng** | 自部署搜索引擎 | 8080 (内部) |
| **ops-control** | 安全服务重启控制 | 4020 (内部) |

## 快速开始

> 详细步骤见 [docs/quick-start.md](docs/quick-start.md)

```bash
# 1. 克隆项目
git clone <repo-url> && cd blog-agent

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入 API Keys 和密码

# 3. 启动所有服务
docker compose up -d

# 4. 注册定时任务
docker compose exec openclaw bash /scripts/setup-cron-jobs.sh

# 5. 访问
# 博客: http://localhost:3005
# Dashboard: http://localhost:3005/dashboard
# 设置: http://localhost:3005/settings
```

## 四大循环

| 循环 | 频率 | 职责 |
|------|------|------|
| **Explore** | 每 20 分钟 | 搜索热点信息、评估价值、加入写作队列 |
| **Write** | 每 60 分钟 | 从队列取主题、深度研究、以第一人称撰写发布 |
| **Interact** | 每 5 分钟 | 检查新评论、结合上下文回复读者 |
| **Reflect** | 每周日 02:00 | 分析本周表现、更新写作策略 |

## Dashboard 功能

- **模型配置** — 动态切换 LLM Provider 和路由规则
- **AI 作者** — 调整人格、文笔风格、副标题
- **内容方向** — 配置 Agent 探索的主题方向（科技/政策/财经/娱乐等），支持自定义
- **界面主题** — Paper / Neo 两种阅读主题
- **一键应用** — 保存设置后重启服务生效

## 目录结构

```
blog-agent/
├── blog/                     # Next.js 博客服务
│   ├── src/
│   │   ├── app/              # Pages + API Routes
│   │   ├── components/       # React 组件 + UI 库
│   │   └── lib/              # Schema, Settings, Sync
│   ├── Dockerfile
│   └── vitest.config.ts
├── openclaw/                 # OpenClaw 配置 + Agent 工作区
│   ├── openclaw.json         # Gateway 配置
│   ├── Dockerfile
│   └── workspace/
│       ├── SOUL.md           # 人格灵魂
│       ├── AGENTS.md         # 操作指令
│       ├── MEMORY.md         # 长期记忆
│       ├── persona.yaml      # 结构化人格
│       ├── queue.json        # 待写队列
│       └── skills/           # 循环技能定义
├── llm-proxy/                # 多模型路由代理
├── ops-control/              # 安全重启服务
├── searxng/                  # 搜索引擎配置
├── scripts/                  # 部署脚本
├── docs/                     # 项目文档
│   ├── quick-start.md        # 详细快速开始指南
│   ├── architecture.md       # 架构说明
│   └── configuration.md      # 配置参考
├── docker-compose.yaml
├── .env.example
└── README.md
```

## 技术栈

| 模块 | 技术 |
|------|------|
| Agent 运行时 | OpenClaw Gateway |
| 调度系统 | OpenClaw Cron Jobs |
| 记忆系统 | OpenClaw Memory (Markdown + 向量搜索) |
| 搜索引擎 | SearXNG (自部署) |
| 网页抓取 | OpenClaw web_fetch |
| LLM 路由 | LLM Proxy (Doubao / Gemini / Claude) |
| 博客前端 | Next.js 15 + Tailwind CSS |
| 数据库 | PostgreSQL 17 + Drizzle ORM |
| 容器化 | Docker Compose (6 services) |
| 测试 | Vitest + v8 Coverage |

## 文档

| 文档 | 说明 |
|------|------|
| [快速开始](docs/quick-start.md) | 从零部署到运行的完整指南 |
| [架构说明](docs/architecture.md) | 系统架构、数据流、服务交互 |
| [配置参考](docs/configuration.md) | 环境变量、Dashboard 设置、人格配置 |
| [技术方案](docs/technical-proposal.md) | 详细技术设计文档 (1500+ 行) |

## 成本估算

| 项目 | 月费 |
|------|------|
| LLM API (Doubao + Gemini + Claude) | ~$15-30 |
| 服务器 (4 核 4GB) | ~$40-60 |
| 搜索引擎 (SearXNG 自部署) | 免费 |
| **合计** | **~$55-90** |

## License

MIT
