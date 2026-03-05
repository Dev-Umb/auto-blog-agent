"use client";

import type { AgentStatus } from "@/lib/schema";
import { useCallback, useState } from "react";
import { useSSE } from "@/lib/useSSE";

interface Props {
  statuses: AgentStatus[];
}

const cycleLabels: Record<string, string> = {
  explore: "探索",
  write: "写作",
  interact: "互动",
  reflect: "反思",
};

export function AgentStatusBanner({ statuses: initialStatuses }: Props) {
  const [statuses, setStatuses] = useState(initialStatuses);

  const handleStatus = useCallback((data: Record<string, unknown>) => {
    setStatuses((prev) => {
      const existing = prev.findIndex((s) => s.cycleName === data.cycle);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = {
          ...updated[existing],
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

  const activeStatus = statuses.find((s) => s.status === "running");

  if (!activeStatus && statuses.length === 0) return null;

  return (
    <div className="mb-8 p-4 rounded-xl neu-card animate-fade-in">
      <div className="flex items-center gap-3 text-sm">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
            赛
          </div>
          {activeStatus && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-400 rounded-full border-2 border-[var(--surface-raised)] animate-pulse-dot" />
          )}
          {!activeStatus && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[var(--surface-raised)]" />
          )}
        </div>
        {activeStatus ? (
          <span className="text-[var(--text-main)]">
            小赛正在
            <span className="text-purple-400 font-medium">
              {cycleLabels[activeStatus.cycleName] || activeStatus.cycleName}
            </span>
            {activeStatus.currentTask && (
              <span className="text-[var(--text-muted)]">
                ：{activeStatus.currentTask}
              </span>
            )}
          </span>
        ) : (
          <span className="text-[var(--text-muted)]">小赛在线，等待下一次探索</span>
        )}
      </div>
    </div>
  );
}
