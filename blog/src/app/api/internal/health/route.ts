import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { systemHealth } from "@/lib/schema";
import { verifyInternalToken, unauthorizedResponse } from "@/lib/auth";
import { sql, desc } from "drizzle-orm";
import { sseManager } from "@/lib/sse";

export async function POST(request: NextRequest) {
  if (!verifyInternalToken(request)) return unauthorizedResponse();

  const body = await request.json();
  const { checks } = body;

  if (!Array.isArray(checks) || checks.length === 0) {
    return Response.json(
      { error: "checks array is required" },
      { status: 400 }
    );
  }

  const rows = checks.map((check: {
    service: string;
    status: string;
    response_time_ms?: number;
    error_message?: string;
    details?: Record<string, unknown>;
  }) => ({
    service: check.service,
    status: check.status,
    responseTimeMs: check.response_time_ms || null,
    errorMessage: check.error_message || null,
    details: check.details || null,
  }));

  await db.insert(systemHealth).values(rows);

  const allHealthy = checks.every(
    (c: { status: string }) => c.status === "healthy"
  );

  sseManager.broadcast("health_check", {
    allHealthy,
    checks: checks.map((c: { service: string; status: string }) => ({
      service: c.service,
      status: c.status,
    })),
    checkedAt: new Date().toISOString(),
  });

  return Response.json({ ok: true, allHealthy });
}

export async function GET(request: NextRequest) {
  if (!verifyInternalToken(request)) return unauthorizedResponse();

  const latestPerService = await db.execute(sql`
    SELECT DISTINCT ON (service)
      service, status, response_time_ms, error_message, checked_at
    FROM system_health
    ORDER BY service, checked_at DESC
  `);

  const history = await db
    .select()
    .from(systemHealth)
    .orderBy(desc(systemHealth.checkedAt))
    .limit(100);

  return Response.json({
    current: latestPerService,
    history,
  });
}
