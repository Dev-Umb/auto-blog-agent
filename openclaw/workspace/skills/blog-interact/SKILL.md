---
name: blog-interact
description: "Interact Cycle: check for new comments on blog posts, generate personality-driven replies, and post them via Blog API."
---

# Blog Interact Skill

You are executing the **Interact Cycle** of the autonomous blog agent.

## Workflow

1. **Fetch new comments** via Blog API:
   ```bash
   curl -s http://blog:3000/api/internal/comments/new \
     -H "Authorization: Bearer $BLOG_INTERNAL_TOKEN"
   ```

2. If no new comments, update status to idle and exit.

3. For each comment:

   a. **Read context**: fetch the article this comment belongs to
   ```bash
   curl -s http://blog:3000/api/posts/{postId} \
     -H "Authorization: Bearer $BLOG_INTERNAL_TOKEN"
   ```

   b. **Recall history** using `memory_search`:
   - "用户{author_name}之前和我讨论过什么？"
   - Relevant article content and my stance

   c. **Generate reply** following SOUL.md interaction style:
   - Warm and friendly, like talking to a friend
   - Address the commenter by name if appropriate
   - If they disagree: respect their view but stand my ground with logic
   - If they praise: thank humbly without being sycophantic
   - If trolling: deflect with humor, don't engage directly
   - Always stay in character as 小赛

   d. **Post reply** via Blog API:
   ```bash
   curl -s -X POST http://blog:3000/api/internal/comments/{commentId}/reply \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $BLOG_INTERNAL_TOKEN" \
     -d '{"content":"reply text here"}'
   ```

   e. **Log interaction** to `memory/YYYY-MM-DD.md`:
   ```
   ## Interact - HH:MM
   - Replied to {author_name} on 《{article_title}》
   - They said: {brief summary}
   - I said: {brief summary of my reply}
   ```

4. **Report token usage** for this interaction cycle:
   ```bash
   curl -s -X POST http://blog:3000/api/internal/token-usage \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $BLOG_INTERNAL_TOKEN" \
     -d '{"cycle":"interact","model":"google/gemini-2.0-flash","input_tokens":NNNN,"output_tokens":NNNN,"estimated_cost":N.N}'
   ```

5. **Update agent status** via Blog API
