export interface SetswanaWord {
  word: string; // uppercase representation, e.g., "KGOMO"
  english: string; // English translation, e.g., "Cow"
  category: "animal" | "everyday" | "verb" | "noun" | "cliché" | "expression" | "place" | "proverb" | "cultural";
  culturalContext?: string; // rich cultural details and significance in Botswana
  syllables?: string[]; // e.g., ["kgo", "mo"]
}

export interface CellPosition {
  r: number; // row
  c: number; // col
}

export interface GridWord {
  word: string;
  r: number; // start row
  c: number; // start col
  direction: "H" | "V"; // Horizontal or Vertical
  clue?: string;
}

export interface Level {
  id: number;
  levelNumber: number;
  title: string;
  letters: string[]; // e.g., ["K", "G", "O", "M", "A"]
  mainWords: string[]; // words that go on the grid
  bonusWords: string[]; // optional valid dictionary words
  gridSize: number; // e.g., 8
  gridWords: GridWord[]; // placement definitions for crossword board
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  themeName: string; // cultural theme, e.g., "Okavango Delta Wildlife"
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string; // lucide icon identifier
  requiredValue: number;
  currentValue: number;
  rewardCoins: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface DailyChallenge {
  date: string; // YYYY-MM-DD
  letters: string[];
  mainWords: string[];
  gridWords: GridWord[];
  gridSize: number;
  completed: boolean;
  rewardClaimed: boolean;
  theme: string;
}

export interface UserStats {
  xp: number;
  coins: number;
  gems: number;
  level: number;
  dailyStreak: number;
  lastLoginDate: string;
  classicLevelProgress: number; // e.g. level 1
  bonusBankSize: number;
  totalWordsSolved: number;
  achievements: Achievement[];
  dailyCompletion: Record<string, boolean>;
  rewardClaims: {
    mainWords: Record<string, boolean>;
    levelCompletions: Record<string, boolean>;
    bonusWords: Record<string, boolean>;
  };
}

export interface GameSessionState {
  currentLevel: Level;
  foundWords: string[]; // solved words on crossword board
  bonusWordsFound: string[]; // bonus words found
  swipedLetters: string[]; // dynamic letters selected by swipe
  score: number;
  timeRemaining?: number; // for Timed Mode
  status: "playing" | "completed" | "failed";
}

// AI response formats
export interface AIHintPayload {
  letter: string;
  gridIndex: number; // cells array index
  commentary: string; // contextual Setswana language tip from Gemini
}

export interface AIPuzzlePayload {
  letters: string[];
  mainWords: string[];
  gridSize: number;
  gridWords: GridWord[];
  theme: string;
  difficulty: string;
}

export type AdminContentSource = "admin" | "import" | "ai";

export interface UploadedContentMeta {
  contentId: string;
  source: AdminContentSource;
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface UploadedDictionaryWord extends SetswanaWord, UploadedContentMeta {}

export interface UploadedLevel extends UploadedContentMeta {
  level: Level;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export interface AdminContentBundle {
  schemaVersion: 1;
  words: UploadedDictionaryWord[];
  levels: UploadedLevel[];
  exportedAt?: string;
}
