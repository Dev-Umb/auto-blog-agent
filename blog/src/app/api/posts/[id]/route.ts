import { db } from "@/lib/db";
import { posts, comments } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const isSlug = isNaN(Number(id));
  const condition = isSlug
    ? eq(posts.slug, id)
    : eq(posts.id, Number(id));

  const [post] = await db.select().from(posts).where(condition);

  if (!post) {
    return Response.json({ error: "Post not found" }, { status: 404 });
  }

  const postComments = await db
    .select()
    .from(comments)
    .where(eq(comments.postId, post.id))
    .orderBy(sql`${comments.createdAt} ASC`);

  return Response.json({ post, comments: postComments });
}
