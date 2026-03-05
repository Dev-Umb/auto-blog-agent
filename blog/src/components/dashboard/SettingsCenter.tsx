"use client";

import { useMemo, useState } from "react";
import type {
  DashboardSettings,
  ThemeMode,
  ContentDirection,
  ContentFrequency,
} from "@/lib/settings-config";
import { PRESET_CONTENT_DIRECTIONS } from "@/lib/settings-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";

const FREQUENCY_OPTIONS: { value: ContentFrequency; label: string }[] = [
  { value: "every_run", label: "每次运行" },
  { value: "every_other_run", label: "隔次运行" },
  { value: "daily", label: "每日一次" },
];

interface Props {
  initialSettings: DashboardSettings;
}

export function SettingsCenter({ initialSettings }: Props) {
  const [settings, setSettings] = useState<DashboardSettings>(initialSettings);
  const [providersJson, setProvidersJson] = useState(
    JSON.stringify(initialSettings.modelConfig.providers, null, 2)
  );
  const [routesJson, setRoutesJson] = useState(
    JSON.stringify(initialSettings.modelConfig.routes, null, 2)
  );
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const providerCount = useMemo(() => settings.modelConfig.providers.length, [settings]);
  const routeCount = useMemo(() => settings.modelConfig.routes.length, [settings]);

  const updateAuthor = (key: "name" | "personality" | "writingStyle" | "tagline", value: string) => {
    setSettings((prev) => ({
      ...prev,
      authorProfile: {
        ...prev.authorProfile,
        [key]: value,
      },
    }));
  };

  async function handleSave() {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const providers = JSON.parse(providersJson);
      const routes = JSON.parse(routesJson);
      const payload = {
        ...settings,
        modelConfig: {
          ...settings.modelConfig,
          providers,
          routes,
        },
      };

      const res = await fetch("/api/dashboard/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "保存失败");
      }
      setSettings(data.settings as DashboardSettings);
      setProvidersJson(JSON.stringify(data.settings.modelConfig.providers, null, 2));
      setRoutesJson(JSON.stringify(data.settings.modelConfig.routes, null, 2));
      setMessage("配置已保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleApply() {
    setApplying(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        ...settings,
        modelConfig: {
          ...settings.modelConfig,
          providers: JSON.parse(providersJson),
          routes: JSON.parse(routesJson),
        },
      };
      const res = await fetch("/api/dashboard/settings/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: payload, services: ["openclaw", "llm-proxy"] }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "应用失败");
      }
      setSettings(data.settings as DashboardSettings);
      setMessage("配置已应用，服务重启已触发");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setApplying(false);
    }
  }

  // --- Content direction helpers ---
  const updateDirection = (id: string, patch: Partial<ContentDirection>) => {
    setSettings((prev) => ({
      ...prev,
      contentDirections: {
        directions: prev.contentDirections.directions.map((d) =>
          d.id === id ? { ...d, ...patch } : d
        ),
      },
    }));
  };

  const removeDirection = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      contentDirections: {
        directions: prev.contentDirections.directions.filter((d) => d.id !== id),
      },
    }));
  };

  const [showAddForm, setShowAddForm] = useState(false);
  const [newDir, setNewDir] = useState({
    label: "",
    description: "",
    keywords: "",
  });

  const addCustomDirection = () => {
    const label = newDir.label.trim();
    if (!label) return;
    const id = `custom_${Date.now()}`;
    const keywords = newDir.keywords
      .split(/[,，]/)
      .map((k) => k.trim())
      .filter(Boolean);

    setSettings((prev) => ({
      ...prev,
      contentDirections: {
        directions: [
          ...prev.contentDirections.directions,
          {
            id,
            label,
            description: newDir.description.trim(),
            keywords: keywords.length > 0 ? keywords : [label],
            enabled: true,
            weight: 1.0,
            frequency: "every_run" as ContentFrequency,
          },
        ],
      },
    }));
    setNewDir({ label: "", description: "", keywords: "" });
    setShowAddForm(false);
  };

  const isPreset = (id: string) =>
    PRESET_CONTENT_DIRECTIONS.some((p) => p.id === id);

  const enabledCount = settings.contentDirections.directions.filter((d) => d.enabled).length;

  // --- Theme ---
  const theme = settings.themePreferences.mode;
  const setTheme = (mode: ThemeMode) => {
    setSettings((prev) => ({
      ...prev,
      themePreferences: { mode },
    }));
  };

  return (
    <section className="mt-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>设置中心</CardTitle>
              <CardDescription>动态调整模型、作者、内容方向与主题，支持一键应用并重启服务。</CardDescription>
            </div>
            <Badge variant="default">Dashboard Config</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="model">
            <TabsList>
              <TabsTrigger value="model">模型配置</TabsTrigger>
              <TabsTrigger value="author">AI 作者</TabsTrigger>
              <TabsTrigger value="content">内容方向</TabsTrigger>
              <TabsTrigger value="theme">界面主题</TabsTrigger>
            </TabsList>

            <TabsContent value="model">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="default-model">默认模型</Label>
                    <Input
                      id="default-model"
                      value={settings.modelConfig.defaultModel}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          modelConfig: { ...prev.modelConfig, defaultModel: e.target.value },
                        }))
                      }
                      placeholder="provider/model-id"
                    />
                  </div>
                  <div className="flex gap-3 items-end">
                    <Badge>Provider: {providerCount}</Badge>
                    <Badge>Route: {routeCount}</Badge>
                  </div>
                </div>

                <Accordion type="single" collapsible defaultValue="providers">
                  <AccordionItem value="providers">
                    <AccordionTrigger>Provider 列表（JSON）</AccordionTrigger>
                    <AccordionContent>
                      <Textarea
                        className="min-h-[220px] font-mono text-xs"
                        value={providersJson}
                        onChange={(e) => setProvidersJson(e.target.value)}
                      />
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="routes">
                    <AccordionTrigger>路由规则（JSON）</AccordionTrigger>
                    <AccordionContent>
                      <Textarea
                        className="min-h-[220px] font-mono text-xs"
                        value={routesJson}
                        onChange={(e) => setRoutesJson(e.target.value)}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </TabsContent>

            <TabsContent value="author">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="author-name">作者名字</Label>
                  <Input
                    id="author-name"
                    value={settings.authorProfile.name}
                    onChange={(e) => updateAuthor("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author-tagline">副标题</Label>
                  <Input
                    id="author-tagline"
                    value={settings.authorProfile.tagline}
                    onChange={(e) => updateAuthor("tagline", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author-personality">性格设定</Label>
                  <Textarea
                    id="author-personality"
                    value={settings.authorProfile.personality}
                    onChange={(e) => updateAuthor("personality", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author-style">文笔风格</Label>
                  <Textarea
                    id="author-style"
                    value={settings.authorProfile.writingStyle}
                    onChange={(e) => updateAuthor("writingStyle", e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="content">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">内容浏览方向</Label>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      配置 Agent 探索循环的搜索方向、关键词和频率。已启用 {enabledCount} 个方向。
                    </p>
                  </div>
                  <Button
                    variant="default"
                    onClick={() => setShowAddForm(!showAddForm)}
                  >
                    {showAddForm ? "取消" : "+ 自定义方向"}
                  </Button>
                </div>

                {showAddForm && (
                  <Card className="border-dashed border-[var(--accent)]/40">
                    <CardContent className="pt-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="new-dir-label">方向名称</Label>
                          <Input
                            id="new-dir-label"
                            value={newDir.label}
                            onChange={(e) => setNewDir((p) => ({ ...p, label: e.target.value }))}
                            placeholder="如：宠物养护、独立游戏"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="new-dir-desc">描述</Label>
                          <Input
                            id="new-dir-desc"
                            value={newDir.description}
                            onChange={(e) => setNewDir((p) => ({ ...p, description: e.target.value }))}
                            placeholder="简要说明这个方向关注什么"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="new-dir-kw">搜索关键词（逗号分隔）</Label>
                        <Input
                          id="new-dir-kw"
                          value={newDir.keywords}
                          onChange={(e) => setNewDir((p) => ({ ...p, keywords: e.target.value }))}
                          placeholder="关键词1, 关键词2, ..."
                        />
                      </div>
                      <Button variant="primary" onClick={addCustomDirection} disabled={!newDir.label.trim()}>
                        添加方向
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Accordion type="multiple" defaultValue={settings.contentDirections.directions.filter((d) => d.enabled).map((d) => d.id)}>
                  {settings.contentDirections.directions.map((dir) => (
                    <AccordionItem key={dir.id} value={dir.id}>
                      <div className="flex items-center gap-3 pr-2">
                        <Switch
                          checked={dir.enabled}
                          onCheckedChange={(checked) => updateDirection(dir.id, { enabled: checked })}
                        />
                        <AccordionTrigger className="flex-1 py-3">
                          <div className="flex items-center gap-2 text-left">
                            <span className={dir.enabled ? "text-[var(--text-main)]" : "text-[var(--text-muted)]"}>
                              {dir.label}
                            </span>
                            {isPreset(dir.id) && (
                              <Badge variant="default" className="text-[10px] px-1.5 py-0">预设</Badge>
                            )}
                            {dir.enabled && (
                              <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                权重 {dir.weight}
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        {!isPreset(dir.id) && (
                          <button
                            type="button"
                            onClick={() => removeDirection(dir.id)}
                            className="text-[var(--text-muted)] hover:text-red-500 transition-colors p-1"
                            title="删除此方向"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>

                      <AccordionContent>
                        <div className="space-y-4 pl-12">
                          <p className="text-xs text-[var(--text-muted)]">{dir.description}</p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>权重 ({dir.weight})</Label>
                              <input
                                type="range"
                                min="0.1"
                                max="2.0"
                                step="0.1"
                                value={dir.weight}
                                onChange={(e) =>
                                  updateDirection(dir.id, { weight: parseFloat(e.target.value) })
                                }
                                className="w-full accent-[var(--accent)]"
                              />
                              <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                                <span>低 0.1</span>
                                <span>中 1.0</span>
                                <span>高 2.0</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>运行频率</Label>
                              <div className="flex gap-1.5">
                                {FREQUENCY_OPTIONS.map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => updateDirection(dir.id, { frequency: opt.value })}
                                    className={[
                                      "rounded-md px-2.5 py-1 text-xs font-medium border transition-colors",
                                      dir.frequency === opt.value
                                        ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                                        : "bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-subtle)] hover:border-[var(--accent)]",
                                    ].join(" ")}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>搜索关键词</Label>
                            <div className="flex flex-wrap gap-1.5">
                              {dir.keywords.map((kw, kwIdx) => (
                                <span
                                  key={kwIdx}
                                  className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] pl-2.5 pr-1 py-0.5 text-xs"
                                >
                                  {kw}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = dir.keywords.filter((_, i) => i !== kwIdx);
                                      updateDirection(dir.id, { keywords: next });
                                    }}
                                    className="hover:text-red-500 transition-colors p-0.5"
                                  >
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </span>
                              ))}
                            </div>
                            <KeywordAdder
                              onAdd={(kw) =>
                                updateDirection(dir.id, { keywords: [...dir.keywords, kw] })
                              }
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                <Alert className="border-[var(--border-subtle)]">
                  <AlertDescription className="text-xs text-[var(--text-muted)]">
                    已启用的方向将同步到 Agent 的 sources.yaml 搜索组和 meta_memory。
                    权重影响搜索结果评分，频率控制搜索执行间隔。保存并应用后生效。
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            <TabsContent value="theme">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-main)]">纸质护眼模式</p>
                    <p className="text-xs text-[var(--text-muted)]">推荐长时间阅读使用</p>
                  </div>
                  <Switch checked={theme === "paper"} onCheckedChange={(checked) => setTheme(checked ? "paper" : "neo")} />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={theme === "paper" ? "primary" : "default"}
                    onClick={() => setTheme("paper")}
                  >
                    Paper
                  </Button>
                  <Button
                    variant={theme === "neo" ? "primary" : "default"}
                    onClick={() => setTheme("neo")}
                  >
                    Neo
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {(message || error) && (
            <Alert className={error ? "border-red-500/40" : "border-emerald-500/40"}>
              <AlertDescription>{error || message}</AlertDescription>
            </Alert>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button variant="default" onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存设置"}
            </Button>
            <Button variant="primary" onClick={handleApply} disabled={applying || saving}>
              {applying ? "应用中..." : "保存并应用（重启服务）"}
            </Button>
            {settings.opsState.lastAppliedAt && (
              <span className="text-xs text-[var(--text-muted)]">
                最近应用：{new Date(settings.opsState.lastAppliedAt).toLocaleString("zh-CN")}
                {settings.opsState.lastApplyResult === "failed" ? "（失败）" : "（成功）"}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function KeywordAdder({ onAdd }: { onAdd: (kw: string) => void }) {
  const [value, setValue] = useState("");
  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
  };

  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="输入新关键词后按回车"
        className="flex-1 text-xs"
      />
      <Button variant="default" onClick={submit} disabled={!value.trim()} className="text-xs">
        添加
      </Button>
    </div>
  );
}
