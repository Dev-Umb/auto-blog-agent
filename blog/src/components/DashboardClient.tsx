"use client";

import type { AgentStatus } from "@/lib/schema";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type WriteStage =
  | "idle"
  | "triggering"
  | "triggered"
  | "reading_queue"
  | "selected_topic"
  | "researching"
  | "writing"
  | "publishing"
  | "done"
  | "empty_queue"
  | "error";

const WRITE_STAGE_ORDER: WriteStage[] = [
  "triggering",
  "triggered",
  "reading_queue",
  "selected_topic",
  "researching",
  "writing",
  "publishing",
  "done",
];

const WRITE_STAGE_LABELS: Record<WriteStage, string> = {
  idle: "",
  triggering: "发送指令",
  triggered: "等待响应",
  reading_queue: "读取队列",
  selected_topic: "选定主题",
  researching: "深度研究",
  writing: "撰写文章",
  publishing: "发布文章",
  done: "完成",
  empty_queue: "队列为空",
  error: "出错",
};

function inferStageFromTask(task: string): WriteStage | null {
  const t = task.toLowerCase();
  if (t.includes("队列") && (t.includes("读取") || t.includes("检查"))) return "reading_queue";
  if (t.includes("已选题") || t.includes("选定")) return "selected_topic";
  if (t.includes("研究") || t.includes("搜索") || t.includes("资料")) return "researching";
  if (t.includes("撰写") || t.includes("写作") || t.includes("写一篇")) return "writing";
  if (t.includes("发布") || t.includes("发送文章")) return "publishing";
  if (t.includes("完成") || t.includes("已发布")) return "done";
  if (t.includes("队列为空") || t.includes("无可写") || t.includes("跳过")) return "empty_queue";
  return null;
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

  const [writeStage, setWriteStage] = useState<WriteStage>("idle");
  const [writeMessage, setWriteMessage] = useState("");
  const [triggering, setTriggering] = useState(false);
  const autoResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgressRef = useRef(0);

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

    if (data.cycle === "write") {
      const task = (data.task as string) || "";
      const status = data.status as string;
      lastProgressRef.current = Date.now();
      setWriteMessage(task);

      if (status === "idle" || status === "error") {
        const inferred = inferStageFromTask(task);
        setWriteStage(inferred === "empty_queue" ? "empty_queue" : inferred === "done" ? "done" : status === "error" ? "error" : "done");
        if (autoResetTimer.current) clearTimeout(autoResetTimer.current);
        autoResetTimer.current = setTimeout(() => {
          setWriteStage("idle");
          setWriteMessage("");
        }, 15000);
      } else if (status === "running") {
        const inferred = inferStageFromTask(task);
        if (inferred) setWriteStage(inferred);
        else if (writeStage === "triggered" || writeStage === "triggering") {
          setWriteStage("reading_queue");
        }
      }
    }
  }, [writeStage]);

  const handleWriteTriggerEvent = useCallback((data: Record<string, unknown>) => {
    const stage = data.stage as string;
    const msg = (data.message as string) || "";
    lastProgressRef.current = Date.now();
    setWriteMessage(msg);
    if (stage === "triggering") setWriteStage("triggering");
    else if (stage === "triggered") setWriteStage("triggered");
    else if (stage === "error") {
      setWriteStage("error");
      if (autoResetTimer.current) clearTimeout(autoResetTimer.current);
      autoResetTimer.current = setTimeout(() => {
        setWriteStage("idle");
        setWriteMessage("");
      }, 10000);
    }
  }, []);

  useSSE([
    { event: "agent_status", handler: handleStatus },
    { event: "write_trigger", handler: handleWriteTriggerEvent },
  ]);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const PROGRESS_TIMEOUT_MS = 300_000;
  const POLL_INTERVAL_MS = 5_000;
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const writeStartRef = useRef<string | null>(null);

  useEffect(() => {
    if (progressTimer.current) clearTimeout(progressTimer.current);
    if (pollTimer.current) clearInterval(pollTimer.current);

    const isNonTerminal =
      writeStage !== "idle" &&
      writeStage !== "done" &&
      writeStage !== "empty_queue" &&
      writeStage !== "error";

    if (isNonTerminal) {
      lastProgressRef.current = Date.now();

      pollTimer.current = setInterval(async () => {
        try {
          const res = await fetch("/api/agent/status", { cache: "no-store" });
          if (!res.ok) return;
          const data = await res.json();
          const ws = (data.statuses ?? []).find(
            (s: { cycleName: string }) => s.cycleName === "write"
          );
          if (!ws) return;

          const updatedAt = ws.updatedAt ? new Date(ws.updatedAt).toISOString() : null;

          if (!writeStartRef.current) {
            writeStartRef.current = updatedAt;
          }

          const isNewUpdate = updatedAt && updatedAt > (writeStartRef.current ?? "");
          if (!isNewUpdate && ws.status !== "running") return;

          const task = ws.currentTask || "";
          const status = ws.status as string;

          lastProgressRef.current = Date.now();

          if (status === "idle" || status === "error") {
            const inferred = inferStageFromTask(task);
            setWriteStage(
              inferred === "empty_queue" ? "empty_queue"
                : inferred === "done" ? "done"
                  : status === "error" ? "error" : "done"
            );
            setWriteMessage(task);
            if (autoResetTimer.current) clearTimeout(autoResetTimer.current);
            autoResetTimer.current = setTimeout(() => {
              setWriteStage("idle");
              setWriteMessage("");
            }, 15000);
          } else if (status === "running") {
            const inferred = inferStageFromTask(task);
            if (inferred) {
              setWriteStage(inferred);
              setWriteMessage(task);
            }
          }
        } catch {
          // polling error, ignore
        }
      }, POLL_INTERVAL_MS);

      const checkTimeout = () => {
        const elapsed = Date.now() - lastProgressRef.current;
        if (elapsed >= PROGRESS_TIMEOUT_MS) {
          setWriteStage("error");
          setWriteMessage(
            "写作超时：超过 5 分钟未收到 Agent 进度更新，请检查设置是否已「保存并应用」、Agent 服务是否正常运行"
          );
          if (autoResetTimer.current) clearTimeout(autoResetTimer.current);
          autoResetTimer.current = setTimeout(() => {
            setWriteStage("idle");
            setWriteMessage("");
          }, 15000);
        } else {
          progressTimer.current = setTimeout(
            checkTimeout,
            PROGRESS_TIMEOUT_MS - elapsed + 1000
          );
        }
      };

      progressTimer.current = setTimeout(checkTimeout, PROGRESS_TIMEOUT_MS);
    }

    return () => {
      if (progressTimer.current) clearTimeout(progressTimer.current);
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [writeStage]);

  useEffect(() => {
    return () => {
      if (autoResetTimer.current) clearTimeout(autoResetTimer.current);
      if (progressTimer.current) clearTimeout(progressTimer.current);
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  async function handleTriggerWrite() {
    if (triggering || (writeStage !== "idle" && writeStage !== "done" && writeStage !== "empty_queue" && writeStage !== "error")) return;
    setTriggering(true);
    setWriteStage("triggering");
    setWriteMessage("正在发送写作指令…");
    lastProgressRef.current = Date.now();
    writeStartRef.current = new Date().toISOString();
    try {
      const res = await fetch("/api/dashboard/trigger-write", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setWriteStage("error");
        setWriteMessage(data.message || "触发失败");
      } else {
        setWriteStage("triggered");
        setWriteMessage(data.message || "写作指令已发送，等待 Agent 开始执行…");
      }
    } catch (err) {
      setWriteStage("error");
      setWriteMessage(err instanceof Error ? err.message : "网络错误");
    } finally {
      setTriggering(false);
    }
  }

  const writeProgress = useMemo(() => {
    const idx = WRITE_STAGE_ORDER.indexOf(writeStage);
    if (idx < 0) return 0;
    return Math.round(((idx + 1) / WRITE_STAGE_ORDER.length) * 100);
  }, [writeStage]);

  const isWriteActive = writeStage !== "idle";
  const isWriteTerminal = writeStage === "done" || writeStage === "empty_queue" || writeStage === "error";

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
      <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">循环状态</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Manual Write Trigger Card */}
        <div className="neu-card p-4 rounded-xl md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="font-medium text-[var(--text-main)]">手动触发写作</span>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                立即从队列取主题并撰写一篇文章
              </p>
            </div>
            <button
              type="button"
              onClick={handleTriggerWrite}
              disabled={triggering || (isWriteActive && !isWriteTerminal)}
              className={[
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                triggering || (isWriteActive && !isWriteTerminal)
                  ? "bg-[var(--border-subtle)] text-[var(--text-muted)] cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 shadow-sm hover:shadow-md",
              ].join(" ")}
            >
              {triggering ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              )}
              {isWriteActive && !isWriteTerminal ? "写作进行中…" : "开始写作"}
            </button>
          </div>

          {isWriteActive && (
            <div className="space-y-2 animate-fade-in">
              {/* Progress bar */}
              <div className="relative h-2 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                <div
                  className={[
                    "absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out",
                    writeStage === "error"
                      ? "bg-red-500"
                      : writeStage === "done"
                        ? "bg-emerald-500"
                        : writeStage === "empty_queue"
                          ? "bg-amber-500"
                          : "bg-gradient-to-r from-purple-500 to-pink-500",
                  ].join(" ")}
                  style={{ width: `${writeStage === "empty_queue" ? 100 : writeProgress}%` }}
                />
                {!isWriteTerminal && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                )}
              </div>

              {/* Stage indicators */}
              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                {WRITE_STAGE_ORDER.filter((s) => s !== "triggered").map((stage) => {
                  const currentIdx = WRITE_STAGE_ORDER.indexOf(writeStage);
                  const stageIdx = WRITE_STAGE_ORDER.indexOf(stage);
                  const isActive = stage === writeStage;
                  const isPast = currentIdx > stageIdx;
                  return (
                    <span
                      key={stage}
                      className={[
                        "transition-colors",
                        isActive ? "text-purple-400 font-medium" : isPast ? "text-[var(--text-main)]" : "",
                      ].join(" ")}
                    >
                      {isPast ? "✓" : isActive ? "●" : "○"} {WRITE_STAGE_LABELS[stage]}
                    </span>
                  );
                })}
              </div>

              {/* Status message */}
              <p className={[
                "text-xs",
                writeStage === "error" ? "text-red-400" : writeStage === "empty_queue" ? "text-amber-400" : writeStage === "done" ? "text-emerald-400" : "text-[var(--text-muted)]",
              ].join(" ")}>
                {writeMessage}
              </p>
            </div>
          )}
        </div>

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
              className="neu-card p-4 rounded-xl"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-[var(--text-main)]">
                  {cycleLabels[cycle] || cycle}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <span
                    className={`w-2 h-2 rounded-full ${badge.color} ${
                      status?.status === "running" ? "animate-pulse" : ""
                    }`}
                  />
                  {badge.label}
                </span>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                {status?.currentTask || "等待下一次触发"}
              </p>
              {nextRun && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <svg
                    className="w-3.5 h-3.5 text-[var(--text-muted)]"
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
                    <span className="text-[var(--text-muted)] ml-1">
                      ({formatRelativeTime(nextRun)})
                    </span>
                  </span>
                </div>
              )}
              {status?.updatedAt && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
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
