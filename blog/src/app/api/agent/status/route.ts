import { db } from "@/lib/db";
import { agentStatus } from "@/lib/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  const statuses = await db
    .select()
    .from(agentStatus)
    .orderBy(sql`${agentStatus.updatedAt} DESC`);

  return Response.json({ statuses });
}
