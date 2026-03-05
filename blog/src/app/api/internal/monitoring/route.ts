import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  tokenUsage,
  systemHealth,
  agentStatus,
  posts,
  comments,
  alerts,
} from "@/lib/schema";
import { verifyInternalToken, unauthorizedResponse } from "@/lib/auth";
import { sql, eq, gte, desc } from "drizzle-orm";

const DAILY_BUDGET_CENTS = Number(process.env.DAILY_TOKEN_BUDGET_CENTS || "200");

export async function GET(request: NextRequest) {
  if (!verifyInternalToken(request)) return unauthorizedResponse();

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  const [
    todayTokens,
    weeklyTokens,
    cycleStatuses,
    recentHealthChecks,
    weekPostStats,
    weekCommentStats,
    activeAlerts,
    dailyBreakdown,
  ] = await Promise.all([
    db
      .select({
        totalCost: sql<number>`coalesce(sum(${tokenUsage.estimatedCost}), 0)`,
        totalTokens: sql<number>`coalesce(sum(${tokenUsage.totalTokens}), 0)`,
        totalRuns: sql<number>`coalesce(sum(${tokenUsage.runCount}), 0)`,
      })
      .from(tokenUsage)
      .where(eq(tokenUsage.date, today)),

    db
      .select({
        totalCost: sql<number>`coalesce(sum(${tokenUsage.estimatedCost}), 0)`,
        totalTokens: sql<number>`coalesce(sum(${tokenUsage.totalTokens}), 0)`,
      })
      .from(tokenUsage)
      .where(gte(tokenUsage.date, weekAgoStr)),

    db.select().from(agentStatus),

    db
      .select()
      .from(systemHealth)
      .orderBy(desc(systemHealth.checkedAt))
      .limit(20),

    db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(
        sql`${posts.createdAt} >= ${weekAgo} AND ${posts.status} = 'published'`
      ),

    db
      .select({
        total: sql<number>`count(*)`,
        replied: sql<number>`count(*) filter (where ${comments.isReplied} = true)`,
      })
      .from(comments)
      .where(
        sql`${comments.createdAt} >= ${weekAgo} AND ${comments.isAgent} = false`
      ),

    db
      .select()
      .from(alerts)
      .where(sql`${alerts.resolvedAt} IS NULL AND ${alerts.acknowledged} = false`)
      .orderBy(desc(alerts.createdAt))
      .limit(20),

    db
      .select({
        date: tokenUsage.date,
        cycleName: tokenUsage.cycleName,
        totalCost: sql<number>`sum(${tokenUsage.estimatedCost})`,
        totalTokens: sql<number>`sum(${tokenUsage.totalTokens})`,
        totalRuns: sql<number>`sum(${tokenUsage.runCount})`,
      })
      .from(tokenUsage)
      .where(gte(tokenUsage.date, weekAgoStr))
      .groupBy(tokenUsage.date, tokenUsage.cycleName)
      .orderBy(sql`${tokenUsage.date} DESC`),
  ]);

  const todayCost = Number(todayTokens[0]?.totalCost || 0);
  const usagePercent = (todayCost / DAILY_BUDGET_CENTS) * 100;
  let budgetMode: "normal" | "warning" | "exceeded" = "normal";
  if (usagePercent > 100) budgetMode = "exceeded";
  else if (usagePercent > 80) budgetMode = "warning";

  return Response.json({
    timestamp: new Date().toISOString(),
    budget: {
      dailyLimitCents: DAILY_BUDGET_CENTS,
      todayCostCents: todayCost,
      todayTokens: Number(todayTokens[0]?.totalTokens || 0),
      todayRuns: Number(todayTokens[0]?.totalRuns || 0),
      usagePercent: Math.round(usagePercent * 10) / 10,
      budgetMode,
      weekTotalCostCents: Number(weeklyTokens[0]?.totalCost || 0),
      weekTotalTokens: Number(weeklyTokens[0]?.totalTokens || 0),
    },
    cycles: cycleStatuses.map((s) => ({
      name: s.cycleName,
      status: s.status,
      task: s.currentTask,
      updatedAt: s.updatedAt,
    })),
    health: {
      latest: recentHealthChecks.slice(0, 5),
      allHealthy: recentHealthChecks
        .slice(0, 5)
        .every((h) => h.status === "healthy"),
    },
    content: {
      weekPosts: Number(weekPostStats[0]?.count || 0),
      weekComments: Number(weekCommentStats[0]?.total || 0),
      weekReplied: Number(weekCommentStats[0]?.replied || 0),
    },
    alerts: activeAlerts,
    dailyBreakdown: dailyBreakdown.map((d) => ({
      ...d,
      totalCost: Number(d.totalCost),
      totalTokens: Number(d.totalTokens),
      totalRuns: Number(d.totalRuns),
    })),
  });
}
