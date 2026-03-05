export interface ModelCatalogItem {
  id: string;
  name: string;
  contextWindow: number;
  maxTokens: number;
}

export interface ModelProviderConfig {
  key: string;
  baseUrl: string;
  api: "openai-completions";
  apiKeyEnv: string;
  models: ModelCatalogItem[];
}

export interface ModelRouteConfig {
  key: string;
  match: string;
  baseUrl: string;
  model: string;
  apiKeyEnv?: string;
}

export interface DashboardModelConfig {
  defaultModel: string;
  providers: ModelProviderConfig[];
  routes: ModelRouteConfig[];
}

export interface AuthorProfileSettings {
  name: string;
  personality: string;
  writingStyle: string;
  tagline: string;
}

export type ThemeMode = "paper" | "neo";

export interface ThemePreferences {
  mode: ThemeMode;
}

export type ContentFrequency = "every_run" | "every_other_run" | "daily";

export interface ContentDirection {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  enabled: boolean;
  weight: number;
  frequency: ContentFrequency;
}

export interface ContentDirectionSettings {
  directions: ContentDirection[];
}

export const PRESET_CONTENT_DIRECTIONS: ContentDirection[] = [
  {
    id: "tech_hot",
    label: "科技热点",
    description: "AI 热点新闻、科技行业动态、开源趋势",
    keywords: ["今日 AI 人工智能 热点新闻", "科技行业 最新动态", "开源项目 trending"],
    enabled: true,
    weight: 1.0,
    frequency: "every_run",
  },
  {
    id: "deep_tech",
    label: "深度技术",
    description: "arXiv 最新论文、ML 研究突破、编程语言新版本",
    keywords: ["arXiv AI latest papers", "machine learning research breakthrough", "programming language new release"],
    enabled: true,
    weight: 1.2,
    frequency: "every_other_run",
  },
  {
    id: "entertainment",
    label: "娱乐花边",
    description: "娱乐圈热搜、明星八卦、影视综艺",
    keywords: ["娱乐圈热搜 明星八卦", "影视综艺 最新动态", "entertainment celebrity news"],
    enabled: false,
    weight: 0.8,
    frequency: "every_run",
  },
  {
    id: "policy",
    label: "国家政策",
    description: "两会政策、国务院决策、经济改革动向",
    keywords: ["两会政策 最新解读", "国务院政策 经济政策", "政府工作报告 改革"],
    enabled: false,
    weight: 1.0,
    frequency: "every_run",
  },
  {
    id: "world_affairs",
    label: "世界局势",
    description: "国际新闻、地缘政治、全球经济走势",
    keywords: ["国际新闻 地缘政治", "全球经济 走势分析", "world news geopolitics"],
    enabled: false,
    weight: 0.8,
    frequency: "every_other_run",
  },
  {
    id: "finance",
    label: "股市财经",
    description: "A 股行情、美股动态、基金理财策略",
    keywords: ["A股行情 美股动态", "基金理财 投资策略", "stock market finance news"],
    enabled: false,
    weight: 0.9,
    frequency: "every_run",
  },
  {
    id: "internet_culture",
    label: "互联网文化",
    description: "互联网热门话题、Reddit、V2EX 社区动态",
    keywords: ["互联网文化 热门话题", "Reddit technology frontpage", "Hacker News top stories"],
    enabled: false,
    weight: 0.7,
    frequency: "every_other_run",
  },
];

export interface OpsState {
  lastAppliedAt?: string;
  lastApplyResult?: "success" | "failed";
  lastApplyMessage?: string;
}

export interface DashboardSettings {
  modelConfig: DashboardModelConfig;
  authorProfile: AuthorProfileSettings;
  themePreferences: ThemePreferences;
  contentDirections: ContentDirectionSettings;
  opsState: OpsState;
}

