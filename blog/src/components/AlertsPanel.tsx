"use client";

import { useCallback, useState } from "react";
import { useSSE } from "@/lib/useSSE";

interface AlertItem {
  id: number;
  severity: string;
  category: string;
  message: string;
  acknowledged: boolean;
  createdAt: string | Date;
}

interface Props {
  initialAlerts: AlertItem[];
}

const severityStyles: Record<string, { border: string; bg: string; icon: string }> = {
  critical: { border: "border-red-500/50", bg: "bg-red-500/10", icon: "🔴" },
  error: { border: "border-orange-500/50", bg: "bg-orange-500/10", icon: "🟠" },
  warning: { border: "border-yellow-500/50", bg: "bg-yellow-500/10", icon: "🟡" },
  info: { border: "border-blue-500/50", bg: "bg-blue-500/10", icon: "🔵" },
};

export function AlertsPanel({ initialAlerts }: Props) {
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);

  const handleAlert = useCallback(
    (data: Record<string, unknown>) => {
      setAlerts((prev) => [
        {
          id: data.id as number,
          severity: data.severity as string,
          category: data.category as string,
          message: data.message as string,
          acknowledged: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    },
    []
  );

  useSSE([{ event: "alert", handler: handleAlert }]);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">
        告警
        {alerts.length > 0 && (
          <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
            ({alerts.length} 条未解决)
          </span>
        )}
      </h2>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {alerts.map((alert) => {
          const style = severityStyles[alert.severity] || severityStyles.info;
          return (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${style.border} ${style.bg}`}
            >
              <span className="text-sm mt-0.5">{style.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 uppercase font-medium">
                    {alert.category}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {new Date(alert.createdAt).toLocaleString("zh-CN")}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-main)] mt-0.5">
                  {alert.message}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
