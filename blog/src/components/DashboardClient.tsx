"use client";

import type { AgentStatus } from "@/lib/schema";
import { useEffect, useState } from "react";

interface Props {
  statuses: AgentStatus[];
}

const cycleLabels: Record<string, string> = {
  explore: "探索循环",
  write: "写作循环",
  interact: "互动循环",
  reflect: "反思循环",
};

const statusBadge: Record<string, { color: string; label: string }> = {
  running: { color: "bg-blue-500", label: "运行中" },
  idle: { color: "bg-green-500", label: "空闲" },
  error: { color: "bg-red-500", label: "异常" },
};

export function DashboardClient({ statuses: initial }: Props) {
  const [statuses, setStatuses] = useState(initial);

  useEffect(() => {
    const eventSource = new EventSource("/api/events");

    eventSource.addEventListener("agent_status", (event) => {
      const data = JSON.parse(event.data);
      setStatuses((prev) => {
        const idx = prev.findIndex((s) => s.cycleName === data.cycle);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
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

  const allCycles = ["explore", "write", "interact", "reflect"];

  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-4">循环状态</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allCycles.map((cycle) => {
          const status = statuses.find((s) => s.cycleName === cycle);
          const badge = statusBadge[status?.status || "idle"] || statusBadge.idle;

          return (
            <div
              key={cycle}
              className="p-4 rounded-xl border border-slate-800 bg-slate-900/50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white">
                  {cycleLabels[cycle] || cycle}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span
                    className={`w-2 h-2 rounded-full ${badge.color} ${
                      status?.status === "running" ? "animate-pulse" : ""
                    }`}
                  />
                  {badge.label}
                </span>
              </div>
              <p className="text-sm text-slate-500">
                {status?.currentTask || "等待下一次触发"}
              </p>
              {status?.updatedAt && (
                <p className="text-xs text-slate-600 mt-2">
                  最后更新：
                  {new Date(status.updatedAt).toLocaleString("zh-CN")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
