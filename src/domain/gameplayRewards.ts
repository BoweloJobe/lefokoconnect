import { Achievement, Level, UserStats } from "../types";

export type GameMode = "classic" | "daily" | "timed";

export interface ClaimContext {
  mode: GameMode;
  level: Pick<Level, "id" | "levelNumber">;
  dailyDateKey?: string;
}

export interface RewardResult {
  stats: UserStats;
  awarded: boolean;
  amount: {
    xp: number;
    coins: number;
    gems: number;
  };
  claimKey: string;
  practiceReplay: boolean;
  unlockedMessages: string[];
}

export interface HintDecision {
  allowed: boolean;
  stats: UserStats;
  message: string;
}

function contextPrefix(context: ClaimContext): string {
  if (context.mode === "daily") {
    return `daily:${context.dailyDateKey || "unknown"}:${context.level.id}:${context.level.levelNumber}`;
  }
  return `${context.mode}:${context.level.id}:${context.level.levelNumber}`;
}

export function mainWordClaimKey(context: ClaimContext, word: string): string {
  return `${contextPrefix(context)}:main:${word.toUpperCase()}`;
}

export function completionClaimKey(context: ClaimContext): string {
  return `${contextPrefix(context)}:complete`;
}

export function bonusWordClaimKey(context: ClaimContext, word: string): string {
  return `${contextPrefix(context)}:bonus:${word.toUpperCase()}`;
}

export function applyAchievementProgress(
  achievements: Achievement[],
  increments: Array<{ id: string; amount: number }>,
) {
  const unlockedMessages: string[] = [];
  const incrementMap = new Map(increments.map((item) => [item.id, item.amount]));

  const updatedAchievements = achievements.map((ach) => {
    const amount = incrementMap.get(ach.id) || 0;
    if (!amount) return ach;
    const nextValue = Math.min(ach.requiredValue, ach.currentValue + amount);
    const newlyUnlocked = !ach.unlocked && nextValue >= ach.requiredValue;
    if (newlyUnlocked) {
      unlockedMessages.push(`ACHIEVEMENT UNLOCKED: "${ach.title}"! Claimed bonus rewards!`);
    }
    return {
      ...ach,
      currentValue: nextValue,
      unlocked: ach.unlocked || newlyUnlocked,
      unlockedAt: newlyUnlocked ? new Date().toISOString() : ach.unlockedAt,
    };
  });

  return { updatedAchievements, unlockedMessages };
}

export function isDailyPracticeReplay(stats: UserStats, dailyDateKey: string): boolean {
  return !!stats.dailyCompletion[dailyDateKey];
}

export function applyHintCost(stats: UserStats, cost: number): HintDecision {
  if (stats.coins < cost) {
    return {
      allowed: false,
      stats,
      message: `Need ${cost} Gold for this hint.`,
    };
  }
  return {
    allowed: true,
    stats: {
      ...stats,
      coins: stats.coins - cost,
    },
    message: `Hint used. -${cost} Gold`,
  };
}

export function applyMainWordReward(stats: UserStats, context: ClaimContext, word: string): RewardResult {
  const key = mainWordClaimKey(context, word);
  const alreadyClaimed = !!stats.rewardClaims.mainWords[key];
  if (alreadyClaimed) {
    return {
      stats,
      awarded: false,
      amount: { xp: 0, coins: 0, gems: 0 },
      claimKey: key,
      practiceReplay: context.mode === "daily" && !!context.dailyDateKey && isDailyPracticeReplay(stats, context.dailyDateKey),
      unlockedMessages: [],
    };
  }

  const { updatedAchievements, unlockedMessages } = applyAchievementProgress(stats.achievements, [
    { id: "first_solve", amount: 1 },
  ]);

  return {
    stats: {
      ...stats,
      xp: stats.xp + 25,
      coins: stats.coins + 30,
      totalWordsSolved: stats.totalWordsSolved + 1,
      achievements: updatedAchievements,
      rewardClaims: {
        ...stats.rewardClaims,
        mainWords: { ...stats.rewardClaims.mainWords, [key]: true },
      },
    },
    awarded: true,
    amount: { xp: 25, coins: 30, gems: 0 },
    claimKey: key,
    practiceReplay: false,
    unlockedMessages,
  };
}

export function applyLevelCompletionReward(stats: UserStats, context: ClaimContext): RewardResult {
  const key = completionClaimKey(context);
  const alreadyClaimed = !!stats.rewardClaims.levelCompletions[key];
  const dailyKey = context.dailyDateKey || "";
  const nextDailyCompletion = context.mode === "daily" && dailyKey
    ? { ...stats.dailyCompletion, [dailyKey]: true }
    : stats.dailyCompletion;

  if (alreadyClaimed) {
    return {
      stats: {
        ...stats,
        dailyCompletion: nextDailyCompletion,
      },
      awarded: false,
      amount: { xp: 0, coins: 0, gems: 0 },
      claimKey: key,
      practiceReplay: context.mode === "daily" && !!dailyKey,
      unlockedMessages: [],
    };
  }

  const { updatedAchievements, unlockedMessages } = applyAchievementProgress(stats.achievements, [
    { id: "five_levels", amount: 1 },
  ]);

  return {
    stats: {
      ...stats,
      xp: stats.xp + 55,
      coins: stats.coins + 70,
      gems: stats.gems + 10,
      achievements: updatedAchievements,
      dailyCompletion: nextDailyCompletion,
      rewardClaims: {
        ...stats.rewardClaims,
        levelCompletions: { ...stats.rewardClaims.levelCompletions, [key]: true },
      },
    },
    awarded: true,
    amount: { xp: 55, coins: 70, gems: 10 },
    claimKey: key,
    practiceReplay: false,
    unlockedMessages,
  };
}

export function applyBonusWordReward(stats: UserStats, context: ClaimContext, word: string): RewardResult {
  const key = bonusWordClaimKey(context, word);
  const alreadyClaimed = !!stats.rewardClaims.bonusWords[key];
  if (alreadyClaimed) {
    return {
      stats,
      awarded: false,
      amount: { xp: 0, coins: 0, gems: 0 },
      claimKey: key,
      practiceReplay: context.mode === "daily" && !!context.dailyDateKey && isDailyPracticeReplay(stats, context.dailyDateKey),
      unlockedMessages: [],
    };
  }

  const { updatedAchievements, unlockedMessages } = applyAchievementProgress(stats.achievements, [
    { id: "bonus_word", amount: 1 },
  ]);

  return {
    stats: {
      ...stats,
      coins: stats.coins + 15,
      bonusBankSize: stats.bonusBankSize + 1,
      achievements: updatedAchievements,
      rewardClaims: {
        ...stats.rewardClaims,
        bonusWords: { ...stats.rewardClaims.bonusWords, [key]: true },
      },
    },
    awarded: true,
    amount: { xp: 0, coins: 15, gems: 0 },
    claimKey: key,
    practiceReplay: false,
    unlockedMessages,
  };
}

export function resolveFailedTimeAttackReturnMode(): "classic" {
  return "classic";
}

export function resolveTimeAttackExpiryStatus(): "failed" {
  return "failed";
}

export function shouldAcceptMainWord(foundWords: string[], pendingWords: Set<string>, word: string): boolean {
  const normalized = word.toUpperCase();
  return !foundWords.map((found) => found.toUpperCase()).includes(normalized) && !pendingWords.has(normalized);
}
