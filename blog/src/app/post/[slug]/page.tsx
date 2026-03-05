import { db } from "@/lib/db";
import { posts, comments } from "@/lib/schema";
import { eq, sql, ne, and, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { CommentSection } from "@/components/CommentSection";
import { RelatedPosts } from "@/components/RelatedPosts";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;

  const [post] = await db.select().from(posts).where(eq(posts.slug, slug));

  if (!post) notFound();

  const [postComments, relatedPosts] = await Promise.all([
    db
      .select()
      .from(comments)
      .where(eq(comments.postId, post.id))
      .orderBy(sql`${comments.createdAt} ASC`),

    findRelatedPosts(post.id, post.tags),
  ]);

  const contentWithoutH1 = post.content.replace(/^#\s+.+\n*/m, "");
  const htmlContent = await marked(contentWithoutH1);

  const date = post.createdAt
    ? new Date(post.createdAt).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <article>
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-4 text-sm text-[var(--text-muted)]">
          <time>{date}</time>
          {post.readTime && <span>{post.readTime} 分钟阅读</span>}
          {post.wordCount && <span>{post.wordCount} 字</span>}
          {post.mood && (
            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 text-xs">
              心情：{post.mood}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold text-[var(--text-main)] mb-4">{post.title}</h1>
        {post.summary && (
          <p className="text-lg text-[var(--text-muted)] italic">{post.summary}</p>
        )}
        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-2 mt-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 rounded bg-[var(--surface-soft)] text-[var(--text-muted)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      <div
        className="prose max-w-none rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 prose-headings:text-[var(--text-main)] prose-p:text-[var(--text-main)] prose-a:text-purple-500 prose-code:text-pink-500 prose-pre:bg-[var(--surface-soft)] prose-pre:border prose-pre:border-[var(--border-subtle)] prose-blockquote:border-purple-500 prose-blockquote:text-[var(--text-muted)]"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      <RelatedPosts posts={relatedPosts} />

      <hr className="my-12 border-[var(--border-subtle)]" />

      <CommentSection postId={post.id} comments={postComments} />
    </article>
  );
}

async function findRelatedPosts(
  currentPostId: number,
  tags: string[] | null
) {
  if (!tags || tags.length === 0) {
    return db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        summary: posts.summary,
        mood: posts.mood,
        tags: posts.tags,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .where(
        and(
          ne(posts.id, currentPostId),
          sql`${posts.status} = 'published'`
        )
      )
      .orderBy(desc(posts.createdAt))
      .limit(3);
  }

  return db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      summary: posts.summary,
      mood: posts.mood,
      tags: posts.tags,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(
      and(
        ne(posts.id, currentPostId),
        sql`${posts.status} = 'published' AND ${posts.tags} && ARRAY[${sql.join(tags.map(t => sql`${t}`), sql`, `)}]::text[]`
      )
    )
    .orderBy(desc(posts.createdAt))
    .limit(3);
}
