import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { validateLevel } from "./src/domain/levelValidator";
import type { Level } from "./src/types";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

app.use(helmet({
  contentSecurityPolicy: isProduction
    ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
        },
      }
    : false,
}));
app.use(express.json({ limit: "20kb" }));

function warnProductionConfig() {
  if (!isProduction) return;
  if (!process.env.APP_URL) {
    console.warn("APP_URL is not configured. Set it to the public deployed origin.");
  }
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
    console.warn("GEMINI_API_KEY is not configured. Base gameplay still works, but AI hints/generation will use fallbacks.");
  }
  if (!process.env.ADMIN_TOKEN || process.env.ADMIN_TOKEN === "change-me-to-a-long-random-token") {
    console.warn("ADMIN_TOKEN is not configured. Admin AI puzzle generation will return 503.");
  }
}

warnProductionConfig();

const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const puzzleRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
});

// Lazy-loaded Gemini AI client to prevent crashes if key is omitted
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY secret environment variable is missing.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

function sanitizeLettersInput(seedLetters: unknown): string[] {
  if (seedLetters === undefined || seedLetters === null || seedLetters === "") {
    return ["M", "E", "T", "S", "I"];
  }
  if (typeof seedLetters !== "string") {
    throw new Error("seedLetters must be a string.");
  }

  const compact = seedLetters.replace(/,/g, "").trim().toUpperCase();
  if (!/^[A-Z]+$/.test(compact)) {
    throw new Error("seedLetters may only contain alphabetic characters and commas.");
  }
  if (compact.length < 3 || compact.length > 8) {
    throw new Error("seedLetters must contain 3 to 8 letters.");
  }
  return [...compact];
}

function sanitizeWordInput(word: unknown): string {
  if (typeof word !== "string") {
    throw new Error("word must be a string.");
  }
  const normalized = word.trim().toUpperCase();
  if (!/^[A-Z]+$/.test(normalized) || normalized.length < 2 || normalized.length > 24) {
    throw new Error("word must be 2 to 24 alphabetic characters.");
  }
  return normalized;
}

function requireAdminToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const expectedToken = process.env.ADMIN_TOKEN;
  if (!expectedToken || expectedToken === "change-me-to-a-long-random-token") {
    return res.status(503).json({ error: "Admin puzzle generation is not configured." });
  }

  const header = req.header("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expectedToken);
  const tokenMatches = tokenBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(tokenBuffer, expectedBuffer);
  if (!tokenMatches) {
    return res.status(401).json({ error: "Admin token required." });
  }

  next();
}

function toLevel(candidate: any, fallbackLetters: string[]): Level {
  return {
    id: Number(candidate.id) || Date.now(),
    levelNumber: Number(candidate.levelNumber) || Math.floor(Math.random() * 9000) + 1000,
    title: String(candidate.title || "Generated Setswana Path").trim(),
    letters: Array.isArray(candidate.letters) ? candidate.letters.map((letter: unknown) => String(letter).trim().toUpperCase()) : fallbackLetters,
    mainWords: Array.isArray(candidate.mainWords) ? candidate.mainWords.map((word: unknown) => String(word).trim().toUpperCase()) : [],
    bonusWords: Array.isArray(candidate.bonusWords) ? candidate.bonusWords.map((word: unknown) => String(word).trim().toUpperCase()) : [],
    gridSize: Number(candidate.gridSize) || 6,
    difficulty: (["beginner", "intermediate", "advanced", "expert"].includes(candidate.difficulty)
      ? candidate.difficulty
      : "intermediate") as Level["difficulty"],
    themeName: String(candidate.themeName || "Kalahari Grazing Lands").trim(),
    gridWords: Array.isArray(candidate.gridWords)
      ? candidate.gridWords.map((gridWord: any) => ({
          word: String(gridWord.word || "").trim().toUpperCase(),
          r: Number(gridWord.r),
          c: Number(gridWord.c),
          direction: gridWord.direction === "V" ? "V" : "H",
          clue: String(gridWord.clue || "A Setswana cultural vocabulary term.").trim(),
        }))
      : [],
  };
}

function getFallbackLevel(): Level {
  return {
    id: Date.now(),
    levelNumber: Math.floor(Math.random() * 9000) + 1000,
    title: "Kalahari Oasis Echoes",
    letters: ["M", "E", "T", "S", "I"],
    mainWords: ["METSI", "TSE"],
    bonusWords: ["ME", "SE"],
    gridSize: 6,
    difficulty: "beginner",
    themeName: "Kalahari Grazing Lands",
    gridWords: [
      { word: "METSI", r: 1, c: 0, direction: "H", clue: "Water, a precious blessing in Botswana." },
      { word: "TSE", r: 1, c: 2, direction: "V", clue: "A Setswana demonstrative for these ones." },
    ],
  };
}

// 1. API: HEALTH CHECK REST ENDPOINT
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY",
  });
});

