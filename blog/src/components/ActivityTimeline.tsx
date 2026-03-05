"use client";

import { useCallback, useState } from "react";
import { useSSE } from "@/lib/useSSE";

export interface ActivityItem {
  id: string;
  type: "agent_status" | "new_post" | "new_comment" | "agent_reply";
  data: Record<string, unknown>;
  timestamp: string;
}

interface Props {
  initialActivities?: ActivityItem[];
}

const cycleIcons: Record<string, { icon: string; label: string }> = {
  explore: { icon: "🔍", label: "探索循环" },
  write: { icon: "✍️", label: "写作循环" },
  interact: { icon: "💬", label: "互动循环" },
  reflect: { icon: "🔮", label: "反思循环" },
};

const typeLabels: Record<string, { icon: string; label: string }> = {
  agent_status: { icon: "🔵", label: "状态更新" },
  new_post: { icon: "📝", label: "发了新文章" },
  new_comment: { icon: "💬", label: "收到评论" },
  agent_reply: { icon: "🤖", label: "回复了评论" },
};

function getActivityInfo(activity: ActivityItem): { icon: string; label: string } {
  if (activity.type === "agent_status") {
    const cycle = activity.data.cycle as string;
    return cycleIcons[cycle] || typeLabels.agent_status;
  }
  return typeLabels[activity.type] || { icon: "⚪", label: activity.type };
}

export function ActivityTimeline({ initialActivities = [] }: Props) {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);

  const makeHandler = useCallback(
    (type: ActivityItem["type"]) => (data: Record<string, unknown>) => {
      setActivities((prev) =>
        [
          {
            id: `${type}-${Date.now()}`,
            type,
            data,
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 50)
      );
    },
    []
  );

  useSSE([
    { event: "agent_status", handler: makeHandler("agent_status") },
    { event: "new_post", handler: makeHandler("new_post") },
    { event: "new_comment", handler: makeHandler("new_comment") },
    { event: "agent_reply", handler: makeHandler("agent_reply") },
  ]);

  function formatActivity(activity: ActivityItem): string {
    const { type, data } = activity;
    switch (type) {
      case "agent_status": {
        const cycle = data.cycle as string;
        const label = cycleIcons[cycle]?.label || cycle;
        return `${label} — ${data.task || data.status}`;
      }
      case "new_post":
        return `发了新文章：《${data.title}》`;
      case "new_comment":
        return `${data.author} 评论了文章`;
      case "agent_reply":
        return `回复了评论`;
      default:
        return JSON.stringify(data);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">活动日志</h2>

      {activities.length === 0 ? (
        <p className="text-[var(--text-muted)] text-sm p-4 rounded-lg neu-card">
          等待活动...连接到 SSE 事件流中
        </p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {activities.map((activity) => {
            const info = getActivityInfo(activity);
            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg neu-card"
              >
                <span className="text-sm mt-0.5">{info.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">{info.label}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(activity.timestamp).toLocaleTimeString("zh-CN")}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-main)] truncate">
                    {formatActivity(activity)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
