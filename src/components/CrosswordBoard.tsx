import React from "react";
import { GridWord } from "../types";

interface CrosswordBoardProps {
  gridSize: number;
  gridWords: GridWord[];
  foundWords: string[];
  revealedCells?: { [key: string]: string }; // Format: "row,col" => "K"
  accentColor?: string;
  onSelectWordClue?: (clue: string, word: string) => void;
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
  const grid: ({ letter: string; isPeakOfWord: boolean; wordRef: string } | null)[][] = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(null));

  // Trace words onto the matrix grid
  gridWords.forEach((gw) => {
    const isGuessed = foundWords.includes(gw.word.toUpperCase());
    for (let i = 0; i < gw.word.length; i++) {
      const letter = gw.word[i].toUpperCase();
      const r = gw.direction === "H" ? gw.r : gw.r + i;
      const c = gw.direction === "H" ? gw.c + i : gw.c;

      if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
        // Only set letter if empty or overlapping matches
        grid[r][c] = {
          letter,
          isPeakOfWord: i === 0,
          wordRef: gw.word,
        };
      }
    }
  });

  return (
    <div
      className="flex flex-col items-center p-3 sm:p-5 bg-white/70 backdrop-blur-md rounded-2xl border border-orange-100 shadow-inner overflow-auto max-w-full"
      style={{ boxShadow: "inset 0 2px 8px rgba(122,90,58,0.06)" }}
      id="crossword_board_wrapper"
    >
      <div
        className="grid gap-1 sm:gap-1.5 p-2 bg-slate-900/5 rounded-xl border border-gray-200/40"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, minmax(1.8rem, 3.2rem))`,
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
            const isGuessed = foundWords.includes(cell.wordRef.toUpperCase());
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
                  const matchingWord = gridWords.find((gw) => gw.word === cell.wordRef);
                  if (matchingWord && onSelectWordClue && matchingWord.clue) {
                    onSelectWordClue(matchingWord.clue, matchingWord.word);
                  }
                }}
                disabled={!gridWords.find((gw) => gw.word === cell.wordRef)?.clue}
                className={`relative aspect-square w-full rounded-lg border-2 flex items-center justify-center transition-all duration-300 focus:outline-none hover:border-amber-400 hover:scale-105 active:scale-95 ${boxBg}`}
              >
                {/* Visual grid cell content */}
                <span className={`text-base sm:text-xl md:text-2xl select-none font-sans uppercase tracking-tight ${textStyle}`}>
                  {displayLetter}
                </span>

                {/* Level index anchor indicator inside peak boxes */}
                {cell.isPeakOfWord && !isGuessed && !isIndividualHintRevealed && (
                  <div className="absolute top-0.5 left-1 text-[8px] sm:text-[9px] text-gray-400 font-mono font-bold">
                    ✎
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      <p className="text-xs text-gray-400 font-mono mt-4 flex items-center gap-1">
        <span>💡</span> Tap on cells to inspect clues for that word slot!
      </p>
    </div>
  );
}
