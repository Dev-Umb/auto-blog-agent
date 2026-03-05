"use client";

import type { Comment } from "@/lib/schema";
import { useState, useCallback } from "react";
import { useSSE } from "@/lib/useSSE";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  postId: number;
  comments: Comment[];
}

export function CommentSection({
  postId,
  comments: initialComments,
}: Props) {
  const [allComments, setComments] = useState(initialComments);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCommentEvent = useCallback(
    (data: Record<string, unknown>) => {
      if (data.postId === postId) {
        refreshComments();
      }
    },
    [postId]
  );

  useSSE([
    { event: "new_comment", handler: handleCommentEvent },
    { event: "agent_reply", handler: handleCommentEvent },
  ]);

  async function refreshComments() {
    const res = await fetch(`/api/posts/${postId}`);
    const data = await res.json();
    if (data.comments) setComments(data.comments);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;

    setSubmitting(true);
    try {
      await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: name, content }),
      });
      setContent("");
      await refreshComments();
    } finally {
      setSubmitting(false);
    }
  }

  const topLevel = allComments.filter((c) => !c.parentId);

  function getReplies(commentId: number) {
    return allComments.filter((c) => c.parentId === commentId);
  }

  return (
    <section>
      <h2 className="text-xl font-semibold text-[var(--text-main)] mb-6">
        聊聊天 ({allComments.length})
      </h2>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="mb-3">
          <Input
            type="text"
            placeholder="你的名字"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <Textarea
            placeholder="说点什么..."
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="resize-none"
          />
        </div>
        <Button
          type="submit"
          disabled={submitting || !name.trim() || !content.trim()}
          variant="primary"
        >
          {submitting ? "发送中..." : "发送"}
        </Button>
      </form>

      <div className="space-y-4">
        {topLevel.map((comment) => (
          <div key={comment.id}>
            <CommentItem comment={comment} />
            {getReplies(comment.id).map((reply) => (
              <div key={reply.id} className="ml-8 mt-2">
                <CommentItem comment={reply} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const date = comment.createdAt
    ? new Date(comment.createdAt).toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div
      className={`p-4 rounded-lg ${
        comment.isAgent
          ? "bg-purple-500/5 border border-purple-500/20"
          : "neu-card"
      }`}
    >
      <div className="flex items-center gap-2 mb-2 text-sm">
        {comment.isAgent && (
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold">
            赛
          </div>
        )}
        <span
          className={
            comment.isAgent
              ? "font-medium text-purple-400"
              : "font-medium text-[var(--text-main)]"
          }
        >
          {comment.authorName}
        </span>
        {comment.isAgent && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
            博主
          </span>
        )}
        <span className="text-[var(--text-muted)]">{date}</span>
      </div>
      <p className="text-[var(--text-main)] text-sm leading-relaxed whitespace-pre-wrap">
        {comment.content}
      </p>
    </div>
  );
}
