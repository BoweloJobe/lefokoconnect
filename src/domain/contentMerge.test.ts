import { describe, expect, it } from "vitest";
import { staticLevels, setswanaDictionary } from "../data/dictionary";
import { Level } from "../types";
import { createEmptyAdminContentBundle, createUploadedDictionaryWord, createUploadedLevel } from "./adminContentStore";
import { mergeDictionaryWords, mergeLevels } from "./contentMerge";

const uploadedLevel: Level = {
  id: 7001,
  levelNumber: 701,
  title: "Merged Admin Level",
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

describe("contentMerge", () => {
  it("preserves static levels", () => {
    const merged = mergeLevels(staticLevels, createEmptyAdminContentBundle());
    expect(merged).toHaveLength(staticLevels.length);
    expect(merged[0]).toBe(staticLevels[0]);
  });

  it("includes an enabled uploaded level", () => {
    const uploaded = createUploadedLevel(uploadedLevel).uploadedLevel!;
    const merged = mergeLevels(staticLevels, {
      ...createEmptyAdminContentBundle(),
      levels: [uploaded],
    });

    expect(merged.some((level) => level.levelNumber === 701)).toBe(true);
  });

  it("excludes a disabled uploaded level", () => {
    const uploaded = {
      ...createUploadedLevel(uploadedLevel).uploadedLevel!,
      enabled: false,
    };
    const merged = mergeLevels(staticLevels, {
      ...createEmptyAdminContentBundle(),
      levels: [uploaded],
    });

    expect(merged.some((level) => level.levelNumber === 701)).toBe(false);
  });

  it("does not let uploaded levels overwrite static levels", () => {
    const uploaded = createUploadedLevel({
      ...uploadedLevel,
      id: staticLevels[0].id,
      levelNumber: staticLevels[0].levelNumber,
    }).uploadedLevel!;
    const merged = mergeLevels(staticLevels, {
      ...createEmptyAdminContentBundle(),
      levels: [uploaded],
    });

    expect(merged).toHaveLength(staticLevels.length);
  });

  it("includes enabled uploaded dictionary words", () => {
    const uploadedWord = createUploadedDictionaryWord({
      word: "BANA",
      english: "Children",
      category: "noun",
    });
    const merged = mergeDictionaryWords(setswanaDictionary, {
      ...createEmptyAdminContentBundle(),
      words: [uploadedWord],
    });

    expect(merged.some((word) => word.word === "BANA")).toBe(true);
  });
});
