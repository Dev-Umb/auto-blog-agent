import { readFile, writeFile } from "fs/promises";

const QUEUE_PATH =
  process.env.QUEUE_PATH || "/root/.openclaw/workspace/queue.json";
const COMPAT_QUEUE_PATH =
  process.env.QUEUE_COMPAT_PATH || "/openclaw-workspace/workspace/queue.json";

async function readQueueFromCandidates() {
  const candidates = [QUEUE_PATH, COMPAT_QUEUE_PATH];
  let lastQueue: unknown[] = [];

  for (const path of candidates) {
    try {
      const raw = await readFile(path, "utf-8");
      const queue = JSON.parse(raw);
      if (Array.isArray(queue)) {
        if (queue.length > 0) return queue;
        lastQueue = queue;
      }
    } catch {
      // ignore missing/invalid candidate and continue
    }
  }

  return lastQueue;
}

export async function GET() {
  const queue = await readQueueFromCandidates();
  return Response.json({ queue: Array.isArray(queue) ? queue : [] });
}

export async function DELETE() {
  await writeFile(QUEUE_PATH, JSON.stringify([], null, 2), "utf-8");
  try {
    await writeFile(COMPAT_QUEUE_PATH, JSON.stringify([], null, 2), "utf-8");
  } catch {
    // Compat queue path is best-effort only.
  }
  return Response.json({ ok: true, message: "写作队列已清空", queue: [] });
}
