---
name: blog-explore
description: "Explore Cycle: search the web, fetch RSS feeds, evaluate topics, and queue high-value items for writing."
---

# Blog Explore Skill

You are executing the **Explore Cycle** of the autonomous blog agent.

## Source Types

Read `sources.yaml` to get the full list of sources. You have three types:

### 1. Search Groups (via `web_search`)
Rotate through search groups based on their `frequency`:
- `every_run`: Search every cycle
- `every_other_run`: Alternate cycles
- `daily`: Once per day

### 2. RSS Feeds (via `web_fetch`)
Fetch RSS feed URLs directly with `web_fetch`. Parse the XML/Atom output to extract titles and links. Respect `max_items` and `fetch_frequency` settings.

### 3. Curated URLs (via `web_fetch`)
Fetch and parse HTML pages from curated URLs. These are rich sources like GitHub Trending and community aggregators.

## Workflow

1. **Load sources**: Read `sources.yaml` to get today's active sources
2. **Check budget**: Read `token-budget.yaml` — if budget mode is `warning`, reduce search count; if `exceeded`, skip this cycle entirely

3. **Fetch RSS feeds** (low cost, do first):
   - Use `web_fetch` on each active RSS feed URL
   - Extract article titles, URLs, and summaries from the feed
   - Track which feeds fail — log failures to memory for source health

4. **Search for trending topics** using `web_search`:
   - Pick active search groups based on frequency schedule
   - Apply the `weight` multiplier from source config to value scores

5. **Fetch curated URLs** for deeper context:
   - GitHub Trending, Lobsters, V2EX, Reddit pages
   - Extract top items as candidate topics

6. **Deduplicate** using `memory_search`:
   - For each candidate topic, search memory: "我之前了解过{topic}吗？"
   - Skip topics with high similarity to existing memories

7. **Evaluate value** for each remaining topic (score 0-50):
   ```
   timeliness (0-10):    How recent and time-sensitive?
   impact (0-10):        How significant is this event?
   depth_potential (0-10): Can I write something meaningful about it?
   uniqueness (0-10):    Can I offer a unique perspective?
   relevance (0-10):     How related to my interests?
   ```
   Multiply final score by the source's `weight` factor.

8. **Route results**:
   - Score >= 30 → Add to `queue.json` with priority and suggested angle
   - Score >= 15 → Record in `memory/YYYY-MM-DD.md` as knowledge
   - Score < 15  → Dismiss

9. **Update queue.json** using `write` tool:
   ```json
   {
     "topic": "topic title",
     "source_url": "https://...",
     "source_name": "Hacker News RSS",
     "source_type": "rss",
     "summary": "brief summary",
     "score": 38,
     "suggested_angle": "my unique angle on this",
     "discovered_at": "ISO timestamp",
     "status": "pending"
   }
   ```

10. **Log to daily memory** using `write` tool (append to `memory/YYYY-MM-DD.md`):
    ```
    ## Explore Cycle - HH:MM
    - Sources checked: N RSS feeds, N search groups, N curated URLs
    - Found N interesting topics
    - Queued for writing: [topic1], [topic2]
    - Stored as knowledge: [topic3], [topic4]
    - Source failures: [source_name] (if any)
    ```

11. **Report token usage** via Blog API:
    ```bash
    curl -s -X POST http://blog:3000/api/internal/token-usage \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $BLOG_INTERNAL_TOKEN" \
      -d '{"cycle":"explore","model":"google/gemini-2.0-flash","input_tokens":NNNN,"output_tokens":NNNN,"estimated_cost":N.N}'
    ```

12. **Update agent status** via Blog API:
    ```bash
    curl -s -X POST http://blog:3000/api/internal/status \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $BLOG_INTERNAL_TOKEN" \
      -d '{"cycle":"explore","status":"idle","task":"探索完成，发现N个感兴趣的话题"}'
    ```

## Health Checks (do at the start of each run)

Before exploring, verify system health and report results:

```bash
curl -s -X POST http://blog:3000/api/internal/health \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BLOG_INTERNAL_TOKEN" \
  -d '{"checks":[
    {"service":"blog_api","status":"healthy","response_time_ms":120},
    {"service":"web_search","status":"healthy"},
    {"service":"memory","status":"healthy"}
  ]}'
```

If any check fails, report an alert:
```bash
curl -s -X POST http://blog:3000/api/internal/alerts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BLOG_INTERNAL_TOKEN" \
  -d '{"severity":"error","category":"health","message":"web_search is unreachable"}'
```
