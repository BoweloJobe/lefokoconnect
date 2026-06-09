import type { Level } from "../types";

export function getDailyDateKey(date = new Date()): string {
  return date.toISOString().split("T")[0];
}

export function pickDailyLevel(levels: Level[], dateKey: string): Level {
  if (!levels.length) {
    throw new Error("No available levels for daily selection.");
  }

  const index = [...dateKey].reduce((sum, char) => sum + char.charCodeAt(0), 0) % levels.length;
  return levels[index];
}
