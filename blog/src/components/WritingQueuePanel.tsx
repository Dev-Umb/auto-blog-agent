"use client";

import { useState, useEffect, useMemo } from "react";
import {
  getNextCronRun,
  formatRelativeTime,
  formatTime,
} from "@/lib/cronUtils";

interface QueueItem {
  topic: string;
  source_url?: string;
  source_name?: string;
  source_type?: string;
  summary?: string;
  score: number;
  suggested_angle?: string;
  discovered_at?: string;
  status: string;
}

interface Props {
  initialQueue: QueueItem[];
  writeCron: string;
  timezone: string;
}

function scoreColor(score: number): string {
  if (score >= 40) return "text-green-400";
  if (score >= 30) return "text-yellow-400";
  return "text-slate-500";
}

export function WritingQueuePanel({
  initialQueue,
  writeCron,
  timezone,
}: Props) {
  const [queueItems, setQueueItems] = useState<QueueItem[]>(initialQueue);
  const [relativeTime, setRelativeTime] = useState("");
  const [clearing, setClearing] = useState(false);
  const [exploring, setExploring] = useState(false);
  const [exploreHint, setExploreHint] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const nextRun = useMemo(
    () => getNextCronRun(writeCron, timezone),
    [writeCron, timezone]
  );

  useEffect(() => {
    setRelativeTime(formatRelativeTime(nextRun));
    const timer = setInterval(() => {
      setRelativeTime(formatRelativeTime(nextRun));
    }, 30000);
    return () => clearInterval(timer);
  }, [nextRun]);

  const pendingItems = queueItems
    .filter((item) => item.status === "pending")
    .sort((a, b) => b.score - a.score);

  const doneCount = queueItems.filter(
    (item) => item.status === "done"
  ).length;

  async function refreshQueue() {
    const res = await fetch("/api/dashboard/queue", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "刷新队列失败");
    }
    const nextQueue = Array.isArray(data.queue) ? (data.queue as QueueItem[]) : [];
    setQueueItems(nextQueue);
    return nextQueue;
  }

  async function handleClearQueue() {
    const confirmed = window.confirm("确认清空写作队列吗？此操作会移除当前所有待写主题。");
    if (!confirmed) return;

    setClearing(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/dashboard/queue", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "清空失败");
      }
      setQueueItems([]);
      setMessage(data.message || "写作队列已清空");
    } catch (err) {
      setError(err instanceof Error ? err.message : "清空失败");
    } finally {
      setClearing(false);
    }
  }

  async function handleTriggerExplore() {
    setExploring(true);
    setExploreHint("正在向 Agent 发送探索指令…");
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/dashboard/trigger-explore", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "触发探索失败");
      }
      setExploreHint("探索循环已触发，正在等待发现新主题…");

      for (let attempt = 0; attempt < 6; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const nextQueue = await refreshQueue();
        const hasPending = nextQueue.some((item) => item.status === "pending");
        if (hasPending) {
          setMessage("探索完成，已发现新的待写主题");
          setExploreHint("");
          setExploring(false);
          return;
        }
        setExploreHint(`探索循环进行中，正在等待结果…（${(attempt + 1) * 3}s）`);
      }

      setMessage(data.message || "探索循环已触发，请稍候刷新查看结果");
    } catch (err) {
      setError(err instanceof Error ? err.message : "触发探索失败");
    } finally {
      setExploreHint("");
      setExploring(false);
    }
  }

  return (
    <section className="neu-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--text-main)]">写作队列</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span>{pendingItems.length} 待写</span>
            <span>·</span>
            <span>{doneCount} 已完成</span>
          </div>
          <button
            type="button"
            onClick={handleClearQueue}
            disabled={clearing || queueItems.length === 0}
            className="rounded-md border border-[var(--border-subtle)] px-2.5 py-1 text-xs text-[var(--text-main)] transition hover:border-red-500/40 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {clearing ? "清空中..." : "清空队列"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5 p-3 rounded-lg bg-[var(--surface-soft)] border border-[var(--border-subtle)]">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-500/20">
          <svg
            className="w-4 h-4 text-purple-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm text-[var(--text-main)]">
            下次写作：
            <span className="text-purple-400 font-medium ml-1">
              {formatTime(nextRun, timezone)}
            </span>
          </p>
          <p className="text-xs text-[var(--text-muted)]">{relativeTime}</p>
        </div>
      </div>

      {pendingItems.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            队列为空，等待探索循环发现新主题
          </p>
          {exploring ? (
            <div className="mt-4 rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 text-left">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-purple-200">探索循环进行中</p>
                <span className="text-xs text-purple-300">请稍候</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-2/3 rounded-full bg-purple-400 animate-pulse" />
              </div>
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                {exploreHint || "正在等待 Agent 返回探索结果…"}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleTriggerExplore}
              disabled={exploring}
              className="mt-3 rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              手动触发一次探索循环
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {pendingItems.map((item, idx) => (
            <div
              key={`${item.topic}-${idx}`}
              className={`p-3 rounded-lg border ${
                idx === 0
                  ? "bg-purple-500/10 border-purple-500/30"
                  : "bg-[var(--surface-soft)] border-[var(--border-subtle)]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {idx === 0 && (
                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-300 font-medium">
                        NEXT
                      </span>
                    )}
                    <span className="text-sm text-[var(--text-main)] font-medium truncate">
                      {item.topic}
                    </span>
                  </div>
                  {item.summary && (
                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-1.5">
                      {item.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                    {item.source_name && <span>{item.source_name}</span>}
                    {item.discovered_at && (
                      <>
                        <span>·</span>
                        <span>
                          {new Date(item.discovered_at).toLocaleString(
                            "zh-CN",
                            {
                              month: "numeric",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  className={`shrink-0 text-sm font-bold tabular-nums ${scoreColor(
                    item.score
                  )}`}
                >
                  {item.score}
                </span>
              </div>
              {item.suggested_angle && (
                <p className="text-xs text-[var(--text-muted)] mt-2 pt-2 border-t border-[var(--border-subtle)] italic">
                  {item.suggested_angle}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {(message || error) && (
        <div
          className={`mt-4 rounded-lg border px-3 py-2 text-xs ${
            error
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {error || message}
        </div>
      )}
    </section>
  );
}
