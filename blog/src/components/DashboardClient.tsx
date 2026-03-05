"use client";

import type { AgentStatus } from "@/lib/schema";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSSE } from "@/lib/useSSE";
import {
  getNextCronRun,
  formatRelativeTime,
  formatTime,
  formatDateTime,
} from "@/lib/cronUtils";

interface Props {
  statuses: AgentStatus[];
  cronSchedules: Record<string, string>;
  timezone: string;
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

export function DashboardClient({
  statuses: initial,
  cronSchedules,
  timezone,
}: Props) {
  const [statuses, setStatuses] = useState(initial);
  const [, setTick] = useState(0);

  const handleStatus = useCallback((data: Record<string, unknown>) => {
    setStatuses((prev) => {
      const idx = prev.findIndex((s) => s.cycleName === data.cycle);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          status: data.status as string,
          currentTask: data.task as string,
          updatedAt: new Date(),
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: Date.now(),
          cycleName: data.cycle as string,
          status: data.status as string,
          currentTask: data.task as string,
          details: null,
          updatedAt: new Date(),
        },
      ];
    });
  }, []);

  useSSE([{ event: "agent_status", handler: handleStatus }]);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const nextRuns = useMemo(() => {
    const map: Record<string, Date> = {};
    for (const [cycle, cron] of Object.entries(cronSchedules)) {
      map[cycle] = getNextCronRun(cron, timezone);
    }
    return map;
  }, [cronSchedules, timezone]);

  const allCycles = ["explore", "write", "interact", "reflect"];

  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-4">循环状态</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allCycles.map((cycle) => {
          const status = statuses.find((s) => s.cycleName === cycle);
          const badge =
            statusBadge[status?.status || "idle"] || statusBadge.idle;
          const nextRun = nextRuns[cycle];
          const cronParts = cronSchedules[cycle]?.split(" ") || [];
          const isWeekly = cronParts[4] !== undefined && cronParts[4] !== "*";

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
              {nextRun && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <svg
                    className="w-3.5 h-3.5 text-slate-600"
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
                  <span>
                    下次：
                    <span className="text-purple-400 font-medium">
                      {isWeekly
                        ? formatDateTime(nextRun, timezone)
                        : formatTime(nextRun, timezone)}
                    </span>
                    <span className="text-slate-600 ml-1">
                      ({formatRelativeTime(nextRun)})
                    </span>
                  </span>
                </div>
              )}
              {status?.updatedAt && (
                <p className="text-xs text-slate-600 mt-1">
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
