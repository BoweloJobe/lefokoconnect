import { describe, expect, it } from "vitest";
import { Level } from "../types";
import {
  ADMIN_CONTENT_STORAGE_KEY,
  createEmptyAdminContentBundle,
  createUploadedLevel,
  exportAdminContentBundle,
  importAdminContentBundle,
  loadAdminContentBundle,
  saveAdminContentBundle,
  StorageLike,
} from "./adminContentStore";

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) || null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const validLevel: Level = {
  id: 5001,
  levelNumber: 501,
  title: "Admin Test Level",
  letters: ["M", "E", "T", "S", "I"],
  mainWords: ["METSI", "TSE"],
  bonusWords: ["ME", "SE"],
  gridSize: 6,
  difficulty: "beginner",
  themeName: "Kalahari Grazing Lands",
  gridWords: [
    { word: "METSI", r: 1, c: 0, direction: "H", clue: "Water." },
    { word: "TSE", r: 1, c: 2, direction: "V", clue: "These ones." },
  ],
};

describe("adminContentStore", () => {
  it("loads an empty admin bundle by default", () => {
    const result = loadAdminContentBundle(new MemoryStorage());
    expect(result.ok).toBe(true);
    expect(result.bundle).toEqual(createEmptyAdminContentBundle());
  });

  it("handles corrupt localStorage without throwing", () => {
    const storage = new MemoryStorage();
    storage.setItem(ADMIN_CONTENT_STORAGE_KEY, "{not json");
    const result = loadAdminContentBundle(storage);
    expect(result.ok).toBe(false);
    expect(result.bundle.words).toEqual([]);
    expect(result.bundle.levels).toEqual([]);
  });

  it("returns a safe empty bundle for unsupported schema versions", () => {
    const storage = new MemoryStorage();
    storage.setItem(ADMIN_CONTENT_STORAGE_KEY, JSON.stringify({ schemaVersion: 999, words: [], levels: [] }));

    const result = loadAdminContentBundle(storage);

    expect(result.ok).toBe(false);
    expect(result.bundle).toEqual(createEmptyAdminContentBundle());
    expect(result.errors[0]).toContain("Unsupported admin content schemaVersion");
  });

  it("saves and loads a valid uploaded level", () => {
    const storage = new MemoryStorage();
    const uploaded = createUploadedLevel(validLevel);
    expect(uploaded.ok).toBe(true);

    const bundle = {
      ...createEmptyAdminContentBundle(),
      levels: [uploaded.uploadedLevel!],
    };
    expect(saveAdminContentBundle(bundle, storage).ok).toBe(true);

    const loaded = loadAdminContentBundle(storage);
    expect(loaded.ok).toBe(true);
    expect(loaded.bundle.levels[0].level.title).toBe("Admin Test Level");
  });

  it("rejects an invalid uploaded level", () => {
    const invalid = createUploadedLevel({
      ...validLevel,
      mainWords: ["METSI", "TSELA"],
    });

    expect(invalid.ok).toBe(false);
    expect(invalid.errors.join(" ")).toContain("cannot be formed");
  });

  it("roundtrips import and export JSON", () => {
    const uploaded = createUploadedLevel(validLevel);
    const bundle = {
      ...createEmptyAdminContentBundle(),
      levels: [uploaded.uploadedLevel!],
    };

    const exported = exportAdminContentBundle(bundle);
    const imported = importAdminContentBundle(exported);

    expect(imported.ok).toBe(true);
    expect(imported.bundle.levels[0].level.levelNumber).toBe(501);
  });
});
