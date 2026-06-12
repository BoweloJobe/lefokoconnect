import { describe, expect, it } from "vitest";
import {
  createDefaultUserStats,
  loadUserStats,
  normalizeUserStats,
  saveUserStats,
  USER_STATS_STORAGE_KEY,
  type StorageLike,
} from "./userStatsStore";

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) || null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("userStatsStore", () => {
  it("default user stats contain all fields", () => {
    const stats = createDefaultUserStats();
    expect(stats.rewardClaims).toEqual({
      mainWords: {},
      levelCompletions: {},
      bonusWords: {},
    });
    expect(stats.achievements.length).toBeGreaterThan(0);
  });

  it("old stats without rewardClaims migrate safely", () => {
    const stats = normalizeUserStats({ coins: 99, achievements: [] });
    expect(stats.coins).toBe(99);
    expect(stats.rewardClaims.mainWords).toEqual({});
    expect(stats.dailyCompletion).toEqual({});
  });

  it("corrupt localStorage returns default stats", () => {
    const storage = new MemoryStorage();
    storage.setItem(USER_STATS_STORAGE_KEY, "{bad json");
    expect(loadUserStats(storage)).toEqual(createDefaultUserStats());
  });

  it("save normalizes stats before writing", () => {
    const storage = new MemoryStorage();
    const saved = saveUserStats({ ...createDefaultUserStats(), coins: -5 }, storage);
    expect(saved.coins).toBe(0);
    expect(loadUserStats(storage).coins).toBe(0);
  });
});
