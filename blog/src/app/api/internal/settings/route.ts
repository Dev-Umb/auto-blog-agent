import { NextRequest } from "next/server";
import { verifyInternalToken, unauthorizedResponse } from "@/lib/auth";
import {
  getDashboardSettings,
  saveDashboardSettings,
} from "@/lib/settings-service";

export async function GET(request: NextRequest) {
  if (!verifyInternalToken(request)) return unauthorizedResponse();
  const { settings, version } = await getDashboardSettings();
  return Response.json({ settings, version });
}

export async function PUT(request: NextRequest) {
  if (!verifyInternalToken(request)) return unauthorizedResponse();
  const body = await request.json();

  try {
    const { settings, version } = await saveDashboardSettings(body.settings);
    return Response.json({ ok: true, settings, version });
  } catch (error) {
    return Response.json(
      {
        error: "invalid_settings",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }
}
