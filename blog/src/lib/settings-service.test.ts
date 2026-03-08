import { describe, expect, it } from "vitest";
import {
  applySettingsToOpenClaw,
  buildMcpClientsConfig,
  buildMcpRegistry,
  buildLlmProxyRoutes,
  buildPersonaYaml,
  buildSearchGroups,
  buildSkillsRegistry,
  buildSourcesYaml,
} from "@/lib/settings-sync";
import { getDefaultSettings } from "@/lib/settings-config";

describe("settings-service transforms", () => {
  it("applies model providers/default model to openclaw config", () => {
    const settings = getDefaultSettings();
    settings.modelConfig.defaultModel = "gemini/gemini-2.0-flash";
    const next = applySettingsToOpenClaw(
      {
        agents: { defaults: { workspace: "./workspace" } },
      },
      settings
    ) as {
      models: { providers: Record<string, unknown> };
      agents: { defaults: { model: string } };
    };

    expect(next.models.providers).toHaveProperty("gemini");
    expect(next.agents.defaults.model).toBe("gemini/gemini-2.0-flash");
  });

  it("builds llm proxy routes from enabled providers", () => {
    const settings = getDefaultSettings();
    settings.modelConfig.providers = [
      {
        key: "test",
        enabled: true,
        baseUrl: "https://example.com",
        api: "openai-completions",
        apiKey: "sk-test",
        apiKeyEnv: "OPENAI_API_KEY",
        models: [
          {
            id: "foo-1",
            name: "Foo 1",
            contextWindow: 128000,
            maxTokens: 4096,
          },
        ],
      },
    ];
    settings.modelConfig.activeProvider = "test";
    settings.modelConfig.activeModel = "foo-1";
    settings.modelConfig.defaultModel = "test/foo-1";

    const result = buildLlmProxyRoutes(settings);
    expect(result.routes).toEqual({
      default: {
        baseUrl: "https://example.com",
        model: "foo-1",
        apiKey: "sk-test",
        apiKeyEnv: "OPENAI_API_KEY",
        match: "default",
      },
      test: {
        baseUrl: "https://example.com",
        model: "foo-1",
        apiKey: "sk-test",
        apiKeyEnv: "OPENAI_API_KEY",
        match: "test",
      },
    });
  });

  it("prefers direct apiKey in openclaw provider config", () => {
    const settings = getDefaultSettings();
    settings.modelConfig.providers[0].apiKey = "sk-direct-provider-key";
    settings.modelConfig.providers[0].apiKeyEnv = undefined;
    const next = applySettingsToOpenClaw({}, settings) as {
      models: {
        providers: Record<string, { apiKey: string }>;
      };
    };
    expect(next.models.providers.ark.apiKey).toBe("sk-direct-provider-key");
  });

  it("builds persona yaml from author profile", () => {
    const settings = getDefaultSettings();
    settings.authorProfile.name = "测试作者";
    const yaml = buildPersonaYaml(settings);
    expect(yaml).toContain('name: "测试作者"');
    expect(yaml).toContain("writing_style:");
  });

  it("handles empty raw config and builds provider-based route key", () => {
    const settings = getDefaultSettings();
    settings.modelConfig.providers[0].key = "UPPER";
    settings.modelConfig.activeProvider = "UPPER";
    settings.modelConfig.activeModel = settings.modelConfig.providers[0].models[0].id;
    settings.modelConfig.defaultModel = `UPPER/${settings.modelConfig.activeModel}`;

    const openclaw = applySettingsToOpenClaw(null, settings) as {
      agents: { defaults: { model: string } };
      models: { providers: Record<string, unknown> };
    };
    const routes = buildLlmProxyRoutes(settings);

    expect(openclaw.models.providers).toHaveProperty("UPPER");
    expect(openclaw.agents.defaults.model).toContain("/");
    expect(routes.routes.upper.match).toBe("upper");
  });

  it("includes content_focus in persona yaml for enabled directions", () => {
    const settings = getDefaultSettings();
    const yaml = buildPersonaYaml(settings);
    expect(yaml).toContain("content_focus:");
    expect(yaml).toContain("directions:");
    expect(yaml).toContain("科技热点");
    expect(yaml).toContain("深度技术");
  });

  it("omits content_focus when no directions are enabled", () => {
    const settings = getDefaultSettings();
    for (const dir of settings.contentDirections.directions) {
      dir.enabled = false;
    }
    const yaml = buildPersonaYaml(settings);
    expect(yaml).not.toContain("content_focus:");
  });

  it("buildSearchGroups only includes enabled directions with keywords", () => {
    const settings = getDefaultSettings();
    const groups = buildSearchGroups(settings);
    const enabledIds = settings.contentDirections.directions
      .filter((d) => d.enabled)
      .map((d) => d.id);
    expect(groups.map((g) => g.name)).toEqual(enabledIds);
    for (const g of groups) {
      expect(g.queries.length).toBeGreaterThan(0);
      expect(g.weight).toBeGreaterThan(0);
    }
  });

  it("buildSearchGroups respects weight and frequency from directions", () => {
    const settings = getDefaultSettings();
    const deepTech = settings.contentDirections.directions.find((d) => d.id === "deep_tech")!;
    expect(deepTech.weight).toBe(1.2);
    expect(deepTech.frequency).toBe("every_other_run");

    const groups = buildSearchGroups(settings);
    const deepGroup = groups.find((g) => g.name === "deep_tech")!;
    expect(deepGroup.weight).toBe(1.2);
    expect(deepGroup.frequency).toBe("every_other_run");
  });

  it("buildSourcesYaml produces valid YAML with search_groups header", () => {
    const settings = getDefaultSettings();
    const yaml = buildSourcesYaml(settings);
    expect(yaml).toContain("search_groups:");
    expect(yaml).toContain('name: "tech_hot"');
    expect(yaml).toContain('name: "deep_tech"');
    expect(yaml).toContain("queries:");
    expect(yaml).toContain("frequency:");
    expect(yaml).toContain("weight:");
  });

  it("buildSourcesYaml generates rss_feeds from enabled directions", () => {
    const settings = getDefaultSettings();
    const yaml = buildSourcesYaml(settings);
    expect(yaml).toContain('name: "tech_hot"');
    expect(yaml).toContain("rss_feeds:");
    expect(yaml).toContain("curated_urls:");
    expect(yaml).toContain("value_scoring:");
    expect(yaml).toContain("hnrss.org/frontpage");
    expect(yaml).toContain("V2EX Hot");
  });

  it("buildSourcesYaml includes only enabled directions' sources", () => {
    const settings = getDefaultSettings();
    for (const dir of settings.contentDirections.directions) {
      dir.enabled = dir.id === "tech_hot";
    }
    const yaml = buildSourcesYaml(settings);
    expect(yaml).toContain("hnrss.org/frontpage");
    expect(yaml).not.toContain("arxiv.org/rss/cs.AI");
  });

  it("buildSourcesYaml deduplicates RSS sources by URL", () => {
    const settings = getDefaultSettings();
    const dup = { name: "HN Dupe", url: "https://hnrss.org/frontpage", maxItems: 5 };
    settings.contentDirections.directions[1].rssSources.push(dup);
    settings.contentDirections.directions[1].enabled = true;
    const yaml = buildSourcesYaml(settings);
    const count = (yaml.match(/hnrss\.org\/frontpage/g) || []).length;
    expect(count).toBe(1);
  });

  it("builds skills registry with active skills", () => {
    const settings = getDefaultSettings();
    settings.skillsConfig.items[0].enabled = false;
    const registry = buildSkillsRegistry(settings);
    expect(registry.items.length).toBe(settings.skillsConfig.items.length);
    expect(registry.activeSkills).not.toContain(settings.skillsConfig.items[0].id);
  });

  it("builds mcp clients config and registry payload", () => {
    const settings = getDefaultSettings();
    settings.mcpConfig.enabled = true;
    const clients = buildMcpClientsConfig(settings);
    const registry = buildMcpRegistry(settings);
    expect(clients.enabled).toBe(true);
    expect(clients.clients.length).toBe(settings.mcpConfig.clients.length);
    expect(registry.installed.length).toBe(settings.mcpConfig.registry.installed.length);
    expect(registry.available_registry.length).toBe(
      settings.mcpConfig.registry.availableRegistry.length
    );
    expect(registry.whitelist_sources.length).toBeGreaterThan(0);
  });
});
