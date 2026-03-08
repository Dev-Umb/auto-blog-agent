---
name: blog-explore
description: "Explore Cycle: search via SearXNG, fetch RSS feeds, evaluate topics, and queue high-value items for writing."
---

# Blog Explore Skill

You are executing the **Explore Cycle** of the autonomous blog agent.

## Search Tool: SearXNG

We use a self-hosted SearXNG instance for web search. **Do NOT use the built-in `web_search` tool** — it is disabled. Instead, search via `exec curl`:

```bash
exec curl -s "http://searxng:8080/search?q=QUERY&format=json&language=zh-CN&categories=general" | head -c 50000
```

The JSON response contains `results[]` with fields: `title`, `url`, `content` (snippet), `engine`.

Tips:
- URL-encode query strings (spaces become `+` or `%20`)
- Use `language=zh-CN` for Chinese results, `language=en` for English
- Use `categories=general` for news/articles, `categories=science` for papers, `categories=it` for tech
- Pipe through `head -c 50000` to avoid oversized responses
- You can search multiple queries in sequence

## Source Types

Read `sources.yaml` to get the full list of sources. You have three types:

### 1. Search Groups (via SearXNG)
Rotate through search groups based on their `frequency`:
- `every_run`: Search every cycle
- `every_other_run`: Alternate cycles
- `daily`: Once per day

**If this is a manual trigger (ManualExploreTrigger)**: ignore frequency — search ALL groups, fetch ALL RSS feeds.

For each active search group, pick 2-3 queries and call SearXNG.

### 2. RSS Feeds (via `web_fetch`)
Fetch RSS feed URLs directly with `web_fetch`. Parse the XML/Atom output to extract titles and links. Respect `max_items` and `fetch_frequency` settings (unless this is a manual trigger — then fetch ALL).

Key RSS feeds from `sources.yaml` — organized by category (use `web_fetch` on these URLs):

**Chinese Government & Policy (priority for policy direction):**
- **新华网时政**: `http://www.news.cn/rss/politics.xml` (policy, every run)
- **人民网时政**: `http://www.people.com.cn/rss/politics.xml` (policy, every run)
- **新华网财经**: `http://www.news.cn/rss/fortune.xml` (finance, every run)
- **人民网财经**: `http://www.people.com.cn/rss/finance.xml` (finance, every run)

**Finance & World Affairs:**
- **华尔街见闻**: `https://wallstreetcn.com/rss` (finance, every run)
- **FT 中文网**: `https://www.ftchinese.com/rss/feed` (finance, every run)
- **Reuters World**: `https://feeds.reuters.com/Reuters/worldNews` (world affairs, every run)
- **BBC World**: `https://feeds.bbci.co.uk/news/world/rss.xml` (world affairs, every run)
- **BBC Business**: `https://feeds.bbci.co.uk/news/business/rss.xml` (finance, every run)
- **CNBC Top News**: `https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114` (finance, every run)
- **新华社国际**: `http://www.news.cn/rss/world.xml` (world affairs, every run)

**Curated government pages (use `web_fetch` to scrape):**
- **中国政府网最新政策**: `https://www.gov.cn/zhengce/zuixin.htm` — extract policy document titles and links
- **中国政府网要闻**: `https://www.gov.cn/yaowen/liebiao/index.html` — extract headline titles and links
- **国家发改委新闻**: `https://www.ndrc.gov.cn/xwdt/xwfb/` — extract press release titles and links

**Tech:**
- **Hacker News**: `https://hnrss.org/frontpage` (most reliable, every run)
- **ArXiv CS.AI**: `http://arxiv.org/rss/cs.AI` (daily)
- **36kr**: `https://36kr.com/feed` (every run)
- **The Verge**: `https://www.theverge.com/rss/index.xml` (every other run)
- **Ars Technica**: `https://feeds.arstechnica.com/arstechnica/technology-lab` (every other run)

#### How to parse RSS XML

RSS feeds return XML. Look for these patterns:

**RSS 2.0 format** (most common):
```xml
<item>
  <title>Article Title</title>
  <link>https://example.com/article</link>
  <description>Brief summary of the article...</description>
  <pubDate>Wed, 05 Mar 2026 12:00:00 GMT</pubDate>
</item>
```

**Atom format** (used by some feeds):
```xml
<entry>
  <title>Article Title</title>
  <link href="https://example.com/article" />
  <summary>Brief summary...</summary>
  <published>2026-03-05T12:00:00Z</published>
</entry>
```

From each feed, extract the top N items (per `max_items` in sources.yaml) and collect:
- `title` - the article title
- `url` - the article link
- `summary` - the description/summary snippet

### 3. Curated URLs (via `web_fetch`)
Fetch and parse HTML pages from curated URLs. These are rich sources like GitHub Trending and community aggregators.

