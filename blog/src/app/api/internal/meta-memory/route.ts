import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { metaMemory } from "@/lib/schema";
import { verifyInternalToken, unauthorizedResponse } from "@/lib/auth";
import { eq, and, sql, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  if (!verifyInternalToken(request)) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const query = category
    ? db
        .select()
        .from(metaMemory)
        .where(eq(metaMemory.category, category))
        .orderBy(desc(metaMemory.updatedAt))
    : db
        .select()
        .from(metaMemory)
        .orderBy(sql`${metaMemory.category}, ${metaMemory.key}`);

  const results = await query;
  return Response.json({ memories: results });
}

export async function POST(request: NextRequest) {
  if (!verifyInternalToken(request)) return unauthorizedResponse();

  const body = await request.json();
  const { category, key, value } = body;

  if (!category || !key || value === undefined) {
    return Response.json(
      { error: "category, key, and value are required" },
      { status: 400 }
    );
  }

  const existing = await db
    .select()
    .from(metaMemory)
    .where(and(eq(metaMemory.category, category), eq(metaMemory.key, key)));

  if (existing.length > 0) {
    await db
      .update(metaMemory)
      .set({
        value,
        version: sql`${metaMemory.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(metaMemory.id, existing[0].id));

    return Response.json({
      ok: true,
      action: "updated",
      version: (existing[0].version ?? 0) + 1,
    });
  }

  const [inserted] = await db
    .insert(metaMemory)
    .values({ category, key, value, version: 1 })
    .returning();

  return Response.json({ ok: true, action: "created", id: inserted.id });
}
