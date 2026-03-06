"use client";

import { useMemo, useState } from "react";
import type {
  DashboardSettings,
  ThemeMode,
  ContentDirection,
  ContentFrequency,
  ModelProviderConfig,
  SkillItemConfig,
  SkillImportSource,
  SkillSourceType,
  McpClientConfig,
  McpTransport,
  McpRegistryInstalledItem,
  McpRegistryAvailableItem,
} from "@/lib/settings-config";
import { PRESET_CONTENT_DIRECTIONS, getDefaultSettings } from "@/lib/settings-config";
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

interface ProviderTestStatus {
  state: "idle" | "success" | "failed";
  message: string;
  latencyMs?: number;
}

export function SettingsCenter({ initialSettings }: Props) {
  const [settings, setSettings] = useState<DashboardSettings>(initialSettings);
  const [providersJson, setProvidersJson] = useState(
    JSON.stringify(initialSettings.modelConfig.providers, null, 2)
  );
  const [skillsJson, setSkillsJson] = useState(
    JSON.stringify(initialSettings.skillsConfig, null, 2)
  );
  const [mcpJson, setMcpJson] = useState(
    JSON.stringify(initialSettings.mcpConfig, null, 2)
  );
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [providerTesting, setProviderTesting] = useState<Record<string, boolean>>({});
  const [providerTestStatus, setProviderTestStatus] = useState<Record<string, ProviderTestStatus>>(
    {}
  );
  const [providerModalKey, setProviderModalKey] = useState<string | null>(null);
  const [editingProviderKey, setEditingProviderKey] = useState<string>("");
  const [showResetAuthorConfirm, setShowResetAuthorConfirm] = useState(false);

  const providerCount = useMemo(() => settings.modelConfig.providers.length, [settings]);
  const skillCount = useMemo(() => settings.skillsConfig.items.length, [settings]);
  const activeSkillCount = useMemo(
    () => settings.skillsConfig.items.filter((item) => item.enabled).length,
    [settings]
  );
  const mcpClientCount = useMemo(() => settings.mcpConfig.clients.length, [settings]);
  const activeMcpCount = useMemo(
    () => settings.mcpConfig.clients.filter((client) => client.enabled).length,
    [settings]
  );
  const defaultAuthorProfile = useMemo(() => getDefaultSettings().authorProfile, []);

  const updateAuthor = (key: "name" | "personality" | "writingStyle" | "tagline", value: string) => {
    setSettings((prev) => ({
      ...prev,
      authorProfile: {
        ...prev.authorProfile,
        [key]: value,
      },
    }));
  };

  const resetAuthorStyleToDefaults = () => {
    setSettings((prev) => ({
      ...prev,
      authorProfile: {
        ...prev.authorProfile,
        personality: defaultAuthorProfile.personality,
        writingStyle: defaultAuthorProfile.writingStyle,
      },
    }));
    setMessage("已恢复默认性格设定和文笔风格");
    setError("");
    setShowResetAuthorConfirm(false);
  };

  async function handleSave() {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "保存失败");
      }
      setSettings(data.settings as DashboardSettings);
      setProvidersJson(JSON.stringify(data.settings.modelConfig.providers, null, 2));
      setSkillsJson(JSON.stringify(data.settings.skillsConfig, null, 2));
      setMcpJson(JSON.stringify(data.settings.mcpConfig, null, 2));
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
      const res = await fetch("/api/dashboard/settings/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings, services: ["openclaw", "llm-proxy"] }),
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

  const enabledProviders = settings.modelConfig.providers.filter((provider) => provider.enabled);
  const activeProviderModels =
    settings.modelConfig.providers.find(
      (provider) => provider.key === settings.modelConfig.activeProvider
    )?.models ?? [];

  const setActiveProvider = (providerKey: string) => {
    const provider = settings.modelConfig.providers.find((item) => item.key === providerKey);
    const nextModel = provider?.models[0]?.id ?? "";
    setSettings((prev) => ({
      ...prev,
      modelConfig: {
        ...prev.modelConfig,
        activeProvider: providerKey,
        activeModel: nextModel,
        defaultModel: `${providerKey}/${nextModel}`,
      },
    }));
  };

  const setActiveModel = (modelId: string) => {
    setSettings((prev) => ({
      ...prev,
      modelConfig: {
        ...prev.modelConfig,
        activeModel: modelId,
        defaultModel: `${prev.modelConfig.activeProvider}/${modelId}`,
      },
    }));
  };

  const updateProvider = (providerKey: string, patch: Partial<ModelProviderConfig>) => {
    setSettings((prev) => {
      const providers = prev.modelConfig.providers.map((provider) =>
        provider.key === providerKey ? { ...provider, ...patch } : provider
      );
      const provider = providers.find((item) => item.key === prev.modelConfig.activeProvider);
      const nextModel = provider?.models.find((model) => model.id === prev.modelConfig.activeModel)
        ? prev.modelConfig.activeModel
        : provider?.models[0]?.id ?? "";
      return {
        ...prev,
        modelConfig: {
          ...prev.modelConfig,
          providers,
          activeModel: nextModel,
          defaultModel: `${prev.modelConfig.activeProvider}/${nextModel}`,
        },
      };
    });
  };

  const addProvider = () => {
    const nextProviderKey = `provider_${settings.modelConfig.providers.length + 1}`;
    setSettings((prev) => {
      const nextProvider: ModelProviderConfig = {
        key: nextProviderKey,
        enabled: true,
        baseUrl: "https://api.openai.com/v1",
        api: "openai-completions",
        apiKey: "",
        apiKeyEnv: "",
        models: [
          {
            id: "gpt-4o-mini",
            name: "GPT-4o mini",
            contextWindow: 128000,
            maxTokens: 4096,
          },
        ],
      };
      return {
        ...prev,
        modelConfig: {
          ...prev.modelConfig,
          providers: [...prev.modelConfig.providers, nextProvider],
        },
      };
    });
    setProviderModalKey(nextProviderKey);
    setEditingProviderKey(nextProviderKey);
  };

  const renameProvider = (oldKey: string, newKey: string) => {
    const trimmed = newKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    if (!trimmed || trimmed === oldKey) return;
    const duplicate = settings.modelConfig.providers.some(
      (p) => p.key !== oldKey && p.key === trimmed
    );
    if (duplicate) {
      setError(`Provider 名称 "${trimmed}" 已存在`);
      return;
    }
    setSettings((prev) => {
      const providers = prev.modelConfig.providers.map((p) =>
        p.key === oldKey ? { ...p, key: trimmed } : p
      );
      const isActive = prev.modelConfig.activeProvider === oldKey;
      return {
        ...prev,
        modelConfig: {
          ...prev.modelConfig,
          providers,
          activeProvider: isActive ? trimmed : prev.modelConfig.activeProvider,
          defaultModel: isActive
            ? `${trimmed}/${prev.modelConfig.activeModel}`
            : prev.modelConfig.defaultModel,
        },
      };
    });
    if (providerModalKey === oldKey) {
      setProviderModalKey(trimmed);
      setEditingProviderKey(trimmed);
    }
    setProviderTestStatus((prev) => {
      if (!(oldKey in prev)) return prev;
      const next = { ...prev, [trimmed]: prev[oldKey] };
      delete next[oldKey];
      return next;
    });
    setProviderTesting((prev) => {
      if (!(oldKey in prev)) return prev;
      const next = { ...prev, [trimmed]: prev[oldKey] };
      delete next[oldKey];
      return next;
    });
  };

  const removeProvider = (providerKey: string) => {
    if (providerModalKey === providerKey) {
      setProviderModalKey(null);
    }
    setSettings((prev) => {
      if (prev.modelConfig.providers.length <= 1) {
        setError("至少保留一个 Provider");
        return prev;
      }
      const providers = prev.modelConfig.providers.filter((item) => item.key !== providerKey);
      const activeProviderExists = providers.some(
        (item) => item.key === prev.modelConfig.activeProvider
      );
      const nextActiveProvider = activeProviderExists
        ? prev.modelConfig.activeProvider
        : providers[0].key;
      const nextProvider = providers.find((item) => item.key === nextActiveProvider);
      const nextActiveModel = nextProvider?.models[0]?.id ?? "";
      return {
        ...prev,
        modelConfig: {
          ...prev.modelConfig,
          providers,
          activeProvider: nextActiveProvider,
          activeModel: nextActiveModel,
          defaultModel: `${nextActiveProvider}/${nextActiveModel}`,
        },
      };
    });
  };

  const updateProviderModel = (
    providerKey: string,
    modelId: string,
    patch: Partial<ModelProviderConfig["models"][number]>
  ) => {
    setSettings((prev) => {
      const providers = prev.modelConfig.providers.map((provider) => {
        if (provider.key !== providerKey) return provider;
        return {
          ...provider,
          models: provider.models.map((model) =>
            model.id === modelId ? { ...model, ...patch } : model
          ),
        };
      });
      const currentProvider = providers.find((provider) => provider.key === prev.modelConfig.activeProvider);
      const modelExists = currentProvider?.models.some(
        (model) => model.id === prev.modelConfig.activeModel
      );
      const nextModel = modelExists ? prev.modelConfig.activeModel : currentProvider?.models[0]?.id ?? "";
      return {
        ...prev,
        modelConfig: {
          ...prev.modelConfig,
          providers,
          activeModel: nextModel,
          defaultModel: `${prev.modelConfig.activeProvider}/${nextModel}`,
        },
      };
    });
  };

  const addProviderModel = (providerKey: string) => {
    setSettings((prev) => {
      const providers = prev.modelConfig.providers.map((provider) => {
        if (provider.key !== providerKey) return provider;
        const idx = provider.models.length + 1;
        return {
          ...provider,
          models: [
            ...provider.models,
            {
              id: `model_${idx}`,
              name: `Model ${idx}`,
              contextWindow: 128000,
              maxTokens: 4096,
            },
          ],
        };
      });
      return {
        ...prev,
        modelConfig: {
          ...prev.modelConfig,
          providers,
        },
      };
    });
  };

  const removeProviderModel = (providerKey: string, modelId: string) => {
    setSettings((prev) => {
      const providers = prev.modelConfig.providers.map((provider) => {
        if (provider.key !== providerKey) return provider;
        if (provider.models.length <= 1) return provider;
        return {
          ...provider,
          models: provider.models.filter((model) => model.id !== modelId),
        };
      });
      const currentProvider = providers.find((provider) => provider.key === prev.modelConfig.activeProvider);
      const modelExists = currentProvider?.models.some(
        (model) => model.id === prev.modelConfig.activeModel
      );
      const nextModel = modelExists ? prev.modelConfig.activeModel : currentProvider?.models[0]?.id ?? "";
      return {
        ...prev,
        modelConfig: {
          ...prev.modelConfig,
          providers,
          activeModel: nextModel,
          defaultModel: `${prev.modelConfig.activeProvider}/${nextModel}`,
        },
      };
    });
  };

  const applyModelJsonToSettings = () => {
    try {
      const parsedProviders = JSON.parse(providersJson) as ModelProviderConfig[];
      if (!Array.isArray(parsedProviders)) {
        throw new Error("Provider JSON 必须是数组结构");
      }
      const normalizedProviders = parsedProviders.map((provider) => ({
        key: provider.key,
        enabled: typeof provider.enabled === "boolean" ? provider.enabled : true,
        baseUrl: provider.baseUrl,
        api: "openai-completions" as const,
        apiKey: typeof provider.apiKey === "string" ? provider.apiKey : "",
        apiKeyEnv: provider.apiKeyEnv,
        models: Array.isArray(provider.models)
          ? provider.models.map((model) => ({
              id: model.id,
              name: model.name,
              contextWindow: Number(model.contextWindow) || 128000,
              maxTokens: Number(model.maxTokens) || 4096,
            }))
          : [],
      }));
      setSettings((prev) => {
        const nextActiveProvider =
          normalizedProviders.find((item) => item.key === prev.modelConfig.activeProvider)?.key ??
          normalizedProviders[0]?.key ??
          prev.modelConfig.activeProvider;
        const provider = normalizedProviders.find((item) => item.key === nextActiveProvider);
        const nextActiveModel =
          provider?.models.find((item) => item.id === prev.modelConfig.activeModel)?.id ??
          provider?.models[0]?.id ??
          prev.modelConfig.activeModel;
        return {
          ...prev,
          modelConfig: {
            ...prev.modelConfig,
            providers: normalizedProviders,
            activeProvider: nextActiveProvider,
            activeModel: nextActiveModel,
            defaultModel: `${nextActiveProvider}/${nextActiveModel}`,
          },
        };
      });
      setMessage("模型 JSON 已应用到可视化配置");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const refreshModelJson = () => {
    setProvidersJson(JSON.stringify(settings.modelConfig.providers, null, 2));
    setMessage("模型 JSON 已按当前配置刷新");
    setError("");
  };

  const updateSkillItem = (id: string, patch: Partial<SkillItemConfig>) => {
    setSettings((prev) => {
      const items = prev.skillsConfig.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      );
      return {
        ...prev,
        skillsConfig: {
          ...prev.skillsConfig,
          items,
          activeSkills: items.filter((item) => item.enabled).map((item) => item.id),
        },
      };
    });
  };

  const addSkillItem = () => {
    setSettings((prev) => {
      const idx = prev.skillsConfig.items.length + 1;
      const next = {
        id: `custom-skill-${idx}`,
        name: `Custom Skill ${idx}`,
        enabled: false,
        entry: "SKILL.md",
        source: {
          type: "local" as SkillSourceType,
          uri: `skills/custom-skill-${idx}`,
          trustLevel: "unverified" as const,
        },
      };
      const items = [...prev.skillsConfig.items, next];
      return {
        ...prev,
        skillsConfig: {
          ...prev.skillsConfig,
          items,
          activeSkills: items.filter((item) => item.enabled).map((item) => item.id),
        },
      };
    });
  };

  const removeSkillItem = (id: string) => {
    setSettings((prev) => {
      const items = prev.skillsConfig.items.filter((item) => item.id !== id);
      return {
        ...prev,
        skillsConfig: {
          ...prev.skillsConfig,
          items,
          activeSkills: items.filter((item) => item.enabled).map((item) => item.id),
        },
      };
    });
  };

  const updateSkillImportSource = (name: string, patch: Partial<SkillImportSource>) => {
    setSettings((prev) => ({
      ...prev,
      skillsConfig: {
        ...prev.skillsConfig,
        importSources: prev.skillsConfig.importSources.map((item) =>
          item.name === name ? { ...item, ...patch } : item
        ),
      },
    }));
  };

  const addSkillImportSource = () => {
    setSettings((prev) => {
      const idx = prev.skillsConfig.importSources.length + 1;
      return {
        ...prev,
        skillsConfig: {
          ...prev.skillsConfig,
          importSources: [
            ...prev.skillsConfig.importSources,
            {
              name: `import-source-${idx}`,
              type: "git",
              uri: "https://github.com",
              enabled: true,
              whitelistPattern: "https://github.com/**",
            },
          ],
        },
      };
    });
  };

  const removeSkillImportSource = (name: string) => {
    setSettings((prev) => ({
      ...prev,
      skillsConfig: {
        ...prev.skillsConfig,
        importSources: prev.skillsConfig.importSources.filter((item) => item.name !== name),
      },
    }));
  };

  const applySkillsJsonToSettings = () => {
    try {
      const parsed = JSON.parse(skillsJson) as DashboardSettings["skillsConfig"];
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.items)) {
        throw new Error("Skills JSON 格式不正确");
      }
      setSettings((prev) => ({
        ...prev,
        skillsConfig: parsed,
      }));
      setMessage("Skills JSON 已应用到可视化配置");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const refreshSkillsJson = () => {
    setSkillsJson(JSON.stringify(settings.skillsConfig, null, 2));
    setMessage("Skills JSON 已按当前配置刷新");
    setError("");
  };

  const updateMcpClient = (id: string, patch: Partial<McpClientConfig>) => {
    setSettings((prev) => ({
      ...prev,
      mcpConfig: {
        ...prev.mcpConfig,
        clients: prev.mcpConfig.clients.map((item) =>
          item.id === id ? { ...item, ...patch } : item
        ),
      },
    }));
  };

  const addMcpClient = () => {
    setSettings((prev) => {
      const idx = prev.mcpConfig.clients.length + 1;
      return {
        ...prev,
        mcpConfig: {
          ...prev.mcpConfig,
          clients: [
            ...prev.mcpConfig.clients,
            {
              id: `mcp-client-${idx}`,
              name: `MCP Client ${idx}`,
              enabled: false,
              transport: "stdio" as McpTransport,
              command: "npx",
              args: [],
              env: {},
              capabilities: [],
              timeoutMs: 30000,
            },
          ],
        },
      };
    });
  };

  const removeMcpClient = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      mcpConfig: {
        ...prev.mcpConfig,
        clients: prev.mcpConfig.clients.filter((item) => item.id !== id),
      },
    }));
  };

  const updateMcpInstalled = (name: string, patch: Partial<McpRegistryInstalledItem>) => {
    setSettings((prev) => ({
      ...prev,
      mcpConfig: {
        ...prev.mcpConfig,
        registry: {
          ...prev.mcpConfig.registry,
          installed: prev.mcpConfig.registry.installed.map((item) =>
            item.name === name ? { ...item, ...patch } : item
          ),
        },
      },
    }));
  };

  const updateMcpAvailable = (name: string, patch: Partial<McpRegistryAvailableItem>) => {
    setSettings((prev) => ({
      ...prev,
      mcpConfig: {
        ...prev.mcpConfig,
        registry: {
          ...prev.mcpConfig.registry,
          availableRegistry: prev.mcpConfig.registry.availableRegistry.map((item) =>
            item.name === name ? { ...item, ...patch } : item
          ),
        },
      },
    }));
  };

  const applyMcpJsonToSettings = () => {
    try {
      const parsed = JSON.parse(mcpJson) as DashboardSettings["mcpConfig"];
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.clients)) {
        throw new Error("MCP JSON 格式不正确");
      }
      setSettings((prev) => ({
        ...prev,
        mcpConfig: parsed,
      }));
      setMessage("MCP JSON 已应用到可视化配置");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const refreshMcpJson = () => {
    setMcpJson(JSON.stringify(settings.mcpConfig, null, 2));
    setMessage("MCP JSON 已按当前配置刷新");
    setError("");
  };

  const testProviderApiKey = async (provider: ModelProviderConfig) => {
    setProviderTesting((prev) => ({ ...prev, [provider.key]: true }));
    setProviderTestStatus((prev) => ({
      ...prev,
      [provider.key]: {
        state: "idle",
        message: "测试中...",
      },
    }));
    try {
      const res = await fetch("/api/dashboard/settings/model-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerKey: provider.key,
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          apiKeyEnv: provider.apiKeyEnv,
          modelId: provider.models[0]?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "验证失败");
      }
      setProviderTestStatus((prev) => ({
        ...prev,
        [provider.key]: {
          state: "success",
          message: data.message || "连接成功",
          latencyMs: typeof data.latencyMs === "number" ? data.latencyMs : undefined,
        },
      }));
    } catch (err) {
      setProviderTestStatus((prev) => ({
        ...prev,
        [provider.key]: {
          state: "failed",
          message: err instanceof Error ? err.message : String(err),
        },
      }));
    } finally {
      setProviderTesting((prev) => ({ ...prev, [provider.key]: false }));
    }
  };

  const providerModal = providerModalKey
    ? settings.modelConfig.providers.find((item) => item.key === providerModalKey) ?? null
    : null;

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
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="mcp">MCP</TabsTrigger>
              <TabsTrigger value="author">AI 作者</TabsTrigger>
              <TabsTrigger value="content">内容方向</TabsTrigger>
              <TabsTrigger value="theme">界面主题</TabsTrigger>
            </TabsList>

            <TabsContent value="model">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>当前生效模型</Label>
                    <p className="text-sm rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2">
                      {settings.modelConfig.defaultModel}
                    </p>
                  </div>
                  <div className="flex gap-3 items-end">
                    <Badge>Provider: {providerCount}</Badge>
                    <Badge>Enabled Provider: {enabledProviders.length}</Badge>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Active Model 选择</CardTitle>
                    <CardDescription>先选 Provider，再选模型，系统会自动生成 defaultModel。</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="active-provider">Active Provider</Label>
                      <select
                        id="active-provider"
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-2 text-sm"
                        value={settings.modelConfig.activeProvider}
                        onChange={(e) => setActiveProvider(e.target.value)}
                      >
                        {settings.modelConfig.providers.map((provider) => (
                          <option key={provider.key} value={provider.key}>
                            {provider.key} {provider.enabled ? "" : "(disabled)"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="active-model">Active Model</Label>
                      <select
                        id="active-model"
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-2 text-sm"
                        value={settings.modelConfig.activeModel}
                        onChange={(e) => setActiveModel(e.target.value)}
                      >
                        {activeProviderModels.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name} ({model.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">Provider 列表</CardTitle>
                        <CardDescription>仅显示基础信息。点“配置详情”后在弹窗中编辑 API Key 与模型列表。</CardDescription>
                      </div>
                      <Button variant="default" onClick={addProvider}>
                        + 新增 Provider
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {settings.modelConfig.providers.map((provider) => (
                      <div
                        key={provider.key}
                        className="rounded-xl border border-[var(--border-subtle)] p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{provider.key}</p>
                              <Badge>{provider.models.length} models</Badge>
                              <Badge>openai-compatible</Badge>
                              {settings.modelConfig.activeProvider === provider.key && (
                                <Badge>active</Badge>
                              )}
                            </div>
                            <p className="text-xs text-[var(--text-muted)]">
                              {provider.baseUrl}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="default"
                              onClick={() => {
                                setProviderModalKey(provider.key);
                                setEditingProviderKey(provider.key);
                              }}
                              className="text-xs"
                            >
                              配置详情
                            </Button>
                            <span className="text-xs text-[var(--text-muted)]">启用</span>
                            <Switch
                              checked={provider.enabled}
                              onCheckedChange={(checked) =>
                                updateProvider(provider.key, { enabled: checked })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Alert className="border-[var(--border-subtle)]">
                  <AlertDescription className="text-xs text-[var(--text-muted)]">
                    路由规则已改为自动生成：系统会基于已启用 Provider 自动生成 llm-proxy 路由，并默认使用当前 Active Provider/Model。
                  </AlertDescription>
                </Alert>

                <Accordion type="single" collapsible>
                  <AccordionItem value="model-json">
                    <AccordionTrigger>高级 JSON（Providers）</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Provider 列表（JSON）</Label>
                          <Textarea
                            className="min-h-[220px] font-mono text-xs"
                            value={providersJson}
                            onChange={(e) => setProvidersJson(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button variant="default" onClick={refreshModelJson}>
                            刷新 JSON
                          </Button>
                          <Button variant="primary" onClick={applyModelJsonToSettings}>
                            应用 JSON 到可视化
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {providerModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-4xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-main)] p-5 shadow-2xl">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-[var(--text-main)]">
                            Provider 配置详情：{providerModal.key}
                          </h3>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            OpenAI 兼容接口标准（api 固定为 openai-completions）
                          </p>
                        </div>
                        <Button variant="default" onClick={() => setProviderModalKey(null)}>
                          关闭
                        </Button>
                      </div>

                      <div className="mt-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge>{providerModal.models.length} models</Badge>
                            <Badge>openai-compatible</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="default"
                              onClick={() => testProviderApiKey(providerModal)}
                              disabled={providerTesting[providerModal.key]}
                              className="text-xs"
                            >
                              {providerTesting[providerModal.key] ? "测试中..." : "测试 API Key"}
                            </Button>
                            <Button
                              variant="default"
                              onClick={() => removeProvider(providerModal.key)}
                              disabled={settings.modelConfig.providers.length <= 1}
                              className="text-xs"
                            >
                              删除 Provider
                            </Button>
                          </div>
                        </div>

                        {providerTestStatus[providerModal.key] && (
                          <div
                            className={[
                              "rounded-md px-2 py-1 text-xs",
                              providerTestStatus[providerModal.key].state === "success"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : providerTestStatus[providerModal.key].state === "failed"
                                  ? "bg-red-500/10 text-red-600"
                                  : "bg-[var(--bg-card)] text-[var(--text-muted)]",
                            ].join(" ")}
                          >
                            {providerTestStatus[providerModal.key].message}
                            {providerTestStatus[providerModal.key].latencyMs
                              ? `（${providerTestStatus[providerModal.key].latencyMs}ms）`
                              : ""}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label>Provider 名称 (Key)</Label>
                            <Input
                              value={editingProviderKey}
                              onChange={(e) => setEditingProviderKey(e.target.value)}
                              onBlur={() => {
                                renameProvider(providerModal.key, editingProviderKey);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  renameProvider(providerModal.key, editingProviderKey);
                                  e.currentTarget.blur();
                                }
                              }}
                              placeholder="如 lkeap、openai、deepseek"
                            />
                            <p className="text-[10px] text-[var(--text-muted)]">
                              用于生成 defaultModel（如 lkeap/glm-5）。仅限小写字母、数字、下划线和连字符。回车或点击其他位置生效。
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label>Base URL</Label>
                            <Input
                              value={providerModal.baseUrl}
                              onChange={(e) =>
                                updateProvider(providerModal.key, { baseUrl: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>API Key（优先使用）</Label>
                            <Input
                              type="password"
                              value={providerModal.apiKey ?? ""}
                              onChange={(e) =>
                                updateProvider(providerModal.key, { apiKey: e.target.value || undefined })
                              }
                              placeholder="直接粘贴 sk-..."
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label>API Key Env（可选）</Label>
                            <Input
                              value={providerModal.apiKeyEnv ?? ""}
                              onChange={(e) =>
                                updateProvider(providerModal.key, { apiKeyEnv: e.target.value || undefined })
                              }
                              placeholder="不填则仅使用上面的 API Key"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>模型列表（OpenAI Compatible）</Label>
                            <Button
                              variant="default"
                              className="text-xs"
                              onClick={() => addProviderModel(providerModal.key)}
                            >
                              + 新增模型
                            </Button>
                          </div>
                          {providerModal.models.map((model) => (
                            <div
                              key={model.id}
                              className="grid grid-cols-1 md:grid-cols-5 gap-2 rounded-md border border-[var(--border-subtle)] p-2"
                            >
                              <Input
                                value={model.id}
                                onChange={(e) =>
                                  updateProviderModel(providerModal.key, model.id, { id: e.target.value })
                                }
                                placeholder="model id"
                              />
                              <Input
                                value={model.name}
                                onChange={(e) =>
                                  updateProviderModel(providerModal.key, model.id, { name: e.target.value })
                                }
                                placeholder="model name"
                              />
                              <Input
                                value={String(model.contextWindow)}
                                onChange={(e) =>
                                  updateProviderModel(providerModal.key, model.id, {
                                    contextWindow: Number(e.target.value) || 128000,
                                  })
                                }
                                placeholder="context window"
                              />
                              <Input
                                value={String(model.maxTokens)}
                                onChange={(e) =>
                                  updateProviderModel(providerModal.key, model.id, {
                                    maxTokens: Number(e.target.value) || 4096,
                                  })
                                }
                                placeholder="max tokens"
                              />
                              <Button
                                variant="default"
                                className="text-xs"
                                onClick={() => removeProviderModel(providerModal.key, model.id)}
                                disabled={providerModal.models.length <= 1}
                              >
                                删除模型
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="skills">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge>Skills: {skillCount}</Badge>
                  <Badge>Enabled: {activeSkillCount}</Badge>
                </div>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">技能列表</CardTitle>
                        <CardDescription>模仿 CoPaw 的 active/custom skills 管理方式。</CardDescription>
                      </div>
                      <Button variant="default" onClick={addSkillItem}>
                        + 新增 Skill
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {settings.skillsConfig.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-[var(--border-subtle)] p-3 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{item.name}</span>
                            <Badge>{item.source.type}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={item.enabled}
                              onCheckedChange={(checked) =>
                                updateSkillItem(item.id, { enabled: checked })
                              }
                            />
                            <Button variant="default" onClick={() => removeSkillItem(item.id)}>
                              删除
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label>ID</Label>
                            <Input
                              value={item.id}
                              onChange={(e) => updateSkillItem(item.id, { id: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Name</Label>
                            <Input
                              value={item.name}
                              onChange={(e) => updateSkillItem(item.id, { name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Entry</Label>
                            <Input
                              value={item.entry}
                              onChange={(e) => updateSkillItem(item.id, { entry: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label>Source Type</Label>
                            <select
                              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-2 text-sm"
                              value={item.source.type}
                              onChange={(e) =>
                                updateSkillItem(item.id, {
                                  source: {
                                    ...item.source,
                                    type: e.target.value as SkillSourceType,
                                  },
                                })
                              }
                            >
                              <option value="local">local</option>
                              <option value="git">git</option>
                              <option value="http">http</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label>Source URI</Label>
                            <Input
                              value={item.source.uri}
                              onChange={(e) =>
                                updateSkillItem(item.id, {
                                  source: {
                                    ...item.source,
                                    uri: e.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Schedule Ref</Label>
                            <Input
                              value={item.scheduleRef ?? ""}
                              onChange={(e) =>
                                updateSkillItem(item.id, {
                                  scheduleRef: e.target.value || undefined,
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">导入来源</CardTitle>
                        <CardDescription>支持本地/Git/HTTP 来源白名单。</CardDescription>
                      </div>
                      <Button variant="default" onClick={addSkillImportSource}>
                        + 新增来源
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {settings.skillsConfig.importSources.map((item) => (
                      <div
                        key={item.name}
                        className="rounded-xl border border-[var(--border-subtle)] p-3 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <Badge>{item.type}</Badge>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={item.enabled}
                              onCheckedChange={(checked) =>
                                updateSkillImportSource(item.name, { enabled: checked })
                              }
                            />
                            <Button variant="default" onClick={() => removeSkillImportSource(item.name)}>
                              删除
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Input
                            value={item.name}
                            onChange={(e) =>
                              updateSkillImportSource(item.name, { name: e.target.value })
                            }
                            placeholder="name"
                          />
                          <select
                            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-2 text-sm"
                            value={item.type}
                            onChange={(e) =>
                              updateSkillImportSource(item.name, {
                                type: e.target.value as SkillSourceType,
                              })
                            }
                          >
                            <option value="local">local</option>
                            <option value="git">git</option>
                            <option value="http">http</option>
                          </select>
                          <Input
                            value={item.uri}
                            onChange={(e) =>
                              updateSkillImportSource(item.name, { uri: e.target.value })
                            }
                            placeholder="uri"
                          />
                        </div>
                        <Input
                          value={item.whitelistPattern ?? ""}
                          onChange={(e) =>
                            updateSkillImportSource(item.name, {
                              whitelistPattern: e.target.value || undefined,
                            })
                          }
                          placeholder="whitelist pattern"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Accordion type="single" collapsible>
                  <AccordionItem value="skills-json">
                    <AccordionTrigger>高级 JSON（Skills）</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <Textarea
                          className="min-h-[240px] font-mono text-xs"
                          value={skillsJson}
                          onChange={(e) => setSkillsJson(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button variant="default" onClick={refreshSkillsJson}>
                            刷新 JSON
                          </Button>
                          <Button variant="primary" onClick={applySkillsJsonToSettings}>
                            应用 JSON 到可视化
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </TabsContent>

            <TabsContent value="mcp">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge>MCP Clients: {mcpClientCount}</Badge>
                  <Badge>Enabled: {activeMcpCount}</Badge>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">MCP 总开关</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      控制 MCP 客户端配置是否在 apply 时生效。
                    </p>
                  </div>
                  <Switch
                    checked={settings.mcpConfig.enabled}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        mcpConfig: {
                          ...prev.mcpConfig,
                          enabled: checked,
                        },
                      }))
                    }
                  />
                </div>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">MCP Clients</CardTitle>
                        <CardDescription>支持 stdio / sse 两种 transport 配置。</CardDescription>
                      </div>
                      <Button variant="default" onClick={addMcpClient}>
                        + 新增 Client
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {settings.mcpConfig.clients.map((client) => (
                      <div
                        key={client.id}
                        className="rounded-xl border border-[var(--border-subtle)] p-3 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{client.name}</span>
                            <Badge>{client.transport}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={client.enabled}
                              onCheckedChange={(checked) =>
                                updateMcpClient(client.id, { enabled: checked })
                              }
                            />
                            <Button variant="default" onClick={() => removeMcpClient(client.id)}>
                              删除
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Input
                            value={client.id}
                            onChange={(e) => updateMcpClient(client.id, { id: e.target.value })}
                            placeholder="id"
                          />
                          <Input
                            value={client.name}
                            onChange={(e) => updateMcpClient(client.id, { name: e.target.value })}
                            placeholder="name"
                          />
                          <select
                            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-2 text-sm"
                            value={client.transport}
                            onChange={(e) =>
                              updateMcpClient(client.id, {
                                transport: e.target.value as McpTransport,
                              })
                            }
                          >
                            <option value="stdio">stdio</option>
                            <option value="sse">sse</option>
                          </select>
                        </div>
                        {client.transport === "stdio" ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input
                              value={client.command ?? ""}
                              onChange={(e) =>
                                updateMcpClient(client.id, { command: e.target.value })
                              }
                              placeholder="command"
                            />
                            <Input
                              value={client.args.join(" ")}
                              onChange={(e) =>
                                updateMcpClient(client.id, {
                                  args: e.target.value.split(" ").filter(Boolean),
                                })
                              }
                              placeholder="args (space separated)"
                            />
                          </div>
                        ) : (
                          <Input
                            value={client.endpoint ?? ""}
                            onChange={(e) =>
                              updateMcpClient(client.id, { endpoint: e.target.value })
                            }
                            placeholder="sse endpoint"
                          />
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Input
                            value={client.authRef ?? ""}
                            onChange={(e) =>
                              updateMcpClient(client.id, { authRef: e.target.value || undefined })
                            }
                            placeholder="authRef env key"
                          />
                          <Input
                            value={String(client.timeoutMs)}
                            onChange={(e) =>
                              updateMcpClient(client.id, {
                                timeoutMs: Number(e.target.value) || 30000,
                              })
                            }
                            placeholder="timeoutMs"
                          />
                          <Input
                            value={client.capabilities.join(", ")}
                            onChange={(e) =>
                              updateMcpClient(client.id, {
                                capabilities: e.target.value
                                  .split(",")
                                  .map((item) => item.trim())
                                  .filter(Boolean),
                              })
                            }
                            placeholder="capabilities,comma,separated"
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">MCP Registry</CardTitle>
                    <CardDescription>管理 installed/available 与白名单来源。</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Installed</Label>
                      {settings.mcpConfig.registry.installed.map((item) => (
                        <div key={item.name} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                          <Input
                            value={item.name}
                            onChange={(e) =>
                              updateMcpInstalled(item.name, { name: e.target.value })
                            }
                            placeholder="name"
                          />
                          <Input
                            value={item.package}
                            onChange={(e) =>
                              updateMcpInstalled(item.name, { package: e.target.value })
                            }
                            placeholder="package"
                          />
                          <select
                            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-2 text-sm"
                            value={item.transport}
                            onChange={(e) =>
                              updateMcpInstalled(item.name, {
                                transport: e.target.value as McpTransport,
                              })
                            }
                          >
                            <option value="stdio">stdio</option>
                            <option value="sse">sse</option>
                          </select>
                          <select
                            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-2 text-sm"
                            value={item.status}
                            onChange={(e) =>
                              updateMcpInstalled(item.name, {
                                status: e.target.value as "active" | "disabled",
                              })
                            }
                          >
                            <option value="active">active</option>
                            <option value="disabled">disabled</option>
                          </select>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label>Available Registry</Label>
                      {settings.mcpConfig.registry.availableRegistry.map((item) => (
                        <div key={item.name} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <Input
                            value={item.name}
                            onChange={(e) =>
                              updateMcpAvailable(item.name, { name: e.target.value })
                            }
                            placeholder="name"
                          />
                          <Input
                            value={item.package}
                            onChange={(e) =>
                              updateMcpAvailable(item.name, { package: e.target.value })
                            }
                            placeholder="package"
                          />
                          <select
                            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-2 text-sm"
                            value={item.trustLevel}
                            onChange={(e) =>
                              updateMcpAvailable(item.name, {
                                trustLevel: e.target.value as "verified" | "community" | "unverified",
                              })
                            }
                          >
                            <option value="verified">verified</option>
                            <option value="community">community</option>
                            <option value="unverified">unverified</option>
                          </select>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label>Whitelist Sources（每行一条）</Label>
                      <Textarea
                        className="min-h-[120px] font-mono text-xs"
                        value={settings.mcpConfig.registry.whitelistSources.join("\n")}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            mcpConfig: {
                              ...prev.mcpConfig,
                              registry: {
                                ...prev.mcpConfig.registry,
                                whitelistSources: e.target.value
                                  .split("\n")
                                  .map((item) => item.trim())
                                  .filter(Boolean),
                              },
                            },
                          }))
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                <Accordion type="single" collapsible>
                  <AccordionItem value="mcp-json">
                    <AccordionTrigger>高级 JSON（MCP）</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <Textarea
                          className="min-h-[240px] font-mono text-xs"
                          value={mcpJson}
                          onChange={(e) => setMcpJson(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button variant="default" onClick={refreshMcpJson}>
                            刷新 JSON
                          </Button>
                          <Button variant="primary" onClick={applyMcpJsonToSettings}>
                            应用 JSON 到可视化
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </TabsContent>

            <TabsContent value="author">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">作者风格回滚</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      将“性格设定”和“文笔风格”恢复为系统初始默认值，方便快速回滚。
                    </p>
                  </div>
                  <Button
                    variant="default"
                    onClick={() => setShowResetAuthorConfirm(true)}
                  >
                    重置为默认
                  </Button>
                </div>
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

          {showResetAuthorConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-main)] p-5 shadow-2xl">
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-[var(--text-main)]">
                    确认重置作者风格
                  </h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    此操作会将“性格设定”和“文笔风格”恢复为系统初始默认值，当前未保存的修改也会被覆盖。
                  </p>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <Button
                    variant="default"
                    onClick={() => setShowResetAuthorConfirm(false)}
                  >
                    取消
                  </Button>
                  <Button variant="primary" onClick={resetAuthorStyleToDefaults}>
                    确认重置
                  </Button>
                </div>
              </div>
            </div>
          )}
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
