import {
  getDashboardSettings,
  saveDashboardSettings,
  saveAuthorProfileToMetaMemory,
  saveContentDirectionsToMetaMemory,
  writeAppliedConfigs,
} from "@/lib/settings-service";

async function triggerRestart(services: string[]) {
  const endpoint = process.env.OPS_CONTROL_URL || "http://ops-control:4020/ops/restart";
  const token = process.env.OPS_CONTROL_TOKEN || "";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ services }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`重启服务失败: ${response.status} ${text}`);
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const forceSettings = body.settings;
  const restartServices = Array.isArray(body.services)
    ? (body.services as string[])
    : ["openclaw", "llm-proxy"];

  try {
    let settings = (await getDashboardSettings()).settings;
    if (forceSettings) {
      settings = (await saveDashboardSettings(forceSettings)).settings;
    }

    await writeAppliedConfigs(settings);
    await saveAuthorProfileToMetaMemory(settings);
    await saveContentDirectionsToMetaMemory(settings);
    await triggerRestart(restartServices);

    const next = {
      ...settings,
      opsState: {
        lastAppliedAt: new Date().toISOString(),
        lastApplyResult: "success" as const,
        lastApplyMessage: `已触发重启：${restartServices.join(", ")}`,
      },
    };
    await saveDashboardSettings(next);

    return Response.json({ ok: true, settings: next });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const settings = (await getDashboardSettings()).settings;
    const next = {
      ...settings,
      opsState: {
        lastAppliedAt: new Date().toISOString(),
        lastApplyResult: "failed" as const,
        lastApplyMessage: message,
      },
    };
    await saveDashboardSettings(next);
    return Response.json({ error: "apply_failed", message }, { status: 500 });
  }
}
