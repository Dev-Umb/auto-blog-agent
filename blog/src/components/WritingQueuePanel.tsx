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
  const [relativeTime, setRelativeTime] = useState("");
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

  const pendingItems = initialQueue
    .filter((item) => item.status === "pending")
    .sort((a, b) => b.score - a.score);

  const doneCount = initialQueue.filter(
    (item) => item.status === "done"
  ).length;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">写作队列</h2>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{pendingItems.length} 待写</span>
          <span>·</span>
          <span>{doneCount} 已完成</span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5 p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
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
          <p className="text-sm text-white">
            下次写作：
            <span className="text-purple-400 font-medium ml-1">
              {formatTime(nextRun, timezone)}
            </span>
          </p>
          <p className="text-xs text-slate-500">{relativeTime}</p>
        </div>
      </div>

      {pendingItems.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">
          队列为空，等待探索循环发现新主题
        </p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {pendingItems.map((item, idx) => (
            <div
              key={`${item.topic}-${idx}`}
              className={`p-3 rounded-lg border ${
                idx === 0
                  ? "bg-purple-500/10 border-purple-500/30"
                  : "bg-slate-800/40 border-slate-700/30"
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
                    <span className="text-sm text-white font-medium truncate">
                      {item.topic}
                    </span>
                  </div>
                  {item.summary && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-1.5">
                      {item.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-[11px] text-slate-600">
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
                <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-700/30 italic">
                  {item.suggested_angle}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
