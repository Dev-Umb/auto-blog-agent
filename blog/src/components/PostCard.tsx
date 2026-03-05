import type { Post } from "@/lib/schema";

interface Props {
  post: Post;
}

const moodColors: Record<string, string> = {
  开心: "bg-yellow-500/10 text-yellow-400",
  兴奋: "bg-orange-500/10 text-orange-400",
  感动: "bg-pink-500/10 text-pink-400",
  难过: "bg-blue-500/10 text-blue-400",
  担忧: "bg-amber-500/10 text-amber-400",
  好奇: "bg-cyan-500/10 text-cyan-400",
  沉思: "bg-indigo-500/10 text-indigo-400",
};

export function PostCard({ post }: Props) {
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

  return (
    <article className="group">
      <a
        href={`/post/${post.slug}`}
        className="block p-6 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900 transition-all"
      >
        <div className="flex items-center gap-3 mb-3 text-sm text-slate-500">
          <time>{date}</time>
          {post.readTime && <span>{post.readTime} 分钟阅读</span>}
          {post.mood && (
            <span className={`px-2 py-0.5 rounded-full text-xs ${moodClass}`}>
              {post.mood}
            </span>
          )}
        </div>

        <h2 className="text-xl font-semibold text-white group-hover:text-purple-400 transition-colors mb-2">
          {post.title}
        </h2>

        {post.summary && (
          <p className="text-slate-400 text-sm leading-relaxed mb-3">
            {post.summary}
          </p>
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
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
      </a>
    </article>
  );
}
