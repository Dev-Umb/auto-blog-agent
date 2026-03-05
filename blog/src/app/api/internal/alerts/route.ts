import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { alerts } from "@/lib/schema";
import { verifyInternalToken, unauthorizedResponse } from "@/lib/auth";
import { eq, sql, desc } from "drizzle-orm";
import { sseManager } from "@/lib/sse";

const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL;

export async function POST(request: NextRequest) {
  if (!verifyInternalToken(request)) return unauthorizedResponse();

  const body = await request.json();
  const { severity, category, message, details } = body;

  if (!severity || !category || !message) {
    return Response.json(
      { error: "severity, category, and message are required" },
      { status: 400 }
    );
  }

  const [inserted] = await db
    .insert(alerts)
    .values({ severity, category, message, details: details || null })
    .returning();

  sseManager.broadcast("alert", {
    id: inserted.id,
    severity,
    category,
    message,
  });

  if (ALERT_WEBHOOK_URL && (severity === "critical" || severity === "error")) {
    fireWebhook(inserted).catch(() => {});
  }

  return Response.json({ ok: true, alert: inserted });
}

export async function GET(request: NextRequest) {
  if (!verifyInternalToken(request)) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const onlyActive = searchParams.get("active") !== "false";
  const limit = Number(searchParams.get("limit") || "50");

  const rows = onlyActive
    ? await db
        .select()
        .from(alerts)
        .where(sql`${alerts.resolvedAt} IS NULL`)
        .orderBy(desc(alerts.createdAt))
        .limit(limit)
    : await db.select().from(alerts).orderBy(desc(alerts.createdAt)).limit(limit);
  return Response.json({ alerts: rows });
}

export async function PATCH(request: NextRequest) {
  if (!verifyInternalToken(request)) return unauthorizedResponse();

  const body = await request.json();
  const { id, action } = body;

  if (!id || !action) {
    return Response.json(
      { error: "id and action are required" },
      { status: 400 }
    );
  }

  if (action === "acknowledge") {
    await db
      .update(alerts)
      .set({ acknowledged: true })
      .where(eq(alerts.id, id));
  } else if (action === "resolve") {
    await db
      .update(alerts)
      .set({ resolvedAt: new Date(), acknowledged: true })
      .where(eq(alerts.id, id));
  }

  return Response.json({ ok: true });
}

async function fireWebhook(alert: { id: number; severity: string; category: string; message: string }) {
  if (!ALERT_WEBHOOK_URL) return;
  try {
    await fetch(ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `🚨 [${alert.severity.toUpperCase()}] ${alert.category}: ${alert.message}`,
        alert,
      }),
    });
  } catch {
    console.error("[alert-webhook] Failed to send webhook");
  }
}
