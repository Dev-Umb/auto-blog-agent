import Link from "next/link";
import type { Post } from "@/lib/schema";

interface Props {
  post: Post;
  index?: number;
}

const moodColors: Record<string, string> = {
  开心: "bg-yellow-500/10 text-yellow-400",
  兴奋: "bg-orange-500/10 text-orange-400",
  感动: "bg-pink-500/10 text-pink-400",
  难过: "bg-blue-500/10 text-blue-400",
  担忧: "bg-amber-500/10 text-amber-400",
  好奇: "bg-cyan-500/10 text-cyan-400",
  沉思: "bg-indigo-500/10 text-indigo-400",
  期待: "bg-green-500/10 text-green-400",
  愤怒: "bg-red-500/10 text-red-400",
  困惑: "bg-violet-500/10 text-violet-400",
};

export function PostCard({ post, index = 0 }: Props) {
  const moodClass = post.mood
    ? moodColors[post.mood] || "bg-slate-500/10 text-slate-400"
    : "";

  const date = post.createdAt
    ? new Date(post.createdAt).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const staggerClass = index < 6 ? `stagger-${index + 1}` : "";

  return (
    <article className={`group animate-fade-in ${staggerClass}`}>
      <Link
        href={`/post/${post.slug}`}
        className="neu-card block p-6 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
      >
        <div className="flex items-center gap-3 mb-3 text-sm text-[var(--text-muted)] flex-wrap">
          <time>{date}</time>
          {post.readTime && (
            <span className="hidden sm:inline">{post.readTime} 分钟阅读</span>
          )}
          {post.mood && (
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${moodClass}`}
            >
              {post.mood}
            </span>
          )}
        </div>

        <h2 className="text-xl font-semibold text-[var(--text-main)] group-hover:text-purple-500 transition-colors duration-200 mb-2 leading-snug">
          {post.title}
        </h2>

        {post.summary && (
          <p className="text-[var(--text-muted)] text-sm leading-relaxed mb-3 line-clamp-2">
            {post.summary}
          </p>
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 rounded bg-[var(--surface-soft)] text-[var(--text-muted)] transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </Link>
    </article>
  );
}
