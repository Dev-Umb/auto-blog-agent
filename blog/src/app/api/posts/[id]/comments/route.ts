import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { comments, posts } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { sseManager } from "@/lib/sse";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const postId = Number(id);

  const [post] = await db.select().from(posts).where(eq(posts.id, postId));
  if (!post) {
    return Response.json({ error: "Post not found" }, { status: 404 });
  }

  const body = await request.json();
  const { authorName, authorEmail, content } = body;

  if (!authorName || !content) {
    return Response.json(
      { error: "authorName and content are required" },
      { status: 400 }
    );
  }

  const [comment] = await db
    .insert(comments)
    .values({
      postId,
      authorName,
      authorEmail: authorEmail || null,
      content,
      isAgent: false,
      isReplied: false,
    })
    .returning();

  sseManager.broadcast("new_comment", {
    postId,
    commentId: comment.id,
    author: authorName,
    preview: content.slice(0, 100),
  });

  // Notify OpenClaw agent via webhook (non-blocking)
  const hookUrl = process.env.OPENCLAW_HOOK_URL;
  const hookToken = process.env.OPENCLAW_HOOK_TOKEN;
  if (hookUrl && hookToken) {
    fetch(hookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${hookToken}`,
      },
      body: JSON.stringify({
        message: `新评论需要回复: postId=${postId}, commentId=${comment.id}, author=${authorName}, content=${content.slice(0, 200)}`,
        name: "BlogComment",
      }),
    }).catch(() => {});
  }

  return Response.json({ comment }, { status: 201 });
}
