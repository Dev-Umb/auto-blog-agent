"use client";

import type { AgentStatus } from "@/lib/schema";
import { useEffect, useState } from "react";

interface Props {
  statuses: AgentStatus[];
}

const cycleLabels: Record<string, string> = {
  explore: "探索",
  write: "写作",
  interact: "互动",
  reflect: "反思",
};

const statusIcons: Record<string, string> = {
  running: "🔵",
  idle: "🟢",
  error: "🔴",
};

export function AgentStatusBanner({ statuses: initialStatuses }: Props) {
  const [statuses, setStatuses] = useState(initialStatuses);

  useEffect(() => {
    const eventSource = new EventSource("/api/events");

    eventSource.addEventListener("agent_status", (event) => {
      const data = JSON.parse(event.data);
      setStatuses((prev) => {
        const existing = prev.findIndex((s) => s.cycleName === data.cycle);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = {
            ...updated[existing],
            status: data.status,
            currentTask: data.task,
            updatedAt: new Date(),
          };
          return updated;
        }
        return [
          ...prev,
          {
            id: Date.now(),
            cycleName: data.cycle,
            status: data.status,
            currentTask: data.task,
            details: null,
            updatedAt: new Date(),
          },
        ];
      });
    });

    return () => eventSource.close();
  }, []);

  const activeStatus = statuses.find((s) => s.status === "running");

  if (!activeStatus && statuses.length === 0) return null;

  return (
    <div className="mb-8 p-4 rounded-xl border border-slate-800 bg-slate-900/50">
      <div className="flex items-center gap-2 text-sm">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
          赛
        </div>
        {activeStatus ? (
          <span className="text-slate-300">
            {statusIcons[activeStatus.status] || "⚪"}{" "}
            小赛正在
            {cycleLabels[activeStatus.cycleName] || activeStatus.cycleName}
            {activeStatus.currentTask && `：${activeStatus.currentTask}`}
          </span>
        ) : (
          <span className="text-slate-500">🟢 小赛在线，等待下一次探索</span>
        )}
      </div>
    </div>
  );
}
