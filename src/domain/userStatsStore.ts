import { Achievement, UserStats } from "../types";

export const USER_STATS_STORAGE_KEY = "lefoko_user_stats";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const defaultAchievements: Achievement[] = [
  { id: "first_solve", title: "Mothomogolo (Beginner)", description: "Solve your very first Setswana word connection.", iconName: "Award", requiredValue: 1, currentValue: 0, rewardCoins: 100, unlocked: false },
  { id: "five_levels", title: "Molemi (Cultivator)", description: "Complete 5 standard classic game levels.", iconName: "Trophy", requiredValue: 5, currentValue: 0, rewardCoins: 250, unlocked: false },
  { id: "dictionary_look", title: "Molebedi (Observer)", description: "Browse the cultural dictionary terms catalog.", iconName: "BookOpen", requiredValue: 1, currentValue: 0, rewardCoins: 50, unlocked: false },
  { id: "bonus_word", title: "Mosola (Resourceful)", description: "Discover 3 auxiliary bonus vocabulary terms.", iconName: "Star", requiredValue: 3, currentValue: 0, rewardCoins: 150, unlocked: false },
  { id: "streak_3", title: "Legae (Homeowner)", description: "Maintain a 3-day consecutive login loyalty streak.", iconName: "Heart", requiredValue: 3, currentValue: 0, rewardCoins: 500, unlocked: false },
];

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

function getDefaultStorage(): StorageLike | undefined {
  if (typeof localStorage === "undefined") return undefined;
  return localStorage;
}

function recordFrom(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry === true)
      .map(([key]) => [key, true]),
  );
}

function numberFrom(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringFrom(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizeAchievements(value: unknown): Achievement[] {
  if (!Array.isArray(value)) return defaultAchievements;
  const byId = new Map(value.map((achievement: any) => [achievement?.id, achievement]));
  return defaultAchievements.map((base) => {
    const existing = byId.get(base.id);
    if (!existing || typeof existing !== "object") return base;
    return {
      ...base,
      currentValue: numberFrom(existing.currentValue, base.currentValue),
      unlocked: existing.unlocked === true,
      unlockedAt: typeof existing.unlockedAt === "string" ? existing.unlockedAt : undefined,
    };
  });
}

export function createDefaultUserStats(): UserStats {
  return {
    xp: 0,
    coins: 400,
    gems: 25,
    level: 1,
    dailyStreak: 1,
    lastLoginDate: todayKey(),
    classicLevelProgress: 1,
    bonusBankSize: 0,
    totalWordsSolved: 0,
    achievements: defaultAchievements,
    dailyCompletion: {},
    rewardClaims: {
      mainWords: {},
      levelCompletions: {},
      bonusWords: {},
    },
  };
}

export function normalizeUserStats(value: unknown): UserStats {
  const defaults = createDefaultUserStats();
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaults;
  const raw = value as Record<string, any>;
  return {
    ...defaults,
    xp: Math.max(0, numberFrom(raw.xp, defaults.xp)),
    coins: Math.max(0, numberFrom(raw.coins, defaults.coins)),
    gems: Math.max(0, numberFrom(raw.gems, defaults.gems)),
    level: Math.max(1, numberFrom(raw.level, defaults.level)),
    dailyStreak: Math.max(1, numberFrom(raw.dailyStreak, defaults.dailyStreak)),
    lastLoginDate: stringFrom(raw.lastLoginDate, defaults.lastLoginDate),
    classicLevelProgress: Math.max(1, numberFrom(raw.classicLevelProgress, defaults.classicLevelProgress)),
    bonusBankSize: Math.max(0, numberFrom(raw.bonusBankSize, defaults.bonusBankSize)),
    totalWordsSolved: Math.max(0, numberFrom(raw.totalWordsSolved, defaults.totalWordsSolved)),
    achievements: normalizeAchievements(raw.achievements),
    dailyCompletion: recordFrom(raw.dailyCompletion),
    rewardClaims: {
      mainWords: recordFrom(raw.rewardClaims?.mainWords),
      levelCompletions: recordFrom(raw.rewardClaims?.levelCompletions),
      bonusWords: recordFrom(raw.rewardClaims?.bonusWords),
    },
  };
}

export function loadUserStats(storage: StorageLike | undefined = getDefaultStorage()): UserStats {
  if (!storage) return createDefaultUserStats();
  const raw = storage.getItem(USER_STATS_STORAGE_KEY);
  if (!raw) return createDefaultUserStats();
  try {
    return normalizeUserStats(JSON.parse(raw));
  } catch {
    return createDefaultUserStats();
  }
}

export function saveUserStats(stats: UserStats, storage: StorageLike | undefined = getDefaultStorage()): UserStats {
  const normalized = normalizeUserStats(stats);
  if (storage) {
    storage.setItem(USER_STATS_STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}
