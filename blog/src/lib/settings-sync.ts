import type { DashboardSettings } from "@/lib/settings-config";

export interface LlmProxyRouteRecord {
  baseUrl: string;
  model: string;
  apiKey?: string;
  apiKeyEnv?: string;
  match: string;
}

export interface SkillsRegistryRecord {
  generatedAt: string;
  activeSkills: string[];
  items: Array<{
    id: string;
    name: string;
    enabled: boolean;
    entry: string;
    scheduleRef?: string;
    source: {
      type: string;
      uri: string;
      version?: string;
      trustLevel?: string;
    };
  }>;
  importSources: Array<{
    name: string;
    type: string;
    uri: string;
    enabled: boolean;
    whitelistPattern?: string;
  }>;
  lastSyncAt?: string;
}

export interface McpClientsConfigRecord {
  enabled: boolean;
  generatedAt: string;
  clients: Array<{
    id: string;
    name: string;
    enabled: boolean;
    transport: string;
    endpoint?: string;
    command?: string;
    args: string[];
    env: Record<string, string>;
    capabilities: string[];
    timeoutMs: number;
    authRef?: string;
  }>;
}

export interface McpRegistryRecord {
  generatedAt: string;
  installed: Array<{
    name: string;
    package: string;
    transport: string;
    installed_at: string;
    status: string;
  }>;
  available_registry: Array<{
    name: string;
    description: string;
    package: string;
    trust_level: string;
  }>;
  whitelist_sources: string[];
}

export function applySettingsToOpenClaw(
  rawOpenClawConfig: unknown,
  settings: DashboardSettings
) {
  const llmProxyUrl =
    process.env.LLM_PROXY_INTERNAL_URL || "http://llm-proxy:4010/api/v3";

  const source =
    rawOpenClawConfig && typeof rawOpenClawConfig === "object"
      ? (rawOpenClawConfig as Record<string, unknown>)
      : {};

  const providers = Object.fromEntries(
    settings.modelConfig.providers.map((provider) => [
      provider.key,
      {
        baseUrl: llmProxyUrl,
        api: provider.api,
        apiKey: "proxy-managed",
        models: provider.models.map((model) => ({
          id: model.id,
          name: model.name,
          contextWindow: model.contextWindow,
          maxTokens: model.maxTokens,
        })),
      },
    ])
  );

  const existingAgents =
    source.agents && typeof source.agents === "object"
      ? (source.agents as Record<string, unknown>)
      : {};
  const existingDefaults =
    existingAgents.defaults && typeof existingAgents.defaults === "object"
      ? (existingAgents.defaults as Record<string, unknown>)
      : {};

  return {
    ...source,
    models: {
      ...(source.models && typeof source.models === "object"
        ? (source.models as Record<string, unknown>)
        : {}),
      providers,
    },
    agents: {
      ...existingAgents,
      defaults: {
        ...existingDefaults,
        model: settings.modelConfig.defaultModel,
      },
    },
  };
}

export function buildLlmProxyRoutes(settings: DashboardSettings) {
  const routes: Record<string, LlmProxyRouteRecord> = {};

  const activeProvider = settings.modelConfig.providers.find(
    (provider) => provider.key === settings.modelConfig.activeProvider
  );
  if (activeProvider) {
    routes.default = {
      baseUrl: activeProvider.baseUrl,
      model: settings.modelConfig.activeModel,
      apiKey: activeProvider.apiKey,
      apiKeyEnv: activeProvider.apiKeyEnv,
      match: "default",
    };
  }

  settings.modelConfig.providers
    .filter((provider) => provider.enabled)
    .forEach((provider) => {
      const model =
        provider.key === settings.modelConfig.activeProvider
          ? settings.modelConfig.activeModel
          : provider.models[0]?.id || settings.modelConfig.activeModel;
      routes[provider.key.toLowerCase()] = {
        baseUrl: provider.baseUrl,
        model,
        apiKey: provider.apiKey,
        apiKeyEnv: provider.apiKeyEnv,
        match: provider.key.toLowerCase(),
      };
    });

  if (!routes.default) {
    const first = settings.modelConfig.providers[0];
    if (first) {
      routes.default = {
        baseUrl: first.baseUrl,
        model: first.models[0]?.id || settings.modelConfig.activeModel,
        apiKey: first.apiKey,
        apiKeyEnv: first.apiKeyEnv,
        match: "default",
      };
    }
  }
  return { routes };
}

