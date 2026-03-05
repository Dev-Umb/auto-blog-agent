"use client";

import { useCallback, useState } from "react";
import { useSSE } from "@/lib/useSSE";

interface HealthCheck {
  service: string;
  status: string;
  responseTimeMs?: number | null;
  errorMessage?: string | null;
  checkedAt?: string | null;
}

interface Props {
  initialChecks: HealthCheck[];
}

const statusStyles: Record<string, { dot: string; label: string }> = {
  healthy: { dot: "bg-green-500", label: "正常" },
  unhealthy: { dot: "bg-red-500", label: "异常" },
  degraded: { dot: "bg-yellow-500", label: "降级" },
};

const serviceLabels: Record<string, string> = {
  blog_api: "Blog API",
  web_search: "搜索服务",
  memory_read: "记忆读取",
  memory_write: "记忆写入",
  database: "数据库",
};

export function HealthPanel({ initialChecks }: Props) {
  const [checks, setChecks] = useState<HealthCheck[]>(initialChecks);

  const handleHealth = useCallback(
    (data: Record<string, unknown>) => {
      if (Array.isArray(data.checks)) {
        setChecks(
          (data.checks as Array<{ service: string; status: string }>).map(
            (c) => ({ ...c, checkedAt: data.checkedAt as string })
          )
        );
      }
    },
    []
  );

  useSSE([{ event: "health_check", handler: handleHealth }]);

  const allHealthy = checks.length > 0 && checks.every((c) => c.status === "healthy");

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-white mb-4">系统健康</h2>
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-2 mb-4">
          <span
            className={`w-3 h-3 rounded-full ${
              checks.length === 0
                ? "bg-slate-500"
                : allHealthy
                ? "bg-green-500"
                : "bg-red-500 animate-pulse"
            }`}
          />
          <span className="text-sm text-white font-medium">
            {checks.length === 0
              ? "等待健康检查..."
              : allHealthy
              ? "所有服务正常"
              : "部分服务异常"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {checks.map((check) => {
            const style = statusStyles[check.status] || statusStyles.unhealthy;
            return (
              <div
                key={check.service}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50"
              >
                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                <span className="text-xs text-slate-300 flex-1">
                  {serviceLabels[check.service] || check.service}
                </span>
                {check.responseTimeMs != null && (
                  <span className="text-[10px] text-slate-500">
                    {check.responseTimeMs}ms
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {checks.length > 0 && checks[0].checkedAt && (
          <p className="text-[10px] text-slate-600 mt-3">
            最后检查：{new Date(checks[0].checkedAt).toLocaleString("zh-CN")}
          </p>
        )}
      </div>
    </section>
  );
}
