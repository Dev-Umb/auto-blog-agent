import { and, eq, sql } from "drizzle-orm";
import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";
import { db } from "@/lib/db";
import { metaMemory, systemSettings } from "@/lib/schema";
import {
  type DashboardSettings,
  getDefaultSettings,
  sanitizeSettingsInput,
  validateSettings,
} from "@/lib/settings-config";
import {
  applySettingsToOpenClaw,
  buildMcpClientsConfig,
  buildMcpRegistry,
  buildLlmProxyRoutes,
  buildPersonaYaml,
  buildSkillsRegistry,
  buildSourcesYaml,
} from "@/lib/settings-sync";

const SETTINGS_KEY = "dashboard_settings_v1";

export async function getDashboardSettings(): Promise<{
  settings: DashboardSettings;
  version: number;
}> {
  const [stored] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, SETTINGS_KEY))
    .limit(1);

  if (!stored) {
    const defaults = getDefaultSettings();
    return { settings: defaults, version: 1 };
  }

  return {
    settings: sanitizeSettingsInput(stored.value),
    version: stored.version ?? 1,
  };
}

export async function saveDashboardSettings(input: unknown): Promise<{
  settings: DashboardSettings;
  version: number;
}> {
  const current = await getDashboardSettings();
  const normalized = sanitizeSettingsInput(input, current.settings);
  const errors = validateSettings(normalized);

  if (errors.length > 0) {
    throw new Error(errors.join("；"));
  }

  const [existing] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, SETTINGS_KEY))
    .limit(1);

  if (!existing) {
    const [inserted] = await db
      .insert(systemSettings)
      .values({
        key: SETTINGS_KEY,
        value: normalized,
        version: 1,
      })
      .returning();

    return { settings: normalized, version: inserted.version ?? 1 };
  }

  await db
    .update(systemSettings)
    .set({
      value: normalized,
      version: sql`${systemSettings.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(systemSettings.id, existing.id));

  return { settings: normalized, version: (existing.version ?? 1) + 1 };
}

export async function writeAppliedConfigs(settings: DashboardSettings) {
  const openClawPath =
    process.env.OPENCLAW_CONFIG_PATH || "/openclaw-config/openclaw.json";
  const llmProxyRoutesPath =
    process.env.LLM_PROXY_ROUTES_PATH || "/llm-proxy-config/routes.json";
  const personaPath =
    process.env.OPENCLAW_PERSONA_PATH || "/openclaw-workspace/persona.yaml";
  const sourcesPath =
    process.env.OPENCLAW_SOURCES_PATH || "/openclaw-workspace/skills/blog-explore/sources.yaml";
  const sourcesRootPath =
    process.env.OPENCLAW_SOURCES_ROOT_PATH || "/openclaw-workspace/sources.yaml";
  const skillsRegistryPath =
    process.env.OPENCLAW_SKILLS_REGISTRY_PATH ||
    "/openclaw-workspace/skills/skills-registry.json";
  const mcpClientsPath =
    process.env.OPENCLAW_MCP_CLIENTS_PATH || "/openclaw-workspace/mcp-clients.json";
  const mcpRegistryPath =
    process.env.OPENCLAW_MCP_REGISTRY_PATH || "/openclaw-workspace/mcp-registry.json";
  const compatWorkspaceRoot =
    process.env.OPENCLAW_WORKSPACE_COMPAT_ROOT || "/openclaw-workspace/workspace";
  const compatPersonaPath = `${compatWorkspaceRoot}/persona.yaml`;
  const compatSourcesPath = `${compatWorkspaceRoot}/skills/blog-explore/sources.yaml`;
  const compatSourcesRootPath = `${compatWorkspaceRoot}/sources.yaml`;
  const compatSkillsRegistryPath = `${compatWorkspaceRoot}/skills/skills-registry.json`;
  const compatMcpClientsPath = `${compatWorkspaceRoot}/mcp-clients.json`;
  const compatMcpRegistryPath = `${compatWorkspaceRoot}/mcp-registry.json`;

  const raw = await readFile(openClawPath, "utf-8");
  const nextOpenClawConfig = applySettingsToOpenClaw(JSON.parse(raw), settings);
  await writeFile(openClawPath, JSON.stringify(nextOpenClawConfig, null, 2), "utf-8");

  const routes = buildLlmProxyRoutes(settings);
  await writeFile(llmProxyRoutesPath, JSON.stringify(routes, null, 2), "utf-8");

  const personaYaml = buildPersonaYaml(settings);
  await writeTextFile(personaPath, personaYaml);
  await tryWriteTextFile(compatPersonaPath, personaYaml);

  let existingSourcesYaml: string | undefined;
  try {
    existingSourcesYaml = await readFile(sourcesPath, "utf-8");
  } catch {
    /* file may not exist yet */
  }
  const sourcesYaml = buildSourcesYaml(settings, existingSourcesYaml);
  await writeTextFile(sourcesPath, sourcesYaml);
  await writeTextFile(sourcesRootPath, sourcesYaml);
  await tryWriteTextFile(compatSourcesPath, sourcesYaml);
  await tryWriteTextFile(compatSourcesRootPath, sourcesYaml);

  const skillsRegistry = buildSkillsRegistry(settings);
  await writeTextFile(skillsRegistryPath, JSON.stringify(skillsRegistry, null, 2));
  await tryWriteTextFile(compatSkillsRegistryPath, JSON.stringify(skillsRegistry, null, 2));

  const mcpClients = buildMcpClientsConfig(settings);
  await writeTextFile(mcpClientsPath, JSON.stringify(mcpClients, null, 2));
  await tryWriteTextFile(compatMcpClientsPath, JSON.stringify(mcpClients, null, 2));

  const mcpRegistry = buildMcpRegistry(settings);
  await writeTextFile(mcpRegistryPath, JSON.stringify(mcpRegistry, null, 2));
  await tryWriteTextFile(compatMcpRegistryPath, JSON.stringify(mcpRegistry, null, 2));
}

async function writeTextFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf-8");
}

async function tryWriteTextFile(path: string, content: string) {
  try {
    await writeTextFile(path, content);
  } catch {
    // Compat path is best-effort only; primary path has already been written.
  }
}

export async function saveAuthorProfileToMetaMemory(settings: DashboardSettings) {
  const category = "author_profile";
  const key = "dashboard_author_profile";
  const value = {
    name: settings.authorProfile.name,
    personality: settings.authorProfile.personality,
    writingStyle: settings.authorProfile.writingStyle,
    tagline: settings.authorProfile.tagline,
  };

  const [existing] = await db
    .select()
    .from(metaMemory)
    .where(and(eq(metaMemory.category, category), eq(metaMemory.key, key)))
    .limit(1);

  if (existing) {
    await db
      .update(metaMemory)
      .set({
        value,
        version: sql`${metaMemory.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(metaMemory.id, existing.id));
    return;
  }

  await db.insert(metaMemory).values({
    category,
    key,
    value,
    version: 1,
  });
}

export async function saveContentDirectionsToMetaMemory(settings: DashboardSettings) {
  const category = "content_directions";
  const key = "dashboard_content_directions";
  const enabledDirs = settings.contentDirections.directions.filter((d) => d.enabled);
  const value = {
    directions: enabledDirs.map((d) => ({
      id: d.id,
      label: d.label,
      keywords: d.keywords,
      weight: d.weight,
      frequency: d.frequency,
    })),
  };

  const [existing] = await db
    .select()
    .from(metaMemory)
    .where(and(eq(metaMemory.category, category), eq(metaMemory.key, key)))
    .limit(1);

  if (existing) {
    await db
      .update(metaMemory)
      .set({
        value,
        version: sql`${metaMemory.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(metaMemory.id, existing.id));
    return;
  }

  await db.insert(metaMemory).values({
    category,
    key,
    value,
    version: 1,
  });
}