export function buildSkillsRegistry(settings: DashboardSettings): SkillsRegistryRecord {
  return {
    generatedAt: new Date().toISOString(),
    activeSkills: settings.skillsConfig.items
      .filter((item) => item.enabled)
      .map((item) => item.id),
    items: settings.skillsConfig.items.map((item) => ({
      id: item.id,
      name: item.name,
      enabled: item.enabled,
      entry: item.entry,
      scheduleRef: item.scheduleRef,
      source: {
        type: item.source.type,
        uri: item.source.uri,
        version: item.source.version,
        trustLevel: item.source.trustLevel,
      },
    })),
    importSources: settings.skillsConfig.importSources.map((source) => ({
      name: source.name,
      type: source.type,
      uri: source.uri,
      enabled: source.enabled,
      whitelistPattern: source.whitelistPattern,
    })),
    lastSyncAt: settings.skillsConfig.lastSyncAt,
  };
}

export function buildMcpClientsConfig(settings: DashboardSettings): McpClientsConfigRecord {
  return {
    enabled: settings.mcpConfig.enabled,
    generatedAt: new Date().toISOString(),
    clients: settings.mcpConfig.clients.map((client) => ({
      id: client.id,
      name: client.name,
      enabled: client.enabled,
      transport: client.transport,
      endpoint: client.endpoint,
      command: client.command,
      args: [...client.args],
      env: { ...client.env },
      capabilities: [...client.capabilities],
      timeoutMs: client.timeoutMs,
      authRef: client.authRef,
    })),
  };
}

export function buildMcpRegistry(settings: DashboardSettings): McpRegistryRecord {
  return {
    generatedAt: new Date().toISOString(),
    installed: settings.mcpConfig.registry.installed.map((item) => ({
      name: item.name,
      package: item.package,
      transport: item.transport,
      installed_at: item.installedAt,
      status: item.status,
    })),
    available_registry: settings.mcpConfig.registry.availableRegistry.map((item) => ({
      name: item.name,
      description: item.description,
      package: item.package,
      trust_level: item.trustLevel,
    })),
    whitelist_sources: [...settings.mcpConfig.registry.whitelistSources],
  };
}

