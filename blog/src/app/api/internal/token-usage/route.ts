import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { tokenUsage } from "@/lib/schema";
import { verifyInternalToken, unauthorizedResponse } from "@/lib/auth";
import { eq, sql, and, gte, lte } from "drizzle-orm";
import { sseManager } from "@/lib/sse";

const DAILY_BUDGET_CENTS = Number(process.env.DAILY_TOKEN_BUDGET_CENTS || "200");

export async function POST(request: NextRequest) {
  if (!verifyInternalToken(request)) return unauthorizedResponse();

  const body = await request.json();
  const {
    cycle,
    model,
    input_tokens = 0,
    output_tokens = 0,
    estimated_cost = 0,
  } = body;

  if (!cycle) {
    return Response.json({ error: "cycle is required" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];
  const totalTokens = input_tokens + output_tokens;

  const existing = await db
    .select()
    .from(tokenUsage)
    .where(
      and(
        eq(tokenUsage.date, today),
        eq(tokenUsage.cycleName, cycle),
        model ? eq(tokenUsage.model, model) : sql`${tokenUsage.model} IS NULL`
      )
    );

  if (existing.length > 0) {
    await db
      .update(tokenUsage)
      .set({
        inputTokens: sql`${tokenUsage.inputTokens} + ${input_tokens}`,
        outputTokens: sql`${tokenUsage.outputTokens} + ${output_tokens}`,
        totalTokens: sql`${tokenUsage.totalTokens} + ${totalTokens}`,
        estimatedCost: sql`${tokenUsage.estimatedCost} + ${estimated_cost}`,
        runCount: sql`${tokenUsage.runCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(tokenUsage.id, existing[0].id));
  } else {
    await db.insert(tokenUsage).values({
      date: today,
      cycleName: cycle,
      model: model || null,
      inputTokens: input_tokens,
      outputTokens: output_tokens,
      totalTokens: totalTokens,
      estimatedCost: estimated_cost,
      runCount: 1,
    });
  }

  const [dailyTotal] = await db
    .select({
      totalCost: sql<number>`coalesce(sum(${tokenUsage.estimatedCost}), 0)`,
      totalTokens: sql<number>`coalesce(sum(${tokenUsage.totalTokens}), 0)`,
    })
    .from(tokenUsage)
    .where(eq(tokenUsage.date, today));

  const usagePercent = (Number(dailyTotal.totalCost) / DAILY_BUDGET_CENTS) * 100;
  let budgetMode: "normal" | "warning" | "exceeded" = "normal";
  if (usagePercent > 100) budgetMode = "exceeded";
  else if (usagePercent > 80) budgetMode = "warning";

  sseManager.broadcast("token_usage", {
    date: today,
    totalCost: Number(dailyTotal.totalCost),
    totalTokens: Number(dailyTotal.totalTokens),
    budgetCents: DAILY_BUDGET_CENTS,
    usagePercent: Math.round(usagePercent * 10) / 10,
    budgetMode,
  });

  return Response.json({
    ok: true,
    daily: {
      totalCost: Number(dailyTotal.totalCost),
      totalTokens: Number(dailyTotal.totalTokens),
      budgetCents: DAILY_BUDGET_CENTS,
      usagePercent: Math.round(usagePercent * 10) / 10,
      budgetMode,
    },
  });
}

export async function GET(request: NextRequest) {
  if (!verifyInternalToken(request)) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days") || "7");
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const today = new Date().toISOString().split("T")[0];

  const rows = await db
    .select()
    .from(tokenUsage)
    .where(gte(tokenUsage.date, startDate.toISOString().split("T")[0]))
    .orderBy(sql`${tokenUsage.date} DESC, ${tokenUsage.cycleName}`);

  const dailySummaries = await db
    .select({
      date: tokenUsage.date,
      totalCost: sql<number>`sum(${tokenUsage.estimatedCost})`,
      totalTokens: sql<number>`sum(${tokenUsage.totalTokens})`,
      totalRuns: sql<number>`sum(${tokenUsage.runCount})`,
    })
    .from(tokenUsage)
    .where(gte(tokenUsage.date, startDate.toISOString().split("T")[0]))
    .groupBy(tokenUsage.date)
    .orderBy(sql`${tokenUsage.date} DESC`);

  const [todayTotal] = await db
    .select({
      totalCost: sql<number>`coalesce(sum(${tokenUsage.estimatedCost}), 0)`,
      totalTokens: sql<number>`coalesce(sum(${tokenUsage.totalTokens}), 0)`,
    })
    .from(tokenUsage)
    .where(eq(tokenUsage.date, today));

  const usagePercent =
    (Number(todayTotal.totalCost) / DAILY_BUDGET_CENTS) * 100;
  let budgetMode: "normal" | "warning" | "exceeded" = "normal";
  if (usagePercent > 100) budgetMode = "exceeded";
  else if (usagePercent > 80) budgetMode = "warning";

  return Response.json({
    budget: {
      dailyLimitCents: DAILY_BUDGET_CENTS,
      todayCostCents: Number(todayTotal.totalCost),
      todayTokens: Number(todayTotal.totalTokens),
      usagePercent: Math.round(usagePercent * 10) / 10,
      budgetMode,
    },
    dailySummaries: dailySummaries.map((d) => ({
      ...d,
      totalCost: Number(d.totalCost),
      totalTokens: Number(d.totalTokens),
      totalRuns: Number(d.totalRuns),
    })),
    details: rows,
  });
}