// 2. API: SECURE SERVER-SIDE GEMINI LEVEL COMPILER
app.post("/api/puzzle/generate", puzzleRateLimit, requireAdminToken, async (req, res) => {
  let lettersPool: string[] = ["M", "E", "T", "S", "I"];
  try {
    lettersPool = sanitizeLettersInput(req.body?.seedLetters);

    const ai = getAIClient();

    const promptText = `
      You are a Setswana language expert and word game puzzle compiler for "LefokoConnect".
      Generate a balanced valid word connect puzzle layout.
      The letters to arrange are: ${lettersPool.join(", ")}.
      
      Requirements:
      1. Choose valid Setswana words that can be made using these letters. Examples of valid Setswana words: METSI, TEMO, METS, TE, MERA, MO, SE, LERATO, PULA, KGOMO, MOGO, TSHEPO, NGWANA, NALEDI, PITSE, KGOSI, LEFOKO, KGOTLA, THUTO, DUMELA, BALOI.
      2. Place at least 2 or 3 of these words on a small crossword style grid (gridSize should be between 5 and 8).
      3. The words in the grid (defined in gridWords) MUST intersect on shared letters. Double check that the intersecting row/col index has the exact same character in both words.
      4. Support an interesting decorative title and Botswana theme name.
      5. Output a strictly aligned, compliant JSON output containing the crossword placements.
    `;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: promptText,
      config: {
        systemInstruction: "You compile word puzzles containing Setswana vocabulary. You speak fluent Setswana and English.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["title", "letters", "mainWords", "bonusWords", "gridSize", "gridWords", "difficulty", "themeName"],
          properties: {
            title: {
              type: Type.STRING,
              description: "A beautiful poetic name for the level, e.g. 'Desert Oasis Shadows'",
            },
            letters: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "The uppercase letters arranged in the wheel.",
            },
            mainWords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "All correct Setswana words to find on the grid, in uppercase.",
            },
            bonusWords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Other acceptable Setswana words that aren't on the crossword.",
            },
            gridSize: {
              type: Type.INTEGER,
              description: "Width/height dimension of the 2D grid matrix (e.g., 6 or 8).",
            },
            difficulty: {
              type: Type.STRING,
              description: "Must be 'beginner', 'intermediate', 'advanced', or 'expert'.",
            },
            themeName: {
              type: Type.STRING,
              description: "A cultural branding theme from Botswana imagery, e.g., 'Kalahari Grazing Lands'",
            },
            gridWords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["word", "r", "c", "direction", "clue"],
                properties: {
                  word: { type: Type.STRING, description: "The solution word in uppercase." },
                  r: { type: Type.INTEGER, description: "Starting row index, 0-indexed." },
                  c: { type: Type.INTEGER, description: "Starting column index, 0-indexed." },
                  direction: { type: Type.STRING, description: "Must be either 'H' or 'V'." },
                  clue: { type: Type.STRING, description: "A highly educational grammatical/cultural clue in English." },
                },
              },
            },
          },
        },
      },
    });

    const bodyText = response.text;
    if (!bodyText) {
      throw new Error("Empty text returned from Gemini model.");
    }

    const parsed = JSON.parse(bodyText.trim());
    const compiledLevel = toLevel(
      {
        ...parsed,
        id: Math.floor(Math.random() * 999999) + 100,
        levelNumber: Math.floor(Math.random() * 9000) + 1000,
      },
      lettersPool,
    );
    const validation = validateLevel(compiledLevel);
    if (!validation.valid) {
      if (!isProduction) {
        console.error("Generated level validation failed:", validation.errors);
      }
      const fallbackLevel = getFallbackLevel();
      const fallbackValidation = validateLevel(fallbackLevel);
      if (!fallbackValidation.valid) {
        return res.status(500).json({ error: "Failed to generate valid puzzle" });
      }
      return res.json({ ...fallbackLevel, fallbackActive: true });
    }

    return res.json(compiledLevel);
  } catch (err: any) {
    if (!isProduction) {
      console.error("Gemini puzzle generation error:", err);
    }
    if (err instanceof Error && err.message.includes("seedLetters")) {
      return res.status(400).json({ error: err.message });
    }
    const fallbackLevel = getFallbackLevel();
    return res.status(500).json({
      error: "Failed to generate puzzle",
      fallbackActive: true,
      fallbackLevel,
    });
  }
});

// 3. API: SECURE SMART CONTEXTUAL / CULTURAL AI HINT
app.post("/api/hint/explain", aiRateLimit, async (req, res) => {
  let normalizedWord = "LEFOKO";
  try {
    normalizedWord = sanitizeWordInput(req.body?.word);
    const category = typeof req.body?.category === "string" ? req.body.category.slice(0, 32) : "general";

    const ai = getAIClient();

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Provide a short, rich, 2-sentence cultural summary and grammatical context for the Setswana word: "${normalizedWord}" (category: ${category}). Translate it to English and explain its significance in Botswana villages, agricultural culture, traditional food, or leadership. Keep it compact.`,
    });

    res.json({
      word: normalizedWord,
      explanation: response.text?.trim() || "No explanation available.",
    });
  } catch (err: any) {
    if (!isProduction) {
      console.error("Gemini hint error:", err);
    }
    if (err instanceof Error && err.message.includes("word must")) {
      return res.status(400).json({ error: err.message });
    }
    res.json({
      word: normalizedWord,
      explanation: `"${normalizedWord}" represents traditional Batswana linguistic heritage. Smart AI explanations are temporarily unavailable.`,
    });
  }
});

// Start routing and asset pipeline
async function initializeServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LefokoConnect node server running on port ${PORT}`);
  });
}

initializeServer();
