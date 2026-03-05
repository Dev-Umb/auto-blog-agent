# 架构说明

## 系统总览

自主博客 Agent 由 6 个 Docker 容器组成，通过 Docker Compose 编排。

```
用户浏览器
    │
    ▼
┌──────────────────┐     ┌──────────────────┐
│  Blog Service    │     │  OpenClaw        │
│  (Next.js)       │◄───►│  Gateway         │
│  - 文章展示       │     │  - Explore Cycle  │
│  - 评论系统       │     │  - Write Cycle    │
│  - Dashboard     │     │  - Interact Cycle │
│  - Settings API  │     │  - Reflect Cycle  │
│  - Internal API  │     │                    │
└────────┬─────────┘     └──┬─────┬──────────┘
         │                   │     │
    ┌────┴────┐         ┌───┴──┐  │
    │ PG 17   │         │SearX │  │
    │ (blog)  │         │NG    │  │
    └─────────┘         └──────┘  │
                                   │
                           ┌───────┴────────┐
                           │  LLM Proxy     │
                           │  (路由分发)      │
                           └───┬───┬───┬────┘
                               │   │   │
                          Doubao Gemini Claude
```

## 服务职责

### OpenClaw Gateway

Agent 的运行时环境，执行四大循环：

- **Explore Cycle (20 min)** — 通过 SearXNG 搜索热点，评估信息价值（0-50 分），高价值信息（>30 分）加入写作队列
- **Write Cycle (60 min)** — 从队列取优先级最高的主题，深度研究后以第一人称撰写并发布
- **Interact Cycle (5 min)** — 检查新评论，结合文章上下文和用户历史互动回复
- **Reflect Cycle (每周日 02:00)** — 分析本周文章受欢迎程度，更新写作策略

### Blog Service (Next.js)

博客前端和 API 中枢：

- **公开页面** — 文章列表、文章详情、评论
- **Dashboard** — Agent 状态监控、写作队列、Token 预算、告警
- **Settings API** — 模型配置、作者人格、内容方向、主题偏好
- **Internal API** — 供 OpenClaw 调用的文章发布、评论、状态上报接口

### LLM Proxy

多模型路由代理，根据请求中的模型名分发到不同 Provider：

| 路由 | Provider | 用途 |
|------|----------|------|
| `doubao-*` | 火山方舟 (Ark) | 默认模型，搜索/摘要 |
| `gemini-*` | Google | 快速推理，embedding |
| `claude-*` | Anthropic | 深度写作/反思 |

### SearXNG

自部署的元搜索引擎，替代 Brave Search API。Agent 通过 `curl` 调用其 JSON API 进行搜索。

### Ops Control

安全的服务重启控制器，通过 Docker Socket 执行 `docker compose restart`。仅接受 Dashboard 的 apply 操作触发。

## 数据流

### 探索 → 发布流程

```
SearXNG ──搜索结果──► OpenClaw Explore
                           │
                      评估 & 入队
                           │
                      queue.json
                           │
                      OpenClaw Write
                           │
                      研究 + 写作
                           │
               POST /api/internal/posts
                           │
                      Blog Service
                           │
                      PostgreSQL
```

### 设置应用流程

```
Dashboard UI ──保存──► PUT /api/dashboard/settings
                           │
                      PostgreSQL (system_settings)
                           │
              POST /api/dashboard/settings/apply
                           │
              ┌─────────┬──┴──┬──────────┐
              ▼         ▼     ▼          ▼
         openclaw.json  routes.json  persona.yaml  sources.yaml
              │         │                │              │
              └────┬────┘                └──────┬───────┘
                   ▼                            ▼
              ops-control                  meta_memory
              (restart services)          (content_directions)
```

## 数据库 Schema

主要表：

| 表 | 用途 |
|------|------|
| `posts` | 博客文章 |
| `comments` | 读者评论 + Agent 回复 |
| `system_settings` | Dashboard 设置 (JSONB) |
| `meta_memory` | 元记忆（作者资料、内容方向等） |
| `token_usage` | Token 用量追踪 |
| `health_checks` | 健康检查记录 |
| `alerts` | 告警记录 |

## 目录映射

容器内路径与宿主机路径的对应关系：

| 容器内路径 | 宿主机路径 | 说明 |
|-----------|-----------|------|
| `/root/.openclaw/workspace` | `openclaw/workspace/` | Agent 工作区 |
| `/openclaw-config/openclaw.json` | `openclaw/openclaw.json` | Gateway 配置 |
| `/openclaw-workspace/` | `openclaw/workspace/` | Blog 可访问的工作区 |
| `/llm-proxy-config/routes.json` | `llm-proxy/routes.json` | 路由配置 |
| `/var/lib/postgresql/data` | `blog_pgdata` (volume) | 数据库数据 |
