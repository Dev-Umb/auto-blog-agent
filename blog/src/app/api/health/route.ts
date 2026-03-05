import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  const dbStart = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = { status: "healthy", latencyMs: Date.now() - dbStart };
  } catch (e) {
    checks.database = {
      status: "unhealthy",
      latencyMs: Date.now() - dbStart,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  checks.blog = { status: "healthy", latencyMs: 0 };

  const allHealthy = Object.values(checks).every((c) => c.status === "healthy");

  return Response.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
