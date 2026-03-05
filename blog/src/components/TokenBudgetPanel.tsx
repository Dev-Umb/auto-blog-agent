"use client";

import { useCallback, useState } from "react";
import { useSSE } from "@/lib/useSSE";

interface BudgetInfo {
  dailyLimitCents: number;
  todayCostCents: number;
  todayTokens: number;
  usagePercent: number;
  budgetMode: "normal" | "warning" | "exceeded";
}

interface DailySummary {
  date: string;
  totalCost: number;
  totalTokens: number;
  totalRuns: number;
}

interface Props {
  initialBudget: BudgetInfo;
  initialDaily: DailySummary[];
}

const modeConfig = {
  normal: { color: "text-green-400", bg: "bg-green-500", label: "正常" },
  warning: { color: "text-yellow-400", bg: "bg-yellow-500", label: "节约模式" },
  exceeded: { color: "text-red-400", bg: "bg-red-500", label: "已超支" },
};

export function TokenBudgetPanel({ initialBudget, initialDaily }: Props) {
  const [budget, setBudget] = useState<BudgetInfo>(initialBudget);
  const [daily] = useState<DailySummary[]>(initialDaily);

  const handleTokenUsage = useCallback(
    (data: Record<string, unknown>) => {
      setBudget({
        dailyLimitCents: data.budgetCents as number,
        todayCostCents: data.totalCost as number,
        todayTokens: data.totalTokens as number,
        usagePercent: data.usagePercent as number,
        budgetMode: data.budgetMode as BudgetInfo["budgetMode"],
      });
    },
    []
  );

  useSSE([{ event: "token_usage", handler: handleTokenUsage }]);

  const mode = modeConfig[budget.budgetMode];
  const barPercent = Math.min(budget.usagePercent, 100);

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-white mb-4">Token 预算</h2>

      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${mode.color}`}>
              {mode.label}
            </span>
            <span className="text-xs text-slate-500">
              ${(budget.todayCostCents / 100).toFixed(2)} / $
              {(budget.dailyLimitCents / 100).toFixed(2)}
            </span>
          </div>
          <span className="text-sm text-slate-400">
            {budget.usagePercent.toFixed(1)}%
          </span>
        </div>

        <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              budget.budgetMode === "exceeded"
                ? "bg-red-500"
                : budget.budgetMode === "warning"
                ? "bg-yellow-500"
                : "bg-gradient-to-r from-purple-500 to-pink-500"
            }`}
            style={{ width: `${barPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <div className="text-xs text-slate-500">今日 Token</div>
            <div className="text-sm text-white font-medium">
              {budget.todayTokens.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">今日花费</div>
            <div className="text-sm text-white font-medium">
              ${(budget.todayCostCents / 100).toFixed(4)}
            </div>
          </div>
        </div>

        {daily.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-500 mb-2">近 7 天趋势</div>
            <div className="flex items-end gap-1 h-16">
              {daily.slice(0, 7).reverse().map((d) => {
                const height = Math.max(
                  4,
                  (d.totalCost / budget.dailyLimitCents) * 100
                );
                const isOver = d.totalCost > budget.dailyLimitCents;
                return (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col items-center gap-1"
                    title={`${d.date}: $${(d.totalCost / 100).toFixed(2)} (${d.totalRuns} runs)`}
                  >
                    <div
                      className={`w-full rounded-sm transition-all ${
                        isOver ? "bg-red-500" : "bg-purple-500/70"
                      }`}
                      style={{ height: `${Math.min(height, 100)}%` }}
                    />
                    <span className="text-[10px] text-slate-600">
                      {d.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