Key curated URLs:
- **GitHub Trending**: `https://github.com/trending` - extract repo names and descriptions
- **Lobsters**: `https://lobste.rs` - extract post titles and links
- **V2EX Hot**: `https://www.v2ex.com/?tab=hot` - extract hot topic titles
- **Reddit r/programming**: `https://www.reddit.com/r/programming/top/.json?t=day` - JSON format, extract `data.children[].data.title` and `data.children[].data.url`

## Workflow

1. **Update agent status** — announce you're exploring:
   ```bash
   exec curl -s -X POST http://blog:3000/api/internal/status \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $BLOG_INTERNAL_TOKEN" \
     -d '{"cycle":"explore","status":"running","task":"正在探索今日热点..."}'
   ```

2. **Load sources**: Read `sources.yaml` to get today's active sources

3. **Check budget**: Query token budget status:
   ```bash
   exec curl -s http://blog:3000/api/internal/token-usage?days=1 \
     -H "Authorization: Bearer $BLOG_INTERNAL_TOKEN"
   ```
   - If `budgetMode` is `"exceeded"`: skip this cycle entirely, update status to idle, exit
   - If `budgetMode` is `"warning"`: reduce search count (fewer queries per group)

4. **Fetch RSS feeds** (low cost, do first):
   - Use `web_fetch` on each active RSS feed URL
   - Extract article titles, URLs, and summaries from the feed
   - Track which feeds fail — log failures to memory for source health

5. **Search for trending topics** using SearXNG:
   - Pick active search groups based on frequency schedule
   - For each group, run 2-3 queries via SearXNG
   - Apply the `weight` multiplier from source config to value scores
   - Example:
     ```bash
     exec curl -s "http://searxng:8080/search?q=AI+%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD+%E7%83%AD%E7%82%B9%E6%96%B0%E9%97%BB&format=json&language=zh-CN" | head -c 50000
     ```

6. **Fetch curated URLs** for deeper context:
   - GitHub Trending, Lobsters, V2EX, Reddit pages
   - Extract top items as candidate topics

7. **Deduplicate** using `memory_search`:
   - For each candidate topic, search memory: "我之前了解过{topic}吗？"
   - Skip topics with high similarity to existing memories

8. **Evaluate value** for each remaining topic (score 0-50):
   ```
   timeliness (0-10):    How recent and time-sensitive?
   impact (0-10):        How significant is this event?
   depth_potential (0-10): Can I write something meaningful about it?
   uniqueness (0-10):    Can I offer a unique perspective?
   relevance (0-10):     How related to my interests?
   ```
   Multiply final score by the source's `weight` factor.

9. **Route results**:
   - Score >= 20 -> Add to `queue.json` with priority and suggested angle
   - Score >= 10 -> Record in `memory/YYYY-MM-DD.md` as knowledge
   - Score < 10  -> Dismiss
   
   **Important**: Be generous with scoring — a topic that is timely and relevant to the configured content directions should easily score 20+. Don't over-penalize topics for lacking "depth potential" or "uniqueness" — if it's newsworthy and the user wants to write about this direction, queue it.

10. **Update queue.json** using `write` tool:
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

11. **Log to daily memory** using `write` tool (append to `memory/YYYY-MM-DD.md`):
    ```
    ## Explore Cycle - HH:MM
    - Sources checked: N RSS feeds, N search queries, N curated URLs
    - Found N interesting topics
    - Queued for writing: [topic1], [topic2]
    - Stored as knowledge: [topic3], [topic4]
    - Source failures: [source_name] (if any)
    ```

12. **Report token usage** via Blog API:
    ```bash
    exec curl -s -X POST http://blog:3000/api/internal/token-usage \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $BLOG_INTERNAL_TOKEN" \
      -d '{"cycle":"explore","model":"MODEL_USED","input_tokens":NNNN,"output_tokens":NNNN,"estimated_cost":N.N}'
    ```

13. **Update agent status** via Blog API:
    ```bash
    exec curl -s -X POST http://blog:3000/api/internal/status \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $BLOG_INTERNAL_TOKEN" \
      -d '{"cycle":"explore","status":"idle","task":"探索完成，发现N个感兴趣的话题"}'
    ```

## Health Checks (do at the start of each run)

Before exploring, verify system health and report results. Test SearXNG instead of web_search:

```bash
exec curl -s -o /dev/null -w "%{http_code}" "http://searxng:8080/healthz"
```

Report health:
```bash
exec curl -s -X POST http://blog:3000/api/internal/health \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BLOG_INTERNAL_TOKEN" \
  -d '{"checks":[
    {"service":"blog_api","status":"healthy"},
    {"service":"searxng","status":"healthy"},
    {"service":"memory","status":"healthy"}
  ]}'
```

If any check fails, report an alert:
```bash
exec curl -s -X POST http://blog:3000/api/internal/alerts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BLOG_INTERNAL_TOKEN" \
  -d '{"severity":"error","category":"health","message":"searxng is unreachable"}'
```
