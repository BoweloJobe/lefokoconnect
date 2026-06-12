import { AdminContentBundle, Level, SetswanaWord, UploadedDictionaryWord, UploadedLevel, AdminContentSource } from "../types";
import { validateLevel } from "./levelValidator";

export const ADMIN_CONTENT_STORAGE_KEY = "lefoko_admin_content_bundle";
export const ADMIN_CONTENT_SCHEMA_VERSION = 1;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface BundleParseResult {
  ok: boolean;
  bundle: AdminContentBundle;
  errors: string[];
}

export interface LevelDraftResult {
  ok: boolean;
  uploadedLevel?: UploadedLevel;
  errors: string[];
  warnings: string[];
}

export function createEmptyAdminContentBundle(): AdminContentBundle {
  return {
    schemaVersion: ADMIN_CONTENT_SCHEMA_VERSION,
    words: [],
    levels: [],
  };
}

function getDefaultStorage(): StorageLike | undefined {
  if (typeof localStorage === "undefined") return undefined;
  return localStorage;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCategory(value: unknown): SetswanaWord["category"] {
  const allowed: SetswanaWord["category"][] = ["animal", "everyday", "verb", "noun", "cliché", "expression", "place", "proverb", "cultural"];
  return allowed.includes(value as SetswanaWord["category"]) ? value as SetswanaWord["category"] : "everyday";
}

function normalizeWord(raw: any): UploadedDictionaryWord | null {
  if (!isObject(raw)) return null;
  const word = normalizeText(raw.word).toUpperCase();
  const english = normalizeText(raw.english);
  const contentId = normalizeText(raw.contentId) || `word-${word.toLowerCase()}`;
  if (!word || !english || !/^[A-Z]+$/.test(word)) return null;

  return {
    contentId,
    source: ["admin", "import", "ai"].includes(String(raw.source)) ? raw.source as AdminContentSource : "import",
    enabled: raw.enabled !== false,
    createdAt: normalizeText(raw.createdAt) || new Date().toISOString(),
    updatedAt: normalizeText(raw.updatedAt) || undefined,
    word,
    english,
    category: normalizeCategory(raw.category),
    culturalContext: normalizeText(raw.culturalContext) || undefined,
    syllables: Array.isArray(raw.syllables) ? raw.syllables.map(String) : undefined,
  };
}

function normalizeLevelRecord(raw: any): UploadedLevel | null {
  if (!isObject(raw) || !isObject(raw.level)) return null;
  const level = raw.level as unknown as Level;
  const validation = validateLevel(level);
  const contentId = normalizeText(raw.contentId) || `level-${raw.level.levelNumber || Date.now()}`;
  return {
    contentId,
    source: ["admin", "import", "ai"].includes(String(raw.source)) ? raw.source as AdminContentSource : "import",
    enabled: raw.enabled !== false && validation.valid,
    createdAt: normalizeText(raw.createdAt) || new Date().toISOString(),
    updatedAt: normalizeText(raw.updatedAt) || undefined,
    level,
    validation,
  };
}

export function parseAdminContentBundleJson(json: string): BundleParseResult {
  try {
    const parsed = JSON.parse(json);
    return parseAdminContentBundle(parsed);
  } catch {
    return {
      ok: false,
      bundle: createEmptyAdminContentBundle(),
      errors: ["Admin content JSON could not be parsed."],
    };
  }
}

export function parseAdminContentBundle(value: unknown): BundleParseResult {
  if (!isObject(value)) {
    return {
      ok: false,
      bundle: createEmptyAdminContentBundle(),
      errors: ["Admin content bundle must be an object."],
    };
  }

  if (value.schemaVersion !== ADMIN_CONTENT_SCHEMA_VERSION) {
    return {
      ok: false,
      bundle: createEmptyAdminContentBundle(),
      errors: [`Unsupported admin content schemaVersion "${String(value.schemaVersion)}".`],
    };
  }

  if (!Array.isArray(value.words) || !Array.isArray(value.levels)) {
    return {
      ok: false,
      bundle: createEmptyAdminContentBundle(),
      errors: ["Admin content bundle must include words and levels arrays."],
    };
  }

  const words = value.words.map(normalizeWord).filter((word): word is UploadedDictionaryWord => !!word);
  const levels = value.levels.map(normalizeLevelRecord).filter((level): level is UploadedLevel => !!level);

  if (words.length !== value.words.length || levels.length !== value.levels.length) {
    return {
      ok: false,
      bundle: createEmptyAdminContentBundle(),
      errors: ["Admin content bundle contains invalid word or level records."],
    };
  }

  return {
    ok: true,
    bundle: {
      schemaVersion: ADMIN_CONTENT_SCHEMA_VERSION,
      words,
      levels,
      exportedAt: normalizeText(value.exportedAt) || undefined,
    },
    errors: [],
  };
}

export function loadAdminContentBundle(storage: StorageLike | undefined = getDefaultStorage()): BundleParseResult {
  if (!storage) {
    return { ok: true, bundle: createEmptyAdminContentBundle(), errors: [] };
  }

  const raw = storage.getItem(ADMIN_CONTENT_STORAGE_KEY);
  if (!raw) {
    return { ok: true, bundle: createEmptyAdminContentBundle(), errors: [] };
  }

  return parseAdminContentBundleJson(raw);
}

export function saveAdminContentBundle(bundle: AdminContentBundle, storage: StorageLike | undefined = getDefaultStorage()): BundleParseResult {
  const parsed = parseAdminContentBundle(bundle);
  if (!parsed.ok) return parsed;
  if (storage) {
    storage.setItem(ADMIN_CONTENT_STORAGE_KEY, JSON.stringify(parsed.bundle));
  }
  return parsed;
}

export function exportAdminContentBundle(bundle: AdminContentBundle): string {
  return JSON.stringify(
    {
      ...bundle,
      schemaVersion: ADMIN_CONTENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}

export function importAdminContentBundle(json: string): BundleParseResult {
  return parseAdminContentBundleJson(json);
}

export function createUploadedDictionaryWord(word: SetswanaWord, source: AdminContentSource = "admin"): UploadedDictionaryWord {
  const normalizedWord = word.word.trim().toUpperCase();
  const now = new Date().toISOString();
  return {
    ...word,
    word: normalizedWord,
    contentId: `word-${normalizedWord.toLowerCase()}-${Date.now()}`,
    source,
    enabled: true,
    createdAt: now,
  };
}

export function createUploadedLevel(level: Level, source: AdminContentSource = "admin"): LevelDraftResult {
  const validation = validateLevel(level);
  if (!validation.valid) {
    return {
      ok: false,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  return {
    ok: true,
    uploadedLevel: {
      contentId: `level-${level.levelNumber}-${Date.now()}`,
      source,
      enabled: true,
      createdAt: new Date().toISOString(),
      level,
      validation,
    },
    errors: [],
    warnings: validation.warnings,
  };
}