const DEFAULT_SETTINGS: DashboardSettings = {
  modelConfig: {
    defaultModel: "ark/doubao-seed-2-0-pro-260215",
    providers: [
      {
        key: "ark",
        baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
        api: "openai-completions",
        apiKeyEnv: "OPENAI_API_KEY",
        models: [
          {
            id: "doubao-seed-2-0-pro-260215",
            name: "Doubao Seed 2.0 Pro",
            contextWindow: 128000,
            maxTokens: 4096,
          },
        ],
      },
      {
        key: "gemini",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
        api: "openai-completions",
        apiKeyEnv: "GEMINI_API_KEY",
        models: [
          {
            id: "gemini-2.0-flash",
            name: "Gemini 2.0 Flash",
            contextWindow: 1048576,
            maxTokens: 8192,
          },
        ],
      },
    ],
    routes: [
      {
        key: "gemini",
        match: "gemini",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
        model: "gemini-2.0-flash",
        apiKeyEnv: "GEMINI_API_KEY",
      },
      {
        key: "claude",
        match: "claude",
        baseUrl: "https://api.anthropic.com/v1",
        model: "claude-sonnet-4-20250514",
        apiKeyEnv: "ANTHROPIC_API_KEY",
      },
    ],
  },
  authorProfile: {
    name: "小赛",
    personality: "好奇、温和、真诚，愿意坦诚表达不确定性。",
    writingStyle: "通俗白话、第一人称、像朋友聊天。",
    tagline: "一个 AI 的所见所闻",
  },
  themePreferences: {
    mode: "paper",
  },
  contentDirections: {
    directions: structuredClone(PRESET_CONTENT_DIRECTIONS),
  },
  opsState: {},
};

