import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/schema";
import { desc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const tag = searchParams.get("tag");
  const offset = (page - 1) * limit;

  let query = db
    .select()
    .from(posts)
    .where(sql`${posts.status} = 'published'`)
    .orderBy(desc(posts.createdAt))
    .limit(limit)
    .offset(offset);

  if (tag) {
    query = db
      .select()
      .from(posts)
      .where(
        sql`${posts.status} = 'published' AND ${tag} = ANY(${posts.tags})`
      )
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);
  }

  const results = await query;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(posts)
    .where(sql`${posts.status} = 'published'`);

  return Response.json({
    posts: results,
    pagination: {
      page,
      limit,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / limit),
    },
  });
}
