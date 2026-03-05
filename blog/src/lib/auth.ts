import { NextRequest } from "next/server";

export function verifyInternalToken(request: NextRequest): boolean {
  const token = process.env.BLOG_INTERNAL_TOKEN;
  if (!token) return false;

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const [scheme, provided] = authHeader.split(" ");
  return scheme === "Bearer" && provided === token;
}

export function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
