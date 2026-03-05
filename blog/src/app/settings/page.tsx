import { SettingsCenter } from "@/components/dashboard/SettingsCenter";
import { getDashboardSettings } from "@/lib/settings-service";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const dashboardSettings = await getDashboardSettings();

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-main)] mb-8">系统设置</h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        在这里配置模型路由、AI 作者人格与文笔风格、内容浏览方向、主题偏好，并可一键应用到运行环境。
      </p>
      <SettingsCenter initialSettings={dashboardSettings.settings} />
    </div>
  );
}
