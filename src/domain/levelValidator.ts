import { GridWord, Level } from "../types";

export interface LevelValidationOptions {
  allowDisconnected?: boolean;
}

export interface LevelValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface LevelValidationSummary extends LevelValidationResult {
  levelCount: number;
}

type CellMap = Map<string, { letter: string; words: string[] }>;

const normalize = (value: string) => value.trim().toUpperCase();

export function canFormWordFromLetters(word: string, letters: string[]): boolean {
  const available = new Map<string, number>();
  letters.map(normalize).forEach((letter) => {
    available.set(letter, (available.get(letter) || 0) + 1);
  });

  for (const letter of normalize(word)) {
    const count = available.get(letter) || 0;
    if (count <= 0) return false;
    available.set(letter, count - 1);
  }

  return true;
}

function traceGridWord(gridWord: GridWord): Array<{ key: string; letter: string; r: number; c: number }> {
  return [...normalize(gridWord.word)].map((letter, index) => {
    const r = gridWord.direction === "H" ? gridWord.r : gridWord.r + index;
    const c = gridWord.direction === "H" ? gridWord.c + index : gridWord.c;
    return { key: `${r},${c}`, letter, r, c };
  });
}

export function buildGridCellMap(gridWords: GridWord[]): CellMap {
  const cells: CellMap = new Map();
  gridWords.forEach((gridWord) => {
    traceGridWord(gridWord).forEach(({ key, letter }) => {
      const existing = cells.get(key);
      if (existing) {
        existing.words.push(normalize(gridWord.word));
      } else {
        cells.set(key, { letter, words: [normalize(gridWord.word)] });
      }
    });
  });
  return cells;
}

export function findGridConflicts(gridWords: GridWord[]): string[] {
  const conflicts: string[] = [];
  const cells: CellMap = new Map();
  gridWords.forEach((gridWord) => {
    traceGridWord(gridWord).forEach(({ key, letter }) => {
      const existing = cells.get(key);
      if (existing && existing.letter !== letter) {
        conflicts.push(`grid cell ${key} conflicts: "${existing.letter}" from ${existing.words.join(", ")} vs "${letter}" from ${normalize(gridWord.word)}.`);
      } else if (existing) {
        existing.words.push(normalize(gridWord.word));
      } else {
        cells.set(key, { letter, words: [normalize(gridWord.word)] });
      }
    });
  });
  return conflicts;
}

export function validateLevel(level: Level, options: LevelValidationOptions = {}): LevelValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!level.id) {
    errors.push("level.id is required.");
  }

  if (!level.title?.trim()) {
    errors.push("level.title is required.");
  }

  if (!level.letters?.length || level.letters.length < 3) {
    errors.push("letters must contain at least 3 entries.");
  }

  const letters = (level.letters || []).map(normalize);
  const mainWords = (level.mainWords || []).map(normalize);
  const bonusWords = (level.bonusWords || []).map(normalize);
  const gridWords = (level.gridWords || []).map((gridWord) => ({
    ...gridWord,
    word: normalize(gridWord.word),
  }));
  const gridWordSet = new Set(gridWords.map((gridWord) => gridWord.word));
  const mainWordSet = new Set(mainWords);

  if (mainWordSet.size !== mainWords.length) {
    errors.push("mainWords contains duplicate entries.");
  }

  if (gridWordSet.size !== gridWords.length) {
    errors.push("gridWords contains duplicate word entries.");
  }

  mainWords.forEach((word) => {
    if (!gridWordSet.has(word)) {
      errors.push(`mainWord "${word}" is missing from gridWords.`);
    }
    if (!canFormWordFromLetters(word, letters)) {
      errors.push(`mainWord "${word}" cannot be formed from letters [${letters.join(", ")}].`);
    }
  });

  bonusWords.forEach((word) => {
    if (!canFormWordFromLetters(word, letters)) {
      errors.push(`bonusWord "${word}" cannot be formed from letters [${letters.join(", ")}].`);
    }
    if (mainWordSet.has(word)) {
      warnings.push(`bonusWord "${word}" duplicates a mainWord.`);
    }
  });

  gridWords.forEach((gridWord) => {
    if (!mainWordSet.has(gridWord.word)) {
      errors.push(`gridWord "${gridWord.word}" is not listed in mainWords.`);
    }
    if (!canFormWordFromLetters(gridWord.word, letters)) {
      errors.push(`gridWord "${gridWord.word}" cannot be formed from letters [${letters.join(", ")}].`);
    }
    if (gridWord.direction !== "H" && gridWord.direction !== "V") {
      errors.push(`gridWord "${gridWord.word}" has invalid direction "${gridWord.direction}".`);
    }
    if (!Number.isInteger(gridWord.r) || !Number.isInteger(gridWord.c)) {
      errors.push(`gridWord "${gridWord.word}" must have integer r and c coordinates.`);
    }
  });

  const cells: CellMap = new Map();
  let matchingIntersections = 0;

  gridWords.forEach((gridWord) => {
    traceGridWord(gridWord).forEach(({ key, letter, r, c }) => {
      if (r < 0 || r >= level.gridSize || c < 0 || c >= level.gridSize) {
        errors.push(`gridWord "${gridWord.word}" cell ${key} is outside ${level.gridSize}x${level.gridSize} board.`);
      }

      const existing = cells.get(key);
      if (existing) {
        if (existing.letter !== letter) {
          errors.push(
            `grid cell ${key} conflicts: "${existing.letter}" from ${existing.words.join(", ")} vs "${letter}" from ${gridWord.word}.`,
          );
        } else if (!existing.words.includes(gridWord.word)) {
          matchingIntersections += 1;
          existing.words.push(gridWord.word);
        }
      } else {
        cells.set(key, { letter, words: [gridWord.word] });
      }
    });
  });

  if (!options.allowDisconnected && gridWords.length > 1 && matchingIntersections === 0) {
    errors.push("multi-word level has no valid word intersections.");
  } else if (options.allowDisconnected && gridWords.length > 1 && matchingIntersections === 0) {
    warnings.push("multi-word level has no valid word intersections.");
  }

  if (mainWordSet.size !== gridWordSet.size) {
    errors.push("mainWords and gridWords do not contain the same unique words.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateLevels(levels: Level[], options: LevelValidationOptions = {}): LevelValidationSummary {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenIds = new Set<number>();

  levels.forEach((level) => {
    if (seenIds.has(level.id)) {
      errors.push(`Level ${level.levelNumber} (${level.title}): duplicate level.id "${level.id}".`);
    }
    seenIds.add(level.id);

    const result = validateLevel(level, options);
    errors.push(...result.errors.map((error) => `Level ${level.levelNumber} (${level.title}): ${error}`));
    warnings.push(...result.warnings.map((warning) => `Level ${level.levelNumber} (${level.title}): ${warning}`));
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    levelCount: levels.length,
  };
}
