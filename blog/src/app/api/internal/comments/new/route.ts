import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { comments, posts } from "@/lib/schema";
import { verifyInternalToken, unauthorizedResponse } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  if (!verifyInternalToken(request)) return unauthorizedResponse();

  const unreplied = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      postTitle: posts.title,
      postSlug: posts.slug,
      authorName: comments.authorName,
      content: comments.content,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .innerJoin(posts, eq(comments.postId, posts.id))
    .where(
      and(
        eq(comments.isAgent, false),
        eq(comments.isReplied, false)
      )
    )
    .orderBy(sql`${comments.createdAt} ASC`);

  return Response.json({ comments: unreplied });
}
