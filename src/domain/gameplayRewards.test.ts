import { describe, expect, it } from "vitest";
import { Level } from "../types";
import {
  applyBonusWordReward,
  applyHintCost,
  applyLevelCompletionReward,
  applyMainWordReward,
  bonusWordClaimKey,
  completionClaimKey,
  mainWordClaimKey,
  resolveFailedTimeAttackReturnMode,
  resolveTimeAttackExpiryStatus,
  shouldAcceptMainWord,
  type ClaimContext,
} from "./gameplayRewards";
import { createDefaultUserStats, normalizeUserStats } from "./userStatsStore";

const level: Pick<Level, "id" | "levelNumber"> = { id: 1, levelNumber: 1 };
const classicContext: ClaimContext = { mode: "classic", level };
const dailyContext: ClaimContext = { mode: "daily", level, dailyDateKey: "2026-06-12" };

describe("gameplayRewards", () => {
  it("creates deterministic reward claim keys", () => {
    expect(mainWordClaimKey(classicContext, "kgomo")).toBe("classic:1:1:main:KGOMO");
    expect(completionClaimKey(classicContext)).toBe("classic:1:1:complete");
    expect(bonusWordClaimKey(dailyContext, "mogo")).toBe("daily:2026-06-12:1:1:bonus:MOGO");
  });

  it("first main word reward pays XP and coins", () => {
    const result = applyMainWordReward(createDefaultUserStats(), classicContext, "KGOMO");
    expect(result.awarded).toBe(true);
    expect(result.stats.xp).toBe(25);
    expect(result.stats.coins).toBe(430);
  });

  it("same main word claim does not pay twice", () => {
    const first = applyMainWordReward(createDefaultUserStats(), classicContext, "KGOMO");
    const second = applyMainWordReward(first.stats, classicContext, "KGOMO");
    expect(second.awarded).toBe(false);
    expect(second.stats.xp).toBe(25);
    expect(second.stats.coins).toBe(430);
  });

  it("first level completion pays completion reward", () => {
    const result = applyLevelCompletionReward(createDefaultUserStats(), classicContext);
    expect(result.awarded).toBe(true);
    expect(result.stats.xp).toBe(55);
    expect(result.stats.coins).toBe(470);
    expect(result.stats.gems).toBe(35);
  });

  it("same level completion does not pay twice", () => {
    const first = applyLevelCompletionReward(createDefaultUserStats(), classicContext);
    const second = applyLevelCompletionReward(first.stats, classicContext);
    expect(second.awarded).toBe(false);
    expect(second.stats.xp).toBe(55);
    expect(second.stats.coins).toBe(470);
    expect(second.stats.gems).toBe(35);
  });

  it("Daily first completion pays once and marks date complete", () => {
    const result = applyLevelCompletionReward(createDefaultUserStats(), dailyContext);
    expect(result.awarded).toBe(true);
    expect(result.stats.dailyCompletion["2026-06-12"]).toBe(true);
  });

  it("Daily replay pays no duplicate XP coins or gems", () => {
    const first = applyLevelCompletionReward(createDefaultUserStats(), dailyContext);
    const second = applyLevelCompletionReward(first.stats, dailyContext);
    expect(second.awarded).toBe(false);
    expect(second.stats.xp).toBe(first.stats.xp);
    expect(second.stats.coins).toBe(first.stats.coins);
    expect(second.stats.gems).toBe(first.stats.gems);
  });

  it("Daily replay still allows play state decisions", () => {
    const pendingWords = new Set<string>();
    expect(shouldAcceptMainWord([], pendingWords, "KGOMO")).toBe(true);
  });

  it("bonus word reward pays once", () => {
    const result = applyBonusWordReward(createDefaultUserStats(), classicContext, "MOGO");
    expect(result.awarded).toBe(true);
    expect(result.stats.coins).toBe(415);
    expect(result.stats.bonusBankSize).toBe(1);
  });

  it("bonus word reward cannot be farmed by reset", () => {
    const first = applyBonusWordReward(createDefaultUserStats(), classicContext, "MOGO");
    const second = applyBonusWordReward(first.stats, classicContext, "MOGO");
    expect(second.awarded).toBe(false);
    expect(second.stats.coins).toBe(415);
    expect(second.stats.bonusBankSize).toBe(1);
  });

  it("hint cost deducts even if reward is blocked", () => {
    const first = applyMainWordReward(createDefaultUserStats(), classicContext, "KGOMO");
    const hint = applyHintCost(first.stats, 120);
    const replay = applyMainWordReward(hint.stats, classicContext, "KGOMO");
    expect(hint.allowed).toBe(true);
    expect(replay.awarded).toBe(false);
    expect(replay.stats.coins).toBe(310);
  });

  it("insufficient coins blocks hint helper", () => {
    const result = applyHintCost({ ...createDefaultUserStats(), coins: 10 }, 50);
    expect(result.allowed).toBe(false);
    expect(result.stats.coins).toBe(10);
  });

  it("Time Attack failure does not mark completion", () => {
    expect(resolveTimeAttackExpiryStatus()).toBe("failed");
    expect(resolveTimeAttackExpiryStatus()).not.toBe("completed");
    expect(resolveFailedTimeAttackReturnMode()).toBe("classic");
  });

  it("achievement progress does not duplicate on claimed main word", () => {
    const first = applyMainWordReward(createDefaultUserStats(), classicContext, "KGOMO");
    const second = applyMainWordReward(first.stats, classicContext, "KGOMO");
    expect(first.stats.achievements.find((ach) => ach.id === "first_solve")?.currentValue).toBe(1);
    expect(second.stats.achievements.find((ach) => ach.id === "first_solve")?.currentValue).toBe(1);
  });

  it("corrupt or missing reward ledger migrates safely", () => {
    const normalized = normalizeUserStats({ coins: 10, rewardClaims: "bad" });
    expect(normalized.coins).toBe(10);
    expect(normalized.rewardClaims.mainWords).toEqual({});
  });
});
