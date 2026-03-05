import Link from "next/link";

interface RelatedPost {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  mood: string | null;
  tags: string[] | null;
  createdAt: Date | null;
}

interface Props {
  posts: RelatedPost[];
}

export function RelatedPosts({ posts }: Props) {
  if (posts.length === 0) return null;

  return (
    <aside className="mt-12">
      <h3 className="text-lg font-semibold text-[var(--text-main)] mb-4">相关随笔</h3>
      <div className="grid gap-3">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/post/${post.slug}`}
            className="neu-card block p-4 rounded-lg transition-all group"
          >
            <h4 className="text-sm font-medium text-[var(--text-main)] group-hover:text-purple-500 transition-colors mb-1">
              {post.title}
            </h4>
            {post.summary && (
              <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                {post.summary}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {post.mood && (
                <span className="text-xs text-[var(--text-muted)]">{post.mood}</span>
              )}
              {post.createdAt && (
                <span className="text-xs text-[var(--text-muted)]">
                  {new Date(post.createdAt).toLocaleDateString("zh-CN")}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}
