export interface ModelCatalogItem {
  id: string;
  name: string;
  contextWindow: number;
  maxTokens: number;
}

export interface ModelProviderConfig {
  key: string;
  enabled: boolean;
  baseUrl: string;
  api: "openai-completions";
  apiKey?: string;
  apiKeyEnv?: string;
  models: ModelCatalogItem[];
}

export interface ModelRouteConfig {
  key: string;
  match: string;
  baseUrl: string;
  model: string;
  apiKey?: string;
  apiKeyEnv?: string;
}

export interface DashboardModelConfig {
  activeProvider: string;
  activeModel: string;
  defaultModel: string;
  providers: ModelProviderConfig[];
  routes: ModelRouteConfig[];
}

export type SkillSourceType = "local" | "git" | "http";

export interface SkillSourceConfig {
  type: SkillSourceType;
  uri: string;
  version?: string;
  trustLevel?: "trusted" | "unverified";
}

export interface SkillItemConfig {
  id: string;
  name: string;
  enabled: boolean;
  entry: string;
  scheduleRef?: string;
  source: SkillSourceConfig;
}

export interface SkillImportSource {
  name: string;
  type: SkillSourceType;
  uri: string;
  enabled: boolean;
  whitelistPattern?: string;
}

export interface SkillsConfig {
  items: SkillItemConfig[];
  importSources: SkillImportSource[];
  activeSkills: string[];
  lastSyncAt?: string;
}

export type McpTransport = "stdio" | "sse";

export interface McpClientConfig {
  id: string;
  name: string;
  enabled: boolean;
  transport: McpTransport;
  endpoint?: string;
  command?: string;
  args: string[];
  env: Record<string, string>;
  capabilities: string[];
  timeoutMs: number;
  authRef?: string;
}

export interface McpRegistryInstalledItem {
  name: string;
  package: string;
  transport: McpTransport;
  installedAt: string;
  status: "active" | "disabled";
}

export interface McpRegistryAvailableItem {
  name: string;
  description: string;
  package: string;
  trustLevel: "verified" | "community" | "unverified";
}

export interface McpRegistryConfig {
  installed: McpRegistryInstalledItem[];
  availableRegistry: McpRegistryAvailableItem[];
  whitelistSources: string[];
}

export interface McpConfig {
  enabled: boolean;
  clients: McpClientConfig[];
  registry: McpRegistryConfig;
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
  skillsConfig: SkillsConfig;
  mcpConfig: McpConfig;
  authorProfile: AuthorProfileSettings;
  themePreferences: ThemePreferences;
  contentDirections: ContentDirectionSettings;
  opsState: OpsState;
}

