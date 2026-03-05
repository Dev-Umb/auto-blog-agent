import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { comments, alerts } from "@/lib/schema";
import { verifyInternalToken, unauthorizedResponse } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { sseManager } from "@/lib/sse";
import { checkContentSafety } from "@/lib/contentSafety";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyInternalToken(request)) return unauthorizedResponse();

  const { id } = await params;
  const commentId = Number(id);

  const [parentComment] = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId));

  if (!parentComment) {
    return Response.json({ error: "Comment not found" }, { status: 404 });
  }

  const body = await request.json();
  const { content } = body;

  if (!content) {
    return Response.json(
      { error: "content is required" },
      { status: 400 }
    );
  }

  const safetyResult = checkContentSafety("reply", content);

  if (safetyResult.blocked) {
    await db.insert(alerts).values({
      severity: "critical",
      category: "content",
      message: `Reply blocked: ${safetyResult.blockedReason} — to comment #${commentId}`,
    });

    return Response.json(
      { error: "content_blocked", reason: safetyResult.blockedReason },
      { status: 422 }
    );
  }

  const [reply] = await db
    .insert(comments)
    .values({
      postId: parentComment.postId,
      parentId: commentId,
      authorName: "小赛",
      content,
      isAgent: true,
      isReplied: false,
    })
    .returning();

  await db
    .update(comments)
    .set({ isReplied: true })
    .where(eq(comments.id, commentId));

  sseManager.broadcast("agent_reply", {
    postId: parentComment.postId,
    commentId: reply.id,
    parentCommentId: commentId,
    preview: content.slice(0, 100),
  });

  return Response.json({ reply }, { status: 201 });
}
