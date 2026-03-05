---
name: blog-monitor
description: "Production monitoring: token budget enforcement, health checks, anomaly detection, and alerting."
---

# Blog Monitor Skill — 生产级监控

This skill is used by ALL cycles. Every cycle must call the monitoring APIs to track usage and report health.

## Token Budget Enforcement

### How to Report Token Usage

After every LLM call or batch of calls, report usage to the Blog API:

```bash
curl -s -X POST http://blog:3000/api/internal/token-usage \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BLOG_INTERNAL_TOKEN" \
  -d '{
    "cycle": "explore",
    "model": "google/gemini-2.0-flash",
    "input_tokens": 1500,
    "output_tokens": 800,
    "estimated_cost": 0.05
  }'
```

The API returns the current budget status:
```json
{
  "ok": true,
  "daily": {
    "totalCost": 45.2,
    "totalTokens": 125000,
    "budgetCents": 200,
    "usagePercent": 22.6,
    "budgetMode": "normal"
  }
}
```

### How to Check Current Budget

Before starting any expensive operation:

```bash
curl -s http://blog:3000/api/internal/token-usage?days=1 \
  -H "Authorization: Bearer $BLOG_INTERNAL_TOKEN"
```

### Budget Mode Rules

Read `token-budget.yaml` for the full configuration. Summary:

| Mode | Condition | Explore | Write | Interact | Reflect |
|------|-----------|---------|-------|----------|---------|
| **normal** | <80% budget | Every 20 min, 10 searches | Up to 3 articles/day, score>=30 | Normal | Weekly |
| **warning** | 80-100% budget | Every 40 min, 5 searches | Up to 1 article/day, score>=40 | Normal | Weekly |
| **exceeded** | >100% budget | **Paused** | **Paused** | Normal | Weekly |

### Cost Estimation

Use `token-budget.yaml` model costs to estimate cost before reporting. For quick reference:
- Gemini Flash: ~$0.0001/1K input, ~$0.0004/1K output
- Claude Sonnet: ~$0.003/1K input, ~$0.015/1K output
- Gemini Pro: ~$0.00125/1K input, ~$0.01/1K output

Convert to cents: multiply dollar amount by 100.

## Health Checks

### Report Health (every Explore cycle start)

```bash
curl -s -X POST http://blog:3000/api/internal/health \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BLOG_INTERNAL_TOKEN" \
  -d '{"checks": [
    {"service": "blog_api", "status": "healthy", "response_time_ms": 120},
    {"service": "web_search", "status": "healthy"},
    {"service": "memory_read", "status": "healthy"},
    {"service": "memory_write", "status": "healthy"}
  ]}'
```

Test each service before reporting:
1. **blog_api**: `curl -s http://blog:3000/api/health` — check response
2. **web_search**: Try a simple `web_search "test"` — check it returns results
3. **memory_read**: Try reading a known file — check success
4. **memory_write**: Write and read back a test value

If a service is down, report status as `"unhealthy"` with `"error_message"`.

## Anomaly Detection & Alerting

### When to Send Alerts

```bash
curl -s -X POST http://blog:3000/api/internal/alerts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BLOG_INTERNAL_TOKEN" \
  -d '{"severity": "error", "category": "budget", "message": "Daily token budget exceeded at 105%"}'
```

Severity levels: `info`, `warning`, `error`, `critical`

Categories and triggers:

| Category | Trigger | Severity |
|----------|---------|----------|
| `budget` | Usage > 80% | warning |
| `budget` | Usage > 100% | error |
| `health` | Any service unhealthy | error |
| `health` | Blog API unreachable | critical |
| `content` | Self-check score < 7 for 3 consecutive articles | warning |
| `content` | Queue has > 20 items but no article written in 24h | warning |
| `search` | web_search returns 0 results 3 times in a row | error |
| `memory` | Daily memory file exceeds 500KB | warning |
| `memory` | Memory write fails | critical |

### Weekly Report (Reflect Cycle)

During the weekly reflect cycle, also generate a monitoring summary:

```
## Weekly Monitoring Report
- Total token usage: X tokens ($X.XX)
- Average daily cost: $X.XX
- Budget warnings: N times
- Health incidents: N (list services affected)
- Source reliability: X% of RSS feeds returned data
- Content metrics: N articles, avg self-check score X.X
```

Log this to `memory/YYYY-MM-DD.md` and also update `MEMORY.md` if any strategy changes are needed.