function yamlEscape(str: string): string {
  return str.replace(/"/g, '\\"');
}

export function buildPersonaYaml(settings: DashboardSettings) {
  const lines = [
    "identity:",
    `  name: "${yamlEscape(settings.authorProfile.name)}"`,
    `  self_description: "${yamlEscape(settings.authorProfile.personality)}"`,
    "writing_style:",
    `  tone: "${yamlEscape(settings.authorProfile.writingStyle)}"`,
    '  perspective: "first_person"',
    '  language: "zh-CN"',
  ];

  const enabled = settings.contentDirections.directions.filter((d) => d.enabled);
  if (enabled.length > 0) {
    lines.push("content_focus:");
    lines.push("  directions:");
    for (const dir of enabled) {
      lines.push(`    - "${yamlEscape(dir.label)}: ${yamlEscape(dir.description)}"`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

export interface SourcesYamlSearchGroup {
  name: string;
  description: string;
  queries: string[];
  frequency: string;
  weight: number;
}

export function buildSearchGroups(settings: DashboardSettings): SourcesYamlSearchGroup[] {
  return settings.contentDirections.directions
    .filter((d) => d.enabled && d.keywords.length > 0)
    .map((dir) => ({
      name: dir.id,
      description: dir.description,
      queries: [...dir.keywords],
      frequency: dir.frequency,
      weight: dir.weight,
    }));
}

export function buildSourcesYaml(
  settings: DashboardSettings,
  _existingYaml?: string
): string {
  const groups = buildSearchGroups(settings);
  const enabledDirs = settings.contentDirections.directions.filter((d) => d.enabled);

  const lines: string[] = [
    "# Multi-source configuration for the Explore Cycle",
    "# Fully managed by Dashboard settings — do not edit manually.",
    "",
    "search_groups:",
  ];

  for (const group of groups) {
    lines.push(`  - name: "${yamlEscape(group.name)}"`);
    lines.push(`    description: "${yamlEscape(group.description)}"`);
    lines.push("    queries:");
    for (const q of group.queries) {
      lines.push(`      - "${yamlEscape(q)}"`);
    }
    lines.push(`    frequency: "${group.frequency}"`);
    lines.push(`    weight: ${group.weight}`);
    lines.push("");
  }

  const seenRssUrls = new Set<string>();
  const rssItems: { name: string; url: string; category: string; frequency: string; maxItems: number }[] = [];
  for (const dir of enabledDirs) {
    for (const rss of dir.rssSources) {
      if (!seenRssUrls.has(rss.url)) {
        seenRssUrls.add(rss.url);
        rssItems.push({
          name: rss.name,
          url: rss.url,
          category: dir.id,
          frequency: dir.frequency,
          maxItems: rss.maxItems,
        });
      }
    }
  }

  lines.push("rss_feeds:");
  if (rssItems.length === 0) {
    lines.push("  []");
  } else {
    for (const item of rssItems) {
      lines.push(`  - name: "${yamlEscape(item.name)}"`);
      lines.push(`    url: "${yamlEscape(item.url)}"`);
      lines.push(`    category: "${yamlEscape(item.category)}"`);
      lines.push(`    fetch_frequency: "${item.frequency}"`);
      lines.push(`    max_items: ${item.maxItems}`);
      lines.push(`    reliability: 0.85`);
      lines.push("");
    }
  }

  const seenCuratedUrls = new Set<string>();
  const curatedItems: { name: string; url: string; category: string; frequency: string; description: string }[] = [];
  for (const dir of enabledDirs) {
    for (const cu of dir.curatedUrls) {
      if (!seenCuratedUrls.has(cu.url)) {
        seenCuratedUrls.add(cu.url);
        curatedItems.push({
          name: cu.name,
          url: cu.url,
          category: dir.id,
          frequency: dir.frequency,
          description: cu.description,
        });
      }
    }
  }

  lines.push("curated_urls:");
  if (curatedItems.length === 0) {
    lines.push("  []");
  } else {
    for (const item of curatedItems) {
      lines.push(`  - name: "${yamlEscape(item.name)}"`);
      lines.push(`    url: "${yamlEscape(item.url)}"`);
      lines.push(`    category: "${yamlEscape(item.category)}"`);
      lines.push(`    fetch_frequency: "${item.frequency}"`);
      lines.push(`    description: "${yamlEscape(item.description)}"`);
      lines.push("");
    }
  }

  lines.push("value_scoring:");
  lines.push("  weights:");
  lines.push("    timeliness: 2.0");
  lines.push("    impact: 2.0");
  lines.push("    depth_potential: 1.5");
  lines.push("    uniqueness: 1.5");
  lines.push("    relevance: 1.0");
  lines.push("");
  lines.push("  thresholds:");
  lines.push("    write_queue: 20");
  lines.push("    store_memory: 10");
  lines.push("    dismiss: 10");
  lines.push("");
  lines.push("source_health:");
  lines.push("  check_interval_hours: 24");
  lines.push("  max_consecutive_failures: 3");
  lines.push('  fallback_strategy: "skip_and_log"');

  return lines.join("\n");
}
