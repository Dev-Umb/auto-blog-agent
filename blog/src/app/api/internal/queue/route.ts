import { NextRequest } from "next/server";
import { verifyInternalToken, unauthorizedResponse } from "@/lib/auth";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const QUEUE_PATH =
  process.env.QUEUE_PATH || "/root/.openclaw/workspace/queue.json";

export async function GET(request: NextRequest) {
  if (!verifyInternalToken(request)) return unauthorizedResponse();

  try {
    const raw = await readFile(QUEUE_PATH, "utf-8");
    const queue = JSON.parse(raw);
    return Response.json({ queue });
  } catch {
    return Response.json({ queue: [] });
  }
}

export async function PUT(request: NextRequest) {
  if (!verifyInternalToken(request)) return unauthorizedResponse();

  const body = await request.json();
  await writeFile(QUEUE_PATH, JSON.stringify(body.queue, null, 2), "utf-8");
  return Response.json({ ok: true });
}
