import { db } from "@/lib/db";
import { posts, comments } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { CommentSection } from "@/components/CommentSection";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;

  const [post] = await db.select().from(posts).where(eq(posts.slug, slug));

  if (!post) notFound();

  const postComments = await db
    .select()
    .from(comments)
    .where(eq(comments.postId, post.id))
    .orderBy(sql`${comments.createdAt} ASC`);

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
        <div className="flex items-center gap-3 mb-4 text-sm text-slate-500">
          <time>{date}</time>
          {post.readTime && <span>{post.readTime} 分钟阅读</span>}
          {post.wordCount && <span>{post.wordCount} 字</span>}
          {post.mood && (
            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-xs">
              心情：{post.mood}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">{post.title}</h1>
        {post.summary && (
          <p className="text-lg text-slate-400 italic">{post.summary}</p>
        )}
        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-2 mt-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      <div
        className="prose prose-invert prose-slate max-w-none prose-headings:text-white prose-p:text-slate-300 prose-a:text-purple-400 prose-strong:text-white prose-code:text-pink-400 prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800 prose-blockquote:border-purple-500 prose-blockquote:text-slate-400"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      <hr className="my-12 border-slate-800" />

      <CommentSection postId={post.id} comments={postComments} />
    </article>
  );
}
