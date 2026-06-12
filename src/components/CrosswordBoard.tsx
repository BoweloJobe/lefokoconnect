import React from "react";
import { GridWord } from "../types";

interface CrosswordBoardProps {
  gridSize: number;
  gridWords: GridWord[];
  foundWords: string[];
  revealedCells?: { [key: string]: string }; // Format: "row,col" => "K"
  accentColor?: string;
  onSelectWordClue?: (clue: string, words: string[]) => void;
}

interface CrosswordCell {
  letter: string;
  isPeakOfWord: boolean;
  wordRefs: string[];
}

export default function CrosswordBoard({
  gridSize,
  gridWords,
  foundWords,
  revealedCells = {},
  accentColor = "#C79A3B",
  onSelectWordClue,
}: CrosswordBoardProps) {
  // Construct the 2D crossword grid layout
  const grid: (CrosswordCell | null)[][] = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(null));

  // Trace words onto the matrix grid
  gridWords.forEach((gw) => {
    for (let i = 0; i < gw.word.length; i++) {
      const letter = gw.word[i].toUpperCase();
      const r = gw.direction === "H" ? gw.r : gw.r + i;
      const c = gw.direction === "H" ? gw.c + i : gw.c;

      if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
        const existing = grid[r][c];
        if (existing) {
          if (existing.letter === letter) {
            existing.wordRefs = Array.from(new Set([...existing.wordRefs, gw.word]));
            existing.isPeakOfWord = existing.isPeakOfWord || i === 0;
          }
        } else {
          grid[r][c] = {
            letter,
            isPeakOfWord: i === 0,
            wordRefs: [gw.word],
          };
        }
      }
    }
  });

  return (
    <div
      className="flex flex-col items-center shrink-0 p-1 sm:p-5 bg-white/70 backdrop-blur-md rounded-xl sm:rounded-2xl border border-orange-100 shadow-inner overflow-hidden max-w-full"
      style={{ boxShadow: "inset 0 2px 8px rgba(122,90,58,0.06)" }}
      id="crossword_board_wrapper"
    >
      <div
        className="grid w-[min(calc(100vw-1rem),33dvh,14rem)] sm:w-auto gap-0.5 sm:gap-1.5 p-1 sm:p-2 bg-slate-900/5 rounded-lg sm:rounded-xl border border-gray-200/40"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
        }}
        id="crossword_grid_layout"
      >
        {grid.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            if (!cell) {
              // Dead space (render empty background)
              return (
                <div
                  key={`empty-${rIdx}-${cIdx}`}
                  className="aspect-square w-full rounded opacity-0 pointer-events-none"
                />
              );
            }

            const cellKey = `${rIdx},${cIdx}`;
            const isGuessed = cell.wordRefs.some((wordRef) => foundWords.includes(wordRef.toUpperCase()));
            const isIndividualHintRevealed = !!revealedCells[cellKey];
            const displayLetter = isGuessed ? cell.letter : isIndividualHintRevealed ? revealedCells[cellKey] : "";

            // Style state
            let boxBg = "bg-white border-orange-100 shadow-sm";
            let textStyle = "text-slate-800 font-bold";

            if (isGuessed) {
              boxBg = "bg-gradient-to-br from-amber-400 to-amber-500 scale-100 border-yellow-200 animate-fadeIn";
              textStyle = "text-white font-extrabold";
            } else if (isIndividualHintRevealed) {
              boxBg = "bg-gradient-to-br from-sky-400 to-sky-500 scale-100 border-sky-200 animate-pulse";
              textStyle = "text-white font-black";
            }

            return (
              <button
                key={`cell-${rIdx}-${cIdx}`}
                id={`cell-${rIdx}-${cIdx}`}
                onClick={() => {
                  const matchingWords = gridWords.filter((gw) => cell.wordRefs.includes(gw.word));
                  if (matchingWords.length === 0) return;

                  const clueText = matchingWords
                    .map((gw) => `${gw.word}: ${gw.clue || "No clue available."}`)
                    .join(" \u2022 ");

                  if (onSelectWordClue) {
                    onSelectWordClue(clueText, matchingWords.map((gw) => gw.word));
                  }
                }}
                disabled={!gridWords.some((gw) => cell.wordRefs.includes(gw.word) && gw.clue)}
                className={`relative aspect-square w-full rounded-md sm:rounded-lg border sm:border-2 flex items-center justify-center transition-all duration-300 focus:outline-none hover:border-amber-400 hover:scale-105 active:scale-95 ${boxBg}`}
              >
                {/* Visual grid cell content */}
                <span className={`text-[clamp(0.75rem,4.2vw,1rem)] sm:text-xl md:text-2xl select-none font-sans uppercase tracking-tight ${textStyle}`}>
                  {displayLetter}
                </span>

                {/* Level index anchor indicator inside peak boxes */}
                {cell.isPeakOfWord && !isGuessed && !isIndividualHintRevealed && (
                  <div className="absolute top-0 left-0.5 sm:top-0.5 sm:left-1 text-[7px] sm:text-[9px] text-gray-400 font-mono font-bold">
                    ✎
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      <p className="hidden sm:flex text-xs text-gray-400 font-mono mt-4 items-center gap-1">
        <span>💡</span> Tap on cells to inspect clues for that word slot!
      </p>
    </div>
  );
}
