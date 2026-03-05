import {
  getDashboardSettings,
  saveDashboardSettings,
} from "@/lib/settings-service";

export async function GET() {
  const { settings, version } = await getDashboardSettings();
  return Response.json({ settings, version });
}

export async function PUT(request: Request) {
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
