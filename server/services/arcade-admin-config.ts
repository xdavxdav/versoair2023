import { randomUUID } from "node:crypto";
import { z } from "zod";
import { pool } from "../db";
import {
  ALL_ARCADE_GAME_IDS,
  CUSTOM_QUESTION_CATEGORIES,
  createDefaultArcadeGamesConfig,
  type AllArcadeGameId,
  type ArcadeGamesAdminConfig,
  type CustomArcadeQuestion,
  type CustomQuestionCategory,
} from "@shared/arcade-games";

export const ARCADE_CONFIG_SETTING_KEY = "arcade_games_config";
export const ARCADE_QUESTIONS_SETTING_KEY = "arcade_custom_questions";

const MAX_CUSTOM_QUESTIONS = 200;

export const updateArcadeConfigSchema = z
  .object({
    enabledGames: z
      .record(z.string(), z.boolean())
      .optional(),
    maintenanceMessage: z.string().max(240).optional(),
  })
  .strict();

export const createCustomQuestionSchema = z
  .object({
    category: z.enum(CUSTOM_QUESTION_CATEGORIES),
    q: z.string().trim().min(6, "Question trop courte").max(260),
    options: z
      .tuple([
        z.string().trim().min(1).max(120),
        z.string().trim().min(1).max(120),
        z.string().trim().min(1).max(120),
        z.string().trim().min(1).max(120),
      ]),
    answer: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  })
  .strict();

function normalizeConfig(raw: unknown): ArcadeGamesAdminConfig {
  const defaults = createDefaultArcadeGamesConfig();
  if (!raw || typeof raw !== "object") return defaults;
  const obj = raw as Record<string, unknown>;
  const rawEnabled =
    obj.enabledGames && typeof obj.enabledGames === "object"
      ? (obj.enabledGames as Record<string, unknown>)
      : {};
  const enabledGames = { ...defaults.enabledGames };
  for (const id of ALL_ARCADE_GAME_IDS) {
    if (typeof rawEnabled[id] === "boolean") {
      enabledGames[id] = rawEnabled[id] as boolean;
    }
  }
  const maintenanceMessage =
    typeof obj.maintenanceMessage === "string"
      ? obj.maintenanceMessage.trim().slice(0, 240)
      : "";
  return { enabledGames, maintenanceMessage };
}

function normalizeQuestions(raw: unknown): CustomArcadeQuestion[] {
  if (!Array.isArray(raw)) return [];
  const valid: CustomArcadeQuestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const parsed = createCustomQuestionSchema.safeParse({
      category: obj.category,
      q: obj.q,
      options: obj.options,
      answer: obj.answer,
    });
    if (!parsed.success) continue;
    const id =
      typeof obj.id === "string" && obj.id.trim().length > 0
        ? obj.id.trim().slice(0, 64)
        : randomUUID();
    const createdAt =
      typeof obj.createdAt === "string" && obj.createdAt.length > 0
        ? obj.createdAt
        : new Date().toISOString();
    valid.push({
      id,
      ...parsed.data,
      createdAt,
    });
  }
  return valid.slice(0, MAX_CUSTOM_QUESTIONS);
}

export async function getArcadeGamesConfig(): Promise<ArcadeGamesAdminConfig> {
  try {
    const res = await pool.query<{ value: unknown }>(
      "SELECT value FROM system_settings WHERE key = $1 LIMIT 1",
      [ARCADE_CONFIG_SETTING_KEY],
    );
    return normalizeConfig(res.rows[0]?.value);
  } catch {
    return createDefaultArcadeGamesConfig();
  }
}

export async function saveArcadeGamesConfig(
  patch: z.infer<typeof updateArcadeConfigSchema>,
  updatedBy: number | null,
): Promise<ArcadeGamesAdminConfig> {
  const current = await getArcadeGamesConfig();
  const nextEnabled: Record<AllArcadeGameId, boolean> = {
    ...current.enabledGames,
  };
  if (patch.enabledGames) {
    for (const id of ALL_ARCADE_GAME_IDS) {
      if (typeof patch.enabledGames[id] === "boolean") {
        nextEnabled[id] = patch.enabledGames[id];
      }
    }
  }
  const next: ArcadeGamesAdminConfig = {
    enabledGames: nextEnabled,
    maintenanceMessage:
      patch.maintenanceMessage !== undefined
        ? patch.maintenanceMessage.trim().slice(0, 240)
        : current.maintenanceMessage,
  };

  await pool.query(
    `INSERT INTO system_settings (key, value, updated_by, updated_at)
     VALUES ($1, $2::jsonb, $3, NOW())
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [ARCADE_CONFIG_SETTING_KEY, JSON.stringify(next), updatedBy],
  );
  return next;
}

export async function getCustomArcadeQuestions(
  category?: CustomQuestionCategory,
): Promise<CustomArcadeQuestion[]> {
  try {
    const res = await pool.query<{ value: unknown }>(
      "SELECT value FROM system_settings WHERE key = $1 LIMIT 1",
      [ARCADE_QUESTIONS_SETTING_KEY],
    );
    const all = normalizeQuestions(res.rows[0]?.value);
    return category ? all.filter((q) => q.category === category) : all;
  } catch {
    return [];
  }
}

export async function addCustomArcadeQuestion(
  input: z.infer<typeof createCustomQuestionSchema>,
  updatedBy: number | null,
): Promise<CustomArcadeQuestion> {
  const existing = await getCustomArcadeQuestions();
  if (existing.length >= MAX_CUSTOM_QUESTIONS) {
    throw new Error("Limite maximale de questions personnalisées atteinte (200).");
  }
  const created: CustomArcadeQuestion = {
    id: randomUUID(),
    category: input.category,
    q: input.q,
    options: input.options,
    answer: input.answer,
    createdAt: new Date().toISOString(),
  };
  const next = [created, ...existing];
  await pool.query(
    `INSERT INTO system_settings (key, value, updated_by, updated_at)
     VALUES ($1, $2::jsonb, $3, NOW())
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [ARCADE_QUESTIONS_SETTING_KEY, JSON.stringify(next), updatedBy],
  );
  return created;
}

export async function deleteCustomArcadeQuestion(
  questionId: string,
  updatedBy: number | null,
): Promise<boolean> {
  const existing = await getCustomArcadeQuestions();
  const next = existing.filter((q) => q.id !== questionId);
  if (next.length === existing.length) return false;
  await pool.query(
    `INSERT INTO system_settings (key, value, updated_by, updated_at)
     VALUES ($1, $2::jsonb, $3, NOW())
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [ARCADE_QUESTIONS_SETTING_KEY, JSON.stringify(next), updatedBy],
  );
  return true;
}
