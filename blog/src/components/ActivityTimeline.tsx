"use client";

import { useEffect, useState } from "react";

interface Activity {
  id: string;
  type: "agent_status" | "new_post" | "new_comment" | "agent_reply";
  data: Record<string, unknown>;
  timestamp: Date;
}

const typeLabels: Record<string, { icon: string; label: string }> = {
  agent_status: { icon: "🔵", label: "状态更新" },
  new_post: { icon: "📝", label: "发了新文章" },
  new_comment: { icon: "💬", label: "收到评论" },
  agent_reply: { icon: "🤖", label: "回复了评论" },
};

export function ActivityTimeline() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const eventSource = new EventSource("/api/events");

    const handler = (type: string) => (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      setActivities((prev) => {
        const newActivity: Activity = {
          id: `${type}-${Date.now()}`,
          type: type as Activity["type"],
          data,
          timestamp: new Date(),
        };
        return [newActivity, ...prev].slice(0, 50);
      });
    };

    eventSource.addEventListener("agent_status", handler("agent_status"));
    eventSource.addEventListener("new_post", handler("new_post"));
    eventSource.addEventListener("new_comment", handler("new_comment"));
    eventSource.addEventListener("agent_reply", handler("agent_reply"));

    return () => eventSource.close();
  }, []);

  function formatActivity(activity: Activity): string {
    const { type, data } = activity;
    switch (type) {
      case "agent_status":
        return `${data.cycle} — ${data.task || data.status}`;
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
      <h2 className="text-lg font-semibold text-white mb-4">活动日志</h2>

      {activities.length === 0 ? (
        <p className="text-slate-500 text-sm p-4 rounded-lg bg-slate-900 border border-slate-800">
          等待活动...连接到 SSE 事件流中
        </p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {activities.map((activity) => {
            const info = typeLabels[activity.type] || {
              icon: "⚪",
              label: activity.type,
            };
            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800"
              >
                <span className="text-sm mt-0.5">{info.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{info.label}</span>
                    <span className="text-xs text-slate-600">
                      {activity.timestamp.toLocaleTimeString("zh-CN")}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 truncate">
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
