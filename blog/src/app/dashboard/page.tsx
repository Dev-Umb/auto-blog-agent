import { db } from "@/lib/db";
import { agentStatus, posts, comments, tokenUsage, systemHealth, alerts } from "@/lib/schema";
import { sql, desc, gte } from "drizzle-orm";
import { DashboardClient } from "@/components/DashboardClient";
import { ActivityTimeline, type ActivityItem } from "@/components/ActivityTimeline";
import { TokenBudgetPanel } from "@/components/TokenBudgetPanel";
import { HealthPanel } from "@/components/HealthPanel";
import { AlertsPanel } from "@/components/AlertsPanel";
import { WritingQueuePanel } from "@/components/WritingQueuePanel";
import { readFile } from "fs/promises";

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
    recentUserComments,
    recentAgentReplies,
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
    db
      .select({
        id: comments.id,
        authorName: comments.authorName,
        content: comments.content,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .where(sql`${comments.isAgent} = false`)
      .orderBy(desc(comments.createdAt))
      .limit(20),
    db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .where(sql`${comments.isAgent} = true AND ${comments.parentId} IS NOT NULL`)
      .orderBy(desc(comments.createdAt))
      .limit(20),
  ]);

  const queuePath =
    process.env.QUEUE_PATH || "/root/.openclaw/workspace/queue.json";
  let queueItems: Array<{
    topic: string;
    source_url?: string;
    source_name?: string;
    source_type?: string;
    summary?: string;
    score: number;
    suggested_angle?: string;
    discovered_at?: string;
    status: string;
  }> = [];
  try {
    const raw = await readFile(queuePath, "utf-8");
    const rawItems = JSON.parse(raw) as Array<Record<string, unknown>>;
    queueItems = rawItems.map((item) => ({
      topic: (item.topic || item.title || "") as string,
      source_url: (item.source_url || item.url || "") as string,
      source_name: (item.source_name || item.source || "") as string,
      source_type: (item.source_type || "") as string,
      summary: (item.summary || "") as string,
      score: (item.score || 0) as number,
      suggested_angle: (item.suggested_angle || "") as string,
      discovered_at: (item.discovered_at || "") as string,
      status: (item.status || "pending") as string,
    }));
  } catch {
    // queue.json not found or invalid — treat as empty
  }

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

  const initialActivities: ActivityItem[] = [
    ...statuses.map((s) => ({
      id: `status-${s.cycleName}`,
      type: "agent_status" as const,
      data: {
        cycle: s.cycleName,
        status: s.status,
        task: s.currentTask || "状态更新",
      },
      timestamp: s.updatedAt?.toISOString() || new Date().toISOString(),
    })),
    ...recentPosts.map((p) => ({
      id: `post-${p.id}`,
      type: "new_post" as const,
      data: {
        title: p.title,
        slug: p.id,
      },
      timestamp: p.createdAt?.toISOString() || new Date().toISOString(),
    })),
    ...recentUserComments.map((c) => ({
      id: `comment-${c.id}`,
      type: "new_comment" as const,
      data: {
        author: c.authorName,
        preview: c.content?.slice(0, 80) || "",
      },
      timestamp: c.createdAt?.toISOString() || new Date().toISOString(),
    })),
    ...recentAgentReplies.map((r) => ({
      id: `reply-${r.id}`,
      type: "agent_reply" as const,
      data: {
        preview: r.content?.slice(0, 80) || "",
      },
      timestamp: r.createdAt?.toISOString() || new Date().toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-main)] mb-8">Agent Dashboard</h1>

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

      <DashboardClient
        statuses={statuses}
        cronSchedules={{
          explore: "*/20 * * * *",
          write: "15 * * * *",
          interact: "*/5 * * * *",
          reflect: "0 2 * * 0",
        }}
        timezone="Asia/Shanghai"
      />

      <div className="mt-8">
        <WritingQueuePanel
          initialQueue={queueItems}
          writeCron="15 * * * *"
          timezone="Asia/Shanghai"
        />
      </div>

      <ActivityTimeline initialActivities={initialActivities} />

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">最近文章</h2>
        <div className="space-y-2">
          {recentPosts.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">还没有文章</p>
          ) : (
            recentPosts.map((p) => (
              <div
                key={p.id}
                className="neu-card flex items-center justify-between p-3 rounded-lg"
              >
                <div>
                  <span className="text-[var(--text-main)] text-sm">{p.title}</span>
                  {p.mood && (
                    <span className="ml-2 text-xs text-[var(--text-muted)]">
                      ({p.mood})
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
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
    <div className="neu-card p-4 rounded-xl">
      <div className="text-2xl font-bold text-[var(--text-main)]">{value}</div>
      <div className="text-xs text-[var(--text-muted)] mt-1">{label}</div>
    </div>
  );
}
