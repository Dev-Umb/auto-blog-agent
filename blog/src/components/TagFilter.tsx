"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Props {
  allTags: string[];
}

export function TagFilter({ allTags }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTag = searchParams.get("tag");

  if (allTags.length === 0) return null;

  const handleTagClick = (tag: string) => {
    if (activeTag === tag) {
      router.push("/");
    } else {
      router.push(`/?tag=${encodeURIComponent(tag)}`);
    }
  };

  return (
    <div className="flex gap-2 flex-wrap mb-6">
      <button
        onClick={() => router.push("/")}
        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
          !activeTag
            ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
            : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
        }`}
      >
        全部
      </button>
      {allTags.map((tag) => (
        <button
          key={tag}
          onClick={() => handleTagClick(tag)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
            activeTag === tag
              ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
              : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
          }`}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
