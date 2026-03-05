import { describe, expect, it } from "vitest";
import {
  getDefaultSettings,
  sanitizeSettingsInput,
  validateSettings,
  PRESET_CONTENT_DIRECTIONS,
} from "@/lib/settings-config";

describe("settings-config", () => {
  it("returns default settings with tech_hot and deep_tech enabled", () => {
    const settings = getDefaultSettings();
    expect(settings.modelConfig.defaultModel).toContain("/");
    expect(settings.authorProfile.name).toBe("小赛");
    expect(settings.themePreferences.mode).toBe("paper");

    const dirs = settings.contentDirections.directions;
    expect(dirs).toHaveLength(PRESET_CONTENT_DIRECTIONS.length);
    const enabled = dirs.filter((d) => d.enabled);
    expect(enabled.map((d) => d.id)).toEqual(["tech_hot", "deep_tech"]);
  });

  it("sanitizes partial invalid input", () => {
    const settings = sanitizeSettingsInput({
      modelConfig: {
        defaultModel: "",
        providers: [
          {
            key: "",
            baseUrl: "https://example.com",
            apiKeyEnv: "OPENAI_API_KEY",
            models: [{ id: "", name: "", contextWindow: 100, maxTokens: 50 }],
          },
        ],
        routes: [{ key: "", match: "", baseUrl: "https://example.com", model: "m1" }],
      },
      authorProfile: { name: "", personality: "p", writingStyle: "w", tagline: "" },
      themePreferences: { mode: "invalid" },
    });
    expect(settings.modelConfig.defaultModel).toBeTruthy();
    expect(settings.modelConfig.providers[0].key).toContain("provider_");
    expect(settings.authorProfile.name).toBe("小赛");
    expect(settings.themePreferences.mode).toBe("paper");
  });

  it("validates required fields and model format", () => {
    const settings = getDefaultSettings();
    settings.modelConfig.defaultModel = "no-slash";
    settings.authorProfile.name = "";
    const errors = validateSettings(settings);
    expect(errors.some((item) => item.includes("provider/model"))).toBe(true);
    expect(errors.some((item) => item.includes("name"))).toBe(true);
  });

  it("accepts neo mode and keeps optional ops fields", () => {
    const settings = sanitizeSettingsInput({
      themePreferences: { mode: "neo" },
      opsState: {
        lastAppliedAt: "2026-03-05T00:00:00.000Z",
        lastApplyResult: "success",
        lastApplyMessage: "ok",
      },
      modelConfig: {
        providers: [
          {
            key: "ark",
            baseUrl: "https://ark.example.com",
            apiKeyEnv: "OPENAI_API_KEY",
            models: [
              {
                id: "a",
                name: "A",
                contextWindow: 1024,
                maxTokens: 256,
              },
            ],
          },
        ],
      },
    });
    expect(settings.themePreferences.mode).toBe("neo");
    expect(settings.opsState.lastApplyResult).toBe("success");
  });

  it("reports invalid provider URL and empty models", () => {
    const settings = getDefaultSettings();
    settings.modelConfig.providers = [
      {
        key: "bad",
        baseUrl: "invalid-url",
        api: "openai-completions",
        apiKeyEnv: "OPENAI_API_KEY",
        models: [],
      },
    ];
    const errors = validateSettings(settings);
    expect(errors.some((item) => item.includes("baseUrl"))).toBe(true);
    expect(errors.some((item) => item.includes("models"))).toBe(true);
  });

  it("sanitizes contentDirections with invalid weight and frequency", () => {
    const settings = sanitizeSettingsInput({
      contentDirections: {
        directions: [
          {
            id: "test",
            label: "Test",
            description: "desc",
            keywords: ["kw1", "", "  kw2  "],
            enabled: true,
            weight: 5.0,
            frequency: "invalid_freq",
          },
        ],
      },
    });
    const dir = settings.contentDirections.directions[0];
    expect(dir.weight).toBe(2.0);
    expect(dir.frequency).toBe("every_run");
    expect(dir.keywords).toEqual(["kw1", "kw2"]);
  });

  it("falls back to base directions when contentDirections is missing", () => {
    const settings = sanitizeSettingsInput({
      contentDirections: "not_an_object",
    });
    expect(settings.contentDirections.directions).toHaveLength(PRESET_CONTENT_DIRECTIONS.length);
  });

  it("falls back to base directions when directions array is empty", () => {
    const settings = sanitizeSettingsInput({
      contentDirections: { directions: [] },
    });
    expect(settings.contentDirections.directions).toHaveLength(PRESET_CONTENT_DIRECTIONS.length);
  });

  it("validates at least one direction must be enabled", () => {
    const settings = getDefaultSettings();
    for (const dir of settings.contentDirections.directions) {
      dir.enabled = false;
    }
    const errors = validateSettings(settings);
    expect(errors.some((item) => item.includes("contentDirections"))).toBe(true);
  });

  it("validates enabled directions must have keywords", () => {
    const settings = getDefaultSettings();
    const dir = settings.contentDirections.directions.find((d) => d.id === "tech_hot")!;
    dir.keywords = [];
    const errors = validateSettings(settings);
    expect(errors.some((item) => item.includes("tech_hot") && item.includes("关键词"))).toBe(true);
  });

  it("clamps weight to valid range", () => {
    const low = sanitizeSettingsInput({
      contentDirections: {
        directions: [
          { id: "a", label: "A", description: "", keywords: ["k"], enabled: true, weight: -1, frequency: "daily" },
        ],
      },
    });
    expect(low.contentDirections.directions[0].weight).toBe(0.1);

    const high = sanitizeSettingsInput({
      contentDirections: {
        directions: [
          { id: "b", label: "B", description: "", keywords: ["k"], enabled: true, weight: 99, frequency: "daily" },
        ],
      },
    });
    expect(high.contentDirections.directions[0].weight).toBe(2.0);
  });

  it("limits directions to 30 entries", () => {
    const dirs = Array.from({ length: 35 }, (_, i) => ({
      id: `d${i}`,
      label: `Dir ${i}`,
      description: "",
      keywords: [`kw${i}`],
      enabled: i === 0,
      weight: 1.0,
      frequency: "every_run",
    }));
    const settings = sanitizeSettingsInput({
      contentDirections: { directions: dirs },
    });
    expect(settings.contentDirections.directions).toHaveLength(30);
  });
});
