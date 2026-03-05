import { db } from "@/lib/db";
import { agentStatus, posts, comments, tokenUsage, systemHealth, alerts } from "@/lib/schema";
import { sql, desc, gte } from "drizzle-orm";
import { DashboardClient } from "@/components/DashboardClient";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { TokenBudgetPanel } from "@/components/TokenBudgetPanel";
import { HealthPanel } from "@/components/HealthPanel";
import { AlertsPanel } from "@/components/AlertsPanel";

export const dynamic = "force-dynamic";

const DAILY_BUDGET_CENTS = Number(process.env.DAILY_TOKEN_BUDGET_CENTS || "200");

export default async function DashboardPage() {
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  const [
    statuses,
    postStats,
    commentStats,
    recentPosts,
    todayTokens,
    dailySummaries,
    latestHealth,
    activeAlerts,
  ] = await Promise.all([
    db.select().from(agentStatus),

    db
      .select({
        totalPosts: sql<number>`count(*)`,
        totalWords: sql<number>`coalesce(sum(${posts.wordCount}), 0)`,
      })
      .from(posts)
      .where(sql`${posts.status} = 'published'`),

    db
      .select({
        totalComments: sql<number>`count(*)`,
        repliedComments: sql<number>`count(*) filter (where ${comments.isReplied} = true)`,
      })
      .from(comments)
      .where(sql`${comments.isAgent} = false`),

    db
      .select({
        id: posts.id,
        title: posts.title,
        mood: posts.mood,
        wordCount: posts.wordCount,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .orderBy(sql`${posts.createdAt} DESC`)
      .limit(10),

    db
      .select({
        totalCost: sql<number>`coalesce(sum(${tokenUsage.estimatedCost}), 0)`,
        totalTokens: sql<number>`coalesce(sum(${tokenUsage.totalTokens}), 0)`,
      })
      .from(tokenUsage)
      .where(sql`${tokenUsage.date} = ${today}`),

    db
      .select({
        date: tokenUsage.date,
        totalCost: sql<number>`sum(${tokenUsage.estimatedCost})`,
        totalTokens: sql<number>`sum(${tokenUsage.totalTokens})`,
        totalRuns: sql<number>`sum(${tokenUsage.runCount})`,
      })
      .from(tokenUsage)
      .where(gte(tokenUsage.date, weekAgoStr))
      .groupBy(tokenUsage.date)
      .orderBy(sql`${tokenUsage.date} DESC`),

    db
      .select({
        service: systemHealth.service,
        status: systemHealth.status,
        responseTimeMs: systemHealth.responseTimeMs,
        errorMessage: systemHealth.errorMessage,
        checkedAt: systemHealth.checkedAt,
      })
      .from(systemHealth)
      .orderBy(desc(systemHealth.checkedAt))
      .limit(50),

    db
      .select()
      .from(alerts)
      .where(sql`${alerts.resolvedAt} IS NULL`)
      .orderBy(desc(alerts.createdAt))
      .limit(20),
  ]);

  const todayCost = Number(todayTokens[0]?.totalCost || 0);
  const todayTotalTokens = Number(todayTokens[0]?.totalTokens || 0);
  const usagePercent = (todayCost / DAILY_BUDGET_CENTS) * 100;
  let budgetMode: "normal" | "warning" | "exceeded" = "normal";
  if (usagePercent > 100) budgetMode = "exceeded";
  else if (usagePercent > 80) budgetMode = "warning";

  const budgetInfo = {
    dailyLimitCents: DAILY_BUDGET_CENTS,
    todayCostCents: todayCost,
    todayTokens: todayTotalTokens,
    usagePercent: Math.round(usagePercent * 10) / 10,
    budgetMode,
  };

  const dailyData = dailySummaries.map((d) => ({
    date: d.date,
    totalCost: Number(d.totalCost),
    totalTokens: Number(d.totalTokens),
    totalRuns: Number(d.totalRuns),
  }));

  const healthChecks = Array.from(
    new Map(latestHealth.map((h) => [h.service, h])).values()
  ).map((h) => ({
    service: h.service,
    status: h.status,
    responseTimeMs: h.responseTimeMs ?? undefined,
    errorMessage: h.errorMessage ?? undefined,
    checkedAt: h.checkedAt?.toISOString(),
  }));

  const alertItems = activeAlerts.map((a) => ({
    id: a.id,
    severity: a.severity,
    category: a.category,
    message: a.message,
    acknowledged: a.acknowledged ?? false,
    createdAt: a.createdAt?.toISOString() || new Date().toISOString(),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Agent Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="已发文章" value={Number(postStats[0].totalPosts)} />
        <StatCard label="总字数" value={Number(postStats[0].totalWords)} />
        <StatCard label="收到评论" value={Number(commentStats[0].totalComments)} />
        <StatCard
          label="回复率"
          value={
            Number(commentStats[0].totalComments) > 0
              ? `${Math.round(
                  (Number(commentStats[0].repliedComments) /
                    Number(commentStats[0].totalComments)) *
                    100
                )}%`
              : "N/A"
          }
        />
      </div>

      <AlertsPanel initialAlerts={alertItems} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <TokenBudgetPanel initialBudget={budgetInfo} initialDaily={dailyData} />
        <HealthPanel initialChecks={healthChecks} />
      </div>

      <DashboardClient statuses={statuses} />

      <ActivityTimeline />

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">最近文章</h2>
        <div className="space-y-2">
          {recentPosts.length === 0 ? (
            <p className="text-slate-500 text-sm">还没有文章</p>
          ) : (
            recentPosts.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800"
              >
                <div>
                  <span className="text-white text-sm">{p.title}</span>
                  {p.mood && (
                    <span className="ml-2 text-xs text-slate-500">
                      ({p.mood})
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {p.wordCount} 字 ·{" "}
                  {p.createdAt
                    ? new Date(p.createdAt).toLocaleDateString("zh-CN")
                    : ""}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}
