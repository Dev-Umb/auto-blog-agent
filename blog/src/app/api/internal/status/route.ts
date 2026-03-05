import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { agentStatus } from "@/lib/schema";
import { verifyInternalToken, unauthorizedResponse } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { sseManager } from "@/lib/sse";

export async function POST(request: NextRequest) {
  if (!verifyInternalToken(request)) return unauthorizedResponse();

  const body = await request.json();
  const { cycle, status, task, details } = body;

  if (!cycle || !status) {
    return Response.json(
      { error: "cycle and status are required" },
      { status: 400 }
    );
  }

  const existing = await db
    .select()
    .from(agentStatus)
    .where(eq(agentStatus.cycleName, cycle));

  if (existing.length > 0) {
    await db
      .update(agentStatus)
      .set({
        status,
        currentTask: task || null,
        details: details || null,
        updatedAt: new Date(),
      })
      .where(eq(agentStatus.cycleName, cycle));
  } else {
    await db.insert(agentStatus).values({
      cycleName: cycle,
      status,
      currentTask: task || null,
      details: details || null,
    });
  }

  sseManager.broadcast("agent_status", { cycle, status, task });

  return Response.json({ ok: true });
}
