import { describe, expect, it } from "vitest";
import { setswanaDictionary, staticLevels } from "../data/dictionary";
import { validateLevels } from "./levelValidator";

const knownFillerWords = new Set(["ALU", "FOKO", "LK", "FE", "EF", "IGO", "DELA", "LINDA", "NILA", "LAP", "SITE"]);

describe("static content quality", () => {
  it("ships enough static levels for a public demo", () => {
    expect(staticLevels.length).toBeGreaterThanOrEqual(20);
  });

  it("ships a compact core dictionary", () => {
    expect(setswanaDictionary.length).toBeGreaterThanOrEqual(20);
  });

  it("validates every static level", () => {
    const result = validateLevels(staticLevels);
    expect(result.valid, result.errors.join("\n")).toBe(true);
  });

  it("does not use known filler words in static level content", () => {
    const levelWords = staticLevels.flatMap((level) => [
      ...level.mainWords,
      ...level.bonusWords,
      ...level.gridWords.map((gridWord) => gridWord.word),
    ]);

    expect(levelWords.filter((word) => knownFillerWords.has(word.toUpperCase()))).toEqual([]);
  });
});