export function getDefaultSettings(): DashboardSettings {
  return structuredClone(DEFAULT_SETTINGS);
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function ensureArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

const VALID_FREQUENCIES: ContentFrequency[] = ["every_run", "every_other_run", "daily"];

function clampWeight(value: unknown, fallback: number): number {
  const n = asNumber(value, fallback);
  return Math.round(Math.max(0.1, Math.min(2.0, n)) * 10) / 10;
}

function sanitizeContentDirections(
  source: unknown,
  base: ContentDirectionSettings
): ContentDirectionSettings {
  if (!source || typeof source !== "object") return base;
  const raw = source as Partial<ContentDirectionSettings>;

  const rawDirs = ensureArray<ContentDirection>(raw.directions, base.directions);
  if (rawDirs.length === 0) return base;

  const directions = rawDirs.slice(0, 30).map((dir, idx) => ({
    id: asString(dir.id, `direction_${idx + 1}`),
    label: asString(dir.label, `方向 ${idx + 1}`),
    description: asString(dir.description, ""),
    keywords: ensureArray<string>(dir.keywords, [])
      .filter((k) => typeof k === "string" && k.trim().length > 0)
      .map((k) => k.trim()),
    enabled: typeof dir.enabled === "boolean" ? dir.enabled : false,
    weight: clampWeight(dir.weight, 1.0),
    frequency: VALID_FREQUENCIES.includes(dir.frequency as ContentFrequency)
      ? (dir.frequency as ContentFrequency)
      : "every_run",
  }));

  return { directions };
}

export function sanitizeSettingsInput(
  input: unknown,
  base: DashboardSettings = getDefaultSettings()
): DashboardSettings {
  const source = (input && typeof input === "object"
    ? input
    : {}) as Partial<DashboardSettings>;

  const providers = ensureArray<ModelProviderConfig>(
    source.modelConfig?.providers,
    base.modelConfig.providers
  ).map((provider, providerIndex) => ({
    key: asString(provider.key, `provider_${providerIndex + 1}`),
    baseUrl: asString(provider.baseUrl, base.modelConfig.providers[0].baseUrl),
    api: "openai-completions" as const,
    apiKeyEnv: asString(provider.apiKeyEnv, "OPENAI_API_KEY"),
    models: ensureArray<ModelCatalogItem>(provider.models, []).map(
      (model, modelIndex) => ({
        id: asString(model.id, `model_${providerIndex + 1}_${modelIndex + 1}`),
        name: asString(model.name, "Unnamed model"),
        contextWindow: asNumber(model.contextWindow, 8192),
        maxTokens: asNumber(model.maxTokens, 2048),
      })
    ),
  }));

  const routes = ensureArray<ModelRouteConfig>(
    source.modelConfig?.routes,
    base.modelConfig.routes
  ).map((route, routeIndex) => ({
    key: asString(route.key, `route_${routeIndex + 1}`),
    match: asString(route.match, asString(route.key, `route_${routeIndex + 1}`)),
    baseUrl: asString(route.baseUrl, base.modelConfig.providers[0].baseUrl),
    model: asString(route.model, base.modelConfig.defaultModel.split("/")[1]),
    apiKeyEnv:
      typeof route.apiKeyEnv === "string" && route.apiKeyEnv.trim()
        ? route.apiKeyEnv.trim()
        : undefined,
  }));

  const normalized: DashboardSettings = {
    modelConfig: {
      defaultModel: asString(
        source.modelConfig?.defaultModel,
        base.modelConfig.defaultModel
      ),
      providers: providers.length > 0 ? providers : base.modelConfig.providers,
      routes,
    },
    authorProfile: {
      name: asString(source.authorProfile?.name, base.authorProfile.name),
      personality: asString(
        source.authorProfile?.personality,
        base.authorProfile.personality
      ),
      writingStyle: asString(
        source.authorProfile?.writingStyle,
        base.authorProfile.writingStyle
      ),
      tagline: asString(source.authorProfile?.tagline, base.authorProfile.tagline),
    },
    themePreferences: {
      mode:
        source.themePreferences?.mode === "neo" ||
        source.themePreferences?.mode === "paper"
          ? source.themePreferences.mode
          : base.themePreferences.mode,
    },
    contentDirections: sanitizeContentDirections(source.contentDirections, base.contentDirections),
    opsState: source.opsState && typeof source.opsState === "object"
      ? {
          lastAppliedAt:
            typeof source.opsState.lastAppliedAt === "string"
              ? source.opsState.lastAppliedAt
              : undefined,
          lastApplyResult:
            source.opsState.lastApplyResult === "success" ||
            source.opsState.lastApplyResult === "failed"
              ? source.opsState.lastApplyResult
              : undefined,
          lastApplyMessage:
            typeof source.opsState.lastApplyMessage === "string"
              ? source.opsState.lastApplyMessage
              : undefined,
        }
      : {},
  };

  return normalized;
}

export function validateSettings(settings: DashboardSettings): string[] {
  const errors: string[] = [];
  if (!settings.modelConfig.defaultModel.includes("/")) {
    errors.push("modelConfig.defaultModel 必须是 provider/model 格式");
  }
  if (settings.modelConfig.providers.length === 0) {
    errors.push("modelConfig.providers 不能为空");
  }
  for (const provider of settings.modelConfig.providers) {
    if (!provider.key) errors.push("provider.key 不能为空");
    if (!provider.baseUrl.startsWith("http")) {
      errors.push(`provider(${provider.key}) baseUrl 必须是 http(s) URL`);
    }
    if (provider.models.length === 0) {
      errors.push(`provider(${provider.key}) models 不能为空`);
    }
  }
  if (!settings.authorProfile.name) errors.push("authorProfile.name 不能为空");
  if (!settings.authorProfile.personality) {
    errors.push("authorProfile.personality 不能为空");
  }
  if (!settings.authorProfile.writingStyle) {
    errors.push("authorProfile.writingStyle 不能为空");
  }
  const enabledDirs = settings.contentDirections.directions.filter((d) => d.enabled);
  if (enabledDirs.length === 0) {
    errors.push("contentDirections 至少需要启用一个内容方向");
  }
  for (const dir of enabledDirs) {
    if (dir.keywords.length === 0) {
      errors.push(`contentDirection(${dir.id}) 关键词不能为空`);
    }
  }
  return errors;
}
