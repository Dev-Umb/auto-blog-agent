import type { DashboardSettings } from "@/lib/settings-config";

export interface LlmProxyRouteRecord {
  baseUrl: string;
  model: string;
  apiKeyEnv?: string;
  match: string;
}

export function applySettingsToOpenClaw(
  rawOpenClawConfig: unknown,
  settings: DashboardSettings
) {
  const source =
    rawOpenClawConfig && typeof rawOpenClawConfig === "object"
      ? (rawOpenClawConfig as Record<string, unknown>)
      : {};

  const providers = Object.fromEntries(
    settings.modelConfig.providers.map((provider) => [
      provider.key,
      {
        baseUrl: provider.baseUrl,
        api: provider.api,
        apiKey: `\${${provider.apiKeyEnv}}`,
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
  settings.modelConfig.routes.forEach((route) => {
    routes[route.key.toLowerCase()] = {
      baseUrl: route.baseUrl,
      model: route.model,
      apiKeyEnv: route.apiKeyEnv,
      match: route.match.toLowerCase(),
    };
  });
  return { routes };
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
  existingYaml?: string
): string {
  const groups = buildSearchGroups(settings);

  const lines: string[] = [
    "# Multi-source configuration for the Explore Cycle",
    "# search_groups are managed by Dashboard settings — do not edit manually.",
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

  const staticSections = extractStaticSections(existingYaml);
  if (staticSections) {
    lines.push(staticSections);
  }

  return lines.join("\n");
}

function extractStaticSections(yaml?: string): string | null {
  if (!yaml) return null;

  const sectionHeaders = ["rss_feeds:", "curated_urls:", "value_scoring:", "source_health:"];
  let earliest = -1;

  for (const header of sectionHeaders) {
    const idx = yaml.indexOf(header);
    if (idx !== -1 && (earliest === -1 || idx < earliest)) {
      earliest = idx;
    }
  }

  if (earliest === -1) return null;
  return yaml.slice(earliest).trimEnd();
}
