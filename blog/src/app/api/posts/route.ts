import { NextRequest, NextResponse } from "next/server";
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

  const responseData = {
    posts: results,
    pagination: {
      page,
      limit,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / limit),
    },
  };

  // 使用 NextResponse 并明确设置 UTF-8 编码
  return new NextResponse(JSON.stringify(responseData), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