const DEFAULT_SETTINGS: DashboardSettings = {
  modelConfig: {
    activeProvider: "ark",
    activeModel: "doubao-seed-2-0-pro-260215",
    defaultModel: "ark/doubao-seed-2-0-pro-260215",
    providers: [
      {
        key: "ark",
        enabled: true,
        baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
        api: "openai-completions",
        apiKey: "",
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
        enabled: true,
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
        api: "openai-completions",
        apiKey: "",
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
        apiKey: "",
        apiKeyEnv: "GEMINI_API_KEY",
      },
      {
        key: "claude",
        match: "claude",
        baseUrl: "https://api.anthropic.com/v1",
        model: "claude-sonnet-4-20250514",
        apiKey: "",
        apiKeyEnv: "ANTHROPIC_API_KEY",
      },
    ],
  },
  skillsConfig: {
    items: [
      {
        id: "blog-explore",
        name: "Explore Cycle",
        enabled: true,
        entry: "SKILL.md",
        scheduleRef: "explore",
        source: {
          type: "local",
          uri: "skills/blog-explore",
          trustLevel: "trusted",
        },
      },
      {
        id: "blog-write",
        name: "Write Cycle",
        enabled: true,
        entry: "SKILL.md",
        scheduleRef: "write",
        source: {
          type: "local",
          uri: "skills/blog-write",
          trustLevel: "trusted",
        },
      },
      {
        id: "blog-interact",
        name: "Interact Cycle",
        enabled: true,
        entry: "SKILL.md",
        scheduleRef: "interact",
        source: {
          type: "local",
          uri: "skills/blog-interact",
          trustLevel: "trusted",
        },
      },
      {
        id: "blog-reflect",
        name: "Reflect Cycle",
        enabled: true,
        entry: "SKILL.md",
        scheduleRef: "reflect",
        source: {
          type: "local",
          uri: "skills/blog-reflect",
          trustLevel: "trusted",
        },
      },
      {
        id: "blog-api",
        name: "Blog API",
        enabled: true,
        entry: "SKILL.md",
        source: {
          type: "local",
          uri: "skills/blog-api",
          trustLevel: "trusted",
        },
      },
    ],
    importSources: [
      {
        name: "GitHub Skills",
        type: "git",
        uri: "https://github.com",
        enabled: true,
        whitelistPattern: "https://github.com/**",
      },
      {
        name: "Local Workspace Skills",
        type: "local",
        uri: "skills/",
        enabled: true,
        whitelistPattern: "skills/**",
      },
    ],
    activeSkills: [
      "blog-explore",
      "blog-write",
      "blog-interact",
      "blog-reflect",
      "blog-api",
    ],
  },
  mcpConfig: {
    enabled: false,
    clients: [
      {
        id: "tavily-search",
        name: "Tavily Search",
        enabled: false,
        transport: "stdio",
        command: "npx",
        args: ["-y", "@anthropic/tavily-mcp-server"],
        env: {
          TAVILY_API_KEY: "TAVILY_API_KEY",
        },
        capabilities: ["search", "web"],
        timeoutMs: 30000,
        authRef: "TAVILY_API_KEY",
      },
      {
        id: "firecrawl",
        name: "Firecrawl",
        enabled: false,
        transport: "stdio",
        command: "npx",
        args: ["-y", "@anthropic/firecrawl-mcp-server"],
        env: {
          FIRECRAWL_API_KEY: "FIRECRAWL_API_KEY",
        },
        capabilities: ["scrape", "crawl"],
        timeoutMs: 30000,
        authRef: "FIRECRAWL_API_KEY",
      },
    ],
    registry: {
      installed: [
        {
          name: "tavily-search",
          package: "@anthropic/tavily-mcp-server",
          transport: "stdio",
          installedAt: "2026-03-01T00:00:00.000Z",
          status: "disabled",
        },
        {
          name: "firecrawl",
          package: "@anthropic/firecrawl-mcp-server",
          transport: "stdio",
          installedAt: "2026-03-01T00:00:00.000Z",
          status: "disabled",
        },
      ],
      availableRegistry: [
        {
          name: "code-sandbox",
          description: "在沙箱中执行代码片段",
          package: "@mcp/code-sandbox-server",
          trustLevel: "verified",
        },
        {
          name: "image-generation",
          description: "生成文章配图",
          package: "@mcp/image-gen-server",
          trustLevel: "verified",
        },
      ],
      whitelistSources: [
        "npm:@anthropic/*",
        "npm:@mcp/*",
        "docker:ghcr.io/mcp-servers/*",
      ],
    },
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

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

const VALID_FREQUENCIES: ContentFrequency[] = ["every_run", "every_other_run", "daily"];
const VALID_SKILL_SOURCE_TYPES: SkillSourceType[] = ["local", "git", "http"];
const VALID_MCP_TRANSPORTS: McpTransport[] = ["stdio", "sse"];

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
    enabled: asBoolean(provider.enabled, true),
    baseUrl: asString(provider.baseUrl, base.modelConfig.providers[0].baseUrl),
    api: "openai-completions" as const,
    apiKey:
      typeof provider.apiKey === "string" && provider.apiKey.trim()
        ? provider.apiKey.trim()
        : undefined,
    apiKeyEnv:
      typeof provider.apiKeyEnv === "string" && provider.apiKeyEnv.trim()
        ? provider.apiKeyEnv.trim()
        : undefined,
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
    apiKey:
      typeof route.apiKey === "string" && route.apiKey.trim()
        ? route.apiKey.trim()
        : undefined,
    apiKeyEnv:
      typeof route.apiKeyEnv === "string" && route.apiKeyEnv.trim()
        ? route.apiKeyEnv.trim()
        : undefined,
  }));

  const fallbackDefaultModel = asString(
    source.modelConfig?.defaultModel,
    base.modelConfig.defaultModel
  );
  const [fallbackProvider, fallbackModel] = fallbackDefaultModel.includes("/")
    ? fallbackDefaultModel.split("/", 2)
    : [base.modelConfig.activeProvider, base.modelConfig.activeModel];
  const activeProvider = asString(source.modelConfig?.activeProvider, fallbackProvider);
  const activeModel = asString(source.modelConfig?.activeModel, fallbackModel);
  const normalizedDefaultModel = `${activeProvider}/${activeModel}`;

  const skillItems = ensureArray<SkillItemConfig>(
    source.skillsConfig?.items,
    base.skillsConfig.items
  )
    .slice(0, 100)
    .map((item, index) => {
      const sourceCfg: Record<string, unknown> = isObjectRecord(item.source)
        ? item.source
        : {};
      const sourceType = VALID_SKILL_SOURCE_TYPES.includes(
        sourceCfg.type as SkillSourceType
      )
        ? (sourceCfg.type as SkillSourceType)
        : "local";
      const trustLevel: SkillSourceConfig["trustLevel"] =
        sourceCfg.trustLevel === "trusted" || sourceCfg.trustLevel === "unverified"
          ? (sourceCfg.trustLevel as SkillSourceConfig["trustLevel"])
          : undefined;
      return {
        id: asString(item.id, `skill_${index + 1}`),
        name: asString(item.name, `Skill ${index + 1}`),
        enabled: asBoolean(item.enabled, true),
        entry: asString(item.entry, "SKILL.md"),
        scheduleRef:
          typeof item.scheduleRef === "string" && item.scheduleRef.trim()
            ? item.scheduleRef.trim()
            : undefined,
        source: {
          type: sourceType,
          uri: asString(sourceCfg.uri, "skills/"),
          version:
            typeof sourceCfg.version === "string" && sourceCfg.version.trim()
              ? sourceCfg.version.trim()
              : undefined,
          trustLevel,
        },
      };
    });

  const importSources = ensureArray<SkillImportSource>(
    source.skillsConfig?.importSources,
    base.skillsConfig.importSources
  )
    .slice(0, 50)
    .map((item, index) => {
      const importType = VALID_SKILL_SOURCE_TYPES.includes(item.type as SkillSourceType)
        ? (item.type as SkillSourceType)
        : "local";
      return {
        name: asString(item.name, `import_source_${index + 1}`),
        type: importType,
        uri: asString(item.uri, "skills/"),
        enabled: asBoolean(item.enabled, true),
        whitelistPattern:
          typeof item.whitelistPattern === "string" && item.whitelistPattern.trim()
            ? item.whitelistPattern.trim()
            : undefined,
      };
    });

  const explicitActiveSkills = ensureArray<string>(
    source.skillsConfig?.activeSkills,
    []
  )
    .filter((item) => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
  const computedActiveSkills = skillItems.filter((item) => item.enabled).map((item) => item.id);
  const activeSkills =
    explicitActiveSkills.length > 0
      ? Array.from(new Set(explicitActiveSkills))
      : computedActiveSkills;

  const mcpClients = ensureArray<McpClientConfig>(
    source.mcpConfig?.clients,
    base.mcpConfig.clients
  )
    .slice(0, 100)
    .map((client, index) => {
      const transport = VALID_MCP_TRANSPORTS.includes(client.transport as McpTransport)
        ? (client.transport as McpTransport)
        : "stdio";
      const env = isObjectRecord(client.env)
        ? Object.fromEntries(
            Object.entries(client.env).filter(
              ([k, v]) => typeof k === "string" && typeof v === "string"
            )
          )
        : {};
      return {
        id: asString(client.id, `mcp_client_${index + 1}`),
        name: asString(client.name, `MCP Client ${index + 1}`),
        enabled: asBoolean(client.enabled, true),
        transport,
        endpoint:
          typeof client.endpoint === "string" && client.endpoint.trim()
            ? client.endpoint.trim()
            : undefined,
        command:
          typeof client.command === "string" && client.command.trim()
            ? client.command.trim()
            : undefined,
        args: ensureArray<string>(client.args, [])
          .filter((arg) => typeof arg === "string" && arg.trim().length > 0)
          .map((arg) => arg.trim()),
        env,
        capabilities: ensureArray<string>(client.capabilities, [])
          .filter((cap) => typeof cap === "string" && cap.trim().length > 0)
          .map((cap) => cap.trim()),
        timeoutMs: Math.max(1000, asNumber(client.timeoutMs, 30000)),
        authRef:
          typeof client.authRef === "string" && client.authRef.trim()
            ? client.authRef.trim()
            : undefined,
      };
    });

  const mcpRegistryInstalled = ensureArray<McpRegistryInstalledItem>(
    source.mcpConfig?.registry?.installed,
    base.mcpConfig.registry.installed
  )
    .slice(0, 200)
    .map((item, index) => ({
      name: asString(item.name, `mcp_installed_${index + 1}`),
      package: asString(item.package, ""),
      transport: VALID_MCP_TRANSPORTS.includes(item.transport as McpTransport)
        ? (item.transport as McpTransport)
        : "stdio",
      installedAt:
        typeof item.installedAt === "string" && item.installedAt.trim()
          ? item.installedAt.trim()
          : new Date(0).toISOString(),
      status: item.status === "active" || item.status === "disabled" ? item.status : "disabled",
    }));

  const mcpRegistryAvailable = ensureArray<McpRegistryAvailableItem>(
    source.mcpConfig?.registry?.availableRegistry,
    base.mcpConfig.registry.availableRegistry
  )
    .slice(0, 500)
    .map((item, index) => ({
      name: asString(item.name, `mcp_available_${index + 1}`),
      description: asString(item.description, ""),
      package: asString(item.package, ""),
      trustLevel:
        item.trustLevel === "verified" ||
        item.trustLevel === "community" ||
        item.trustLevel === "unverified"
          ? item.trustLevel
          : "unverified",
    }));

  const mcpWhitelistSources = ensureArray<string>(
    source.mcpConfig?.registry?.whitelistSources,
    base.mcpConfig.registry.whitelistSources
  )
    .filter((item) => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());

  const normalized: DashboardSettings = {
    modelConfig: {
      activeProvider,
      activeModel,
      defaultModel: normalizedDefaultModel,
      providers: providers.length > 0 ? providers : base.modelConfig.providers,
      routes,
    },
    skillsConfig: {
      items: skillItems.length > 0 ? skillItems : base.skillsConfig.items,
      importSources,
      activeSkills,
      lastSyncAt:
        typeof source.skillsConfig?.lastSyncAt === "string" &&
        source.skillsConfig.lastSyncAt.trim()
          ? source.skillsConfig.lastSyncAt.trim()
          : undefined,
    },
    mcpConfig: {
      enabled: asBoolean(source.mcpConfig?.enabled, base.mcpConfig.enabled),
      clients: mcpClients,
      registry: {
        installed: mcpRegistryInstalled,
        availableRegistry: mcpRegistryAvailable,
        whitelistSources: mcpWhitelistSources,
      },
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
  if (!settings.modelConfig.activeProvider) {
    errors.push("modelConfig.activeProvider 不能为空");
  }
  if (!settings.modelConfig.activeModel) {
    errors.push("modelConfig.activeModel 不能为空");
  }
  if (settings.modelConfig.providers.length === 0) {
    errors.push("modelConfig.providers 不能为空");
  }
  const providerKeys = new Set<string>();
  for (const provider of settings.modelConfig.providers) {
    if (!provider.key) errors.push("provider.key 不能为空");
    if (provider.key && providerKeys.has(provider.key)) {
      errors.push(`provider.key 重复: ${provider.key}`);
    }
    providerKeys.add(provider.key);
    if (!provider.baseUrl.startsWith("http")) {
      errors.push(`provider(${provider.key}) baseUrl 必须是 http(s) URL`);
    }
    if (!provider.apiKey && !provider.apiKeyEnv) {
      errors.push(`provider(${provider.key}) 需要提供 apiKey 或 apiKeyEnv`);
    }
    if (provider.models.length === 0) {
      errors.push(`provider(${provider.key}) models 不能为空`);
    }
  }
  if (!providerKeys.has(settings.modelConfig.activeProvider)) {
    errors.push("modelConfig.activeProvider 必须存在于 providers");
  } else {
    const activeProvider = settings.modelConfig.providers.find(
      (provider) => provider.key === settings.modelConfig.activeProvider
    );
    const modelExists = activeProvider?.models.some(
      (model) => model.id === settings.modelConfig.activeModel
    );
    if (!modelExists) {
      errors.push("modelConfig.activeModel 必须存在于 activeProvider 的 models");
    }
  }

  const skillIds = new Set<string>();
  for (const item of settings.skillsConfig.items) {
    if (!item.id) errors.push("skillsConfig.items[].id 不能为空");
    if (!item.name) errors.push(`skillsConfig.item(${item.id || "unknown"}) name 不能为空`);
    if (!item.source.uri) errors.push(`skillsConfig.item(${item.id || "unknown"}) source.uri 不能为空`);
    if (item.id && skillIds.has(item.id)) {
      errors.push(`skillsConfig.items 存在重复 id: ${item.id}`);
    }
    skillIds.add(item.id);
    if (!VALID_SKILL_SOURCE_TYPES.includes(item.source.type)) {
      errors.push(`skillsConfig.item(${item.id || "unknown"}) source.type 无效`);
    }
  }
  for (const activeSkill of settings.skillsConfig.activeSkills) {
    if (!skillIds.has(activeSkill)) {
      errors.push(`skillsConfig.activeSkills 包含不存在的 skill: ${activeSkill}`);
    }
  }
  for (const importSource of settings.skillsConfig.importSources) {
    if (!importSource.name) errors.push("skillsConfig.importSources[].name 不能为空");
    if (!importSource.uri) errors.push(`skillsConfig.importSource(${importSource.name}) uri 不能为空`);
    if (!VALID_SKILL_SOURCE_TYPES.includes(importSource.type)) {
      errors.push(`skillsConfig.importSource(${importSource.name}) type 无效`);
    }
  }

  const ENV_KEY_REGEX = /^[A-Z][A-Z0-9_]*$/;
  for (const client of settings.mcpConfig.clients) {
    if (!client.id) errors.push("mcpConfig.clients[].id 不能为空");
    if (!client.name) errors.push(`mcpConfig.client(${client.id || "unknown"}) name 不能为空`);
    if (!VALID_MCP_TRANSPORTS.includes(client.transport)) {
      errors.push(`mcpConfig.client(${client.id || "unknown"}) transport 无效`);
      continue;
    }
    if (client.transport === "stdio" && !client.command) {
      errors.push(`mcpConfig.client(${client.id || "unknown"}) transport=stdio 时 command 必填`);
    }
    if (client.transport === "sse") {
      if (!client.endpoint) {
        errors.push(`mcpConfig.client(${client.id || "unknown"}) transport=sse 时 endpoint 必填`);
      } else if (!client.endpoint.startsWith("http")) {
        errors.push(`mcpConfig.client(${client.id || "unknown"}) endpoint 必须是 http(s) URL`);
      }
    }
    if (!Number.isFinite(client.timeoutMs) || client.timeoutMs < 1000) {
      errors.push(`mcpConfig.client(${client.id || "unknown"}) timeoutMs 必须 >= 1000`);
    }
    for (const [envName, envRef] of Object.entries(client.env)) {
      if (!ENV_KEY_REGEX.test(envName)) {
        errors.push(`mcpConfig.client(${client.id || "unknown"}) env key 非法: ${envName}`);
      }
      if (!ENV_KEY_REGEX.test(envRef)) {
        errors.push(`mcpConfig.client(${client.id || "unknown"}) env value 非法: ${envRef}`);
      }
    }
    if (client.authRef && !ENV_KEY_REGEX.test(client.authRef)) {
      errors.push(`mcpConfig.client(${client.id || "unknown"}) authRef 必须是环境变量名`);
    }
  }
  for (const source of settings.mcpConfig.registry.whitelistSources) {
    if (!source.trim()) {
      errors.push("mcpConfig.registry.whitelistSources 不能包含空项");
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
