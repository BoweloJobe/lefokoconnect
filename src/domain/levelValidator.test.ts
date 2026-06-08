import { describe, expect, it } from "vitest";
import { staticLevels } from "../data/dictionary";
import { Level } from "../types";
import { validateLevel, validateLevels } from "./levelValidator";

const validLevel: Level = {
  id: 999,
  levelNumber: 99,
  title: "Validator Sample",
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

describe("levelValidator", () => {
  it("accepts all static levels", () => {
    const result = validateLevels(staticLevels);
    expect(result).toMatchObject({ valid: true, levelCount: staticLevels.length, errors: [] });
  });

  it("rejects duplicate mainWords", () => {
    const result = validateLevel({ ...validLevel, mainWords: ["METSI", "METSI"] });
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toContain("duplicate");
  });

  it("rejects mainWords missing from gridWords", () => {
    const result = validateLevel({ ...validLevel, mainWords: ["METSI", "SITE"] });
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toContain("missing from gridWords");
  });

  it("rejects words that cannot be formed from letters", () => {
    const result = validateLevel({ ...validLevel, mainWords: ["METSI", "TSELA"] });
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toContain("cannot be formed");
  });

  it("rejects grid overlap conflicts", () => {
    const result = validateLevel({
      ...validLevel,
      gridWords: [
        { word: "METSI", r: 1, c: 0, direction: "H" },
        { word: "TSE", r: 1, c: 1, direction: "V" },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toContain("conflicts");
  });

  it("rejects out-of-bounds grid words", () => {
    const result = validateLevel({
      ...validLevel,
      gridWords: [
        { word: "METSI", r: 1, c: 0, direction: "H" },
        { word: "TSE", r: 5, c: 2, direction: "V" },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toContain("outside");
  });

  it("accepts valid intersections", () => {
    const result = validateLevel(validLevel);
    expect(result.valid).toBe(true);
  });

  it("accepts the server fallback sample shape", () => {
    const result = validateLevel({
      ...validLevel,
      id: 1000,
      levelNumber: 1000,
      title: "Kalahari Oasis Echoes",
    });
    expect(result.valid).toBe(true);
  });
});
