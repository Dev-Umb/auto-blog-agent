import { describe, expect, it } from "vitest";
import {
  applySettingsToOpenClaw,
  buildLlmProxyRoutes,
  buildPersonaYaml,
  buildSearchGroups,
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

  it("builds llm proxy routes from dashboard settings", () => {
    const settings = getDefaultSettings();
    settings.modelConfig.routes = [
      {
        key: "test",
        match: "my-model",
        baseUrl: "https://example.com",
        model: "foo-1",
        apiKeyEnv: "OPENAI_API_KEY",
      },
    ];

    const result = buildLlmProxyRoutes(settings);
    expect(result.routes).toEqual({
      test: {
        baseUrl: "https://example.com",
        model: "foo-1",
        apiKeyEnv: "OPENAI_API_KEY",
        match: "my-model",
      },
    });
  });

  it("builds persona yaml from author profile", () => {
    const settings = getDefaultSettings();
    settings.authorProfile.name = "测试作者";
    const yaml = buildPersonaYaml(settings);
    expect(yaml).toContain('name: "测试作者"');
    expect(yaml).toContain("writing_style:");
  });

  it("handles empty raw config and lowercases route match", () => {
    const settings = getDefaultSettings();
    settings.modelConfig.routes = [
      {
        key: "UPPER",
        match: "MyModel",
        baseUrl: "https://up.example.com",
        model: "x1",
      },
    ];

    const openclaw = applySettingsToOpenClaw(null, settings) as {
      agents: { defaults: { model: string } };
      models: { providers: Record<string, unknown> };
    };
    const routes = buildLlmProxyRoutes(settings);

    expect(openclaw.models.providers).toHaveProperty("ark");
    expect(openclaw.agents.defaults.model).toContain("/");
    expect(routes.routes.upper.match).toBe("mymodel");
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

  it("buildSourcesYaml preserves rss_feeds and other static sections from existing file", () => {
    const settings = getDefaultSettings();
    const existingYaml = [
      "search_groups:",
      "  - name: old_group",
      "    queries:",
      "      - old query",
      "",
      "rss_feeds:",
      '  - name: "HN"',
      '    url: "https://hn.example.com"',
      "",
      "curated_urls:",
      '  - name: "Lobsters"',
      '    url: "https://lobste.rs"',
      "",
      "value_scoring:",
      "  weights:",
      "    timeliness: 2.0",
    ].join("\n");

    const yaml = buildSourcesYaml(settings, existingYaml);
    expect(yaml).toContain('name: "tech_hot"');
    expect(yaml).not.toContain("old_group");
    expect(yaml).toContain("rss_feeds:");
    expect(yaml).toContain("curated_urls:");
    expect(yaml).toContain("value_scoring:");
    expect(yaml).toContain("https://hn.example.com");
  });

  it("buildSourcesYaml works without existing file", () => {
    const settings = getDefaultSettings();
    const yaml = buildSourcesYaml(settings);
    expect(yaml).toContain("search_groups:");
    expect(yaml).not.toContain("rss_feeds:");
  });
});
