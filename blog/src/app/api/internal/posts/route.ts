import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { posts, alerts } from "@/lib/schema";
import { verifyInternalToken, unauthorizedResponse } from "@/lib/auth";
import { sseManager } from "@/lib/sse";
import { desc, sql } from "drizzle-orm";
import slugify from "slugify";
import { checkContentSafety } from "@/lib/contentSafety";

export async function POST(request: NextRequest) {
  if (!verifyInternalToken(request)) return unauthorizedResponse();

  const body = await request.json();
  const { title, content, summary, tags, mood, feelReport } = body;

  if (!title || !content) {
    return Response.json(
      { error: "title and content are required" },
      { status: 400 }
    );
  }

  const safetyResult = checkContentSafety(title, content);

  if (safetyResult.blocked) {
    await db.insert(alerts).values({
      severity: "critical",
      category: "content",
      message: `Post blocked: ${safetyResult.blockedReason} — Title: "${title.slice(0, 80)}"`,
    });

    return Response.json(
      {
        error: "content_blocked",
        reason: safetyResult.blockedReason,
      },
      { status: 422 }
    );
  }

  if (safetyResult.warnings.length > 0) {
    await db.insert(alerts).values({
      severity: "warning",
      category: "content",
      message: `Post published with warnings: ${safetyResult.warnings.join("; ")} — Title: "${title.slice(0, 80)}"`,
    });
  }

  const baseSlug = slugify(title, { lower: true, strict: true });
  const slug = `${baseSlug}-${Date.now().toString(36)}`;
  const wordCount = content.length;
  const readTime = Math.max(1, Math.ceil(wordCount / 500));

  const [post] = await db
    .insert(posts)
    .values({
      title,
      slug,
      content,
      summary: summary || null,
      tags: tags || [],
      mood: mood || null,
      wordCount,
      readTime,
      status: "published",
      feelReport: feelReport || null,
    })
    .returning();

  sseManager.broadcast("new_post", {
    id: post.id,
    title: post.title,
    slug: post.slug,
    mood: post.mood,
  });

  return Response.json(
    {
      id: post.id,
      slug: post.slug,
      safetyWarnings: safetyResult.warnings.length > 0
        ? safetyResult.warnings
        : undefined,
    },
    { status: 201 }
  );
}

export async function GET(request: NextRequest) {
  if (!verifyInternalToken(request)) return unauthorizedResponse();

  const searchParams = request.nextUrl.searchParams;
  const since = searchParams.get("since");

  let results;
  if (since) {
    const days = parseInt(since.replace("d", ""));
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    results = await db
      .select()
      .from(posts)
      .where(sql`${posts.createdAt} >= ${sinceDate.toISOString()}`)
      .orderBy(desc(posts.createdAt));
  } else {
    results = await db
      .select()
      .from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(50);
  }

  return Response.json({ posts: results });
}
