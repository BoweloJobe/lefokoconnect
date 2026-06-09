import { describe, expect, it } from "vitest";
import { getDailyDateKey, pickDailyLevel } from "./dailyLevelUtils";
import { staticLevels } from "../data/dictionary";

describe("dailyLevelUtils", () => {
  it("returns a fixed date key for a given date", () => {
    const date = new Date("2026-06-09T12:00:00Z");
    expect(getDailyDateKey(date)).toBe("2026-06-09");
  });

  it("selects a deterministic daily level for the same date", () => {
    const key = "2026-06-09";
    const first = pickDailyLevel(staticLevels, key);
    const second = pickDailyLevel(staticLevels, key);
    expect(first).toBe(second);
  });

  it("selects different daily levels for different dates when enough levels exist", () => {
    const first = pickDailyLevel(staticLevels, "2026-06-09");
    const second = pickDailyLevel(staticLevels, "2026-06-10");
    expect(first).not.toBe(second);
  });

  it("throws when no levels are available", () => {
    expect(() => pickDailyLevel([], "2026-06-09")).toThrow("No available levels for daily selection.");
  });
});
