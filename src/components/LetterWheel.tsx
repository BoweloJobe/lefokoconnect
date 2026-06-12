import React, { useState, useEffect, useRef } from "react";
import { soundEngine } from "./AudioSynthesizer";
import { Shuffle } from "lucide-react";

interface LetterWheelProps {
  letters: string[];
  onWordComplete: (word: string) => void;
  accentColor?: string; // e.g. deep gold or Botswana blue
  onShuffleRequest?: () => void;
  isInputEnabled?: boolean;
}

interface LetterNode {
  letter: string;
  angle: number; // in radians
  x: number;
  y: number;
}

export default function LetterWheel({
  letters,
  onWordComplete,
  accentColor = "#C79A3B",
  onShuffleRequest,
  isInputEnabled = true,
}: LetterWheelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const pendingTapIndexRef = useRef<number>(-1);
  const hasActiveSwipeRef = useRef(false);
  const selectedIndicesRef = useRef<number[]>([]);

  const [nodes, setNodes] = useState<LetterNode[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [wheelKey, setWheelKey] = useState(0); // for shuffle animation resets

  useEffect(() => {
    selectedIndicesRef.current = selectedIndices;
  }, [selectedIndices]);

  // Initialize circular coordinates for letter nodes
  useEffect(() => {
    const center = 140; // inside 280x280 box
    const radius = 95;
    const computed = letters.map((letter, index) => {
      const angle = (index * 2 * Math.PI) / letters.length - Math.PI / 2; // start at top center
      return {
        letter: letter.toUpperCase(),
        angle,
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
      };
    });
    setNodes(computed);
    setSelectedIndices([]);
    selectedIndicesRef.current = [];
    setIsSwiping(false);
    setDragPosition(null);
  }, [letters, wheelKey]);

  useEffect(() => {
    if (!isInputEnabled) {
      activePointerIdRef.current = null;
      pointerStartRef.current = null;
      pendingTapIndexRef.current = -1;
      hasActiveSwipeRef.current = false;
      setSelectedIndices([]);
      selectedIndicesRef.current = [];
      setIsSwiping(false);
      setDragPosition(null);
    }
  }, [isInputEnabled]);

  // Handle shuffling letter node order locally (with visual feedback)
  const handleShuffle = () => {
    soundEngine.playShuffle();
    if (onShuffleRequest) {
      onShuffleRequest();
    } else {
      setWheelKey((prev) => prev + 1);
    }
  };

  const getPointerPos = (
    e:
      | React.MouseEvent
      | React.TouchEvent
      | React.PointerEvent
      | TouchEvent
      | MouseEvent
      | PointerEvent,
  ) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Scale to matches internal 280x280 coordinate system
    const x = ((clientX - rect.left) / rect.width) * 280;
    const y = ((clientY - rect.top) / rect.height) * 280;
    return { x, y };
  };

  const checkCollision = (posX: number, posY: number) => {
    const letterTouchRadius = 32; // hot zone size
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const dist = Math.sqrt(Math.pow(node.x - posX, 2) + Math.pow(node.y - posY, 2));
      if (dist <= letterTouchRadius) {
        return i;
      }
    }
    return -1;
  };

  const addCollisionIndex = (collidedIdx: number) => {
    setSelectedIndices((prev) => {
      if (collidedIdx === -1) {
        selectedIndicesRef.current = prev;
        return prev;
      }
      if (prev.length === 0) {
        soundEngine.playLetterConnect(0);
        const next = [collidedIdx];
        selectedIndicesRef.current = next;
        return next;
      }

      if (!prev.includes(collidedIdx)) {
        soundEngine.playLetterConnect(prev.length);
        const next = [...prev, collidedIdx];
        selectedIndicesRef.current = next;
        return next;
      }

      if (prev.length > 1 && prev[prev.length - 2] === collidedIdx) {
        soundEngine.playLetterConnect(Math.max(0, prev.length - 2));
        const next = prev.slice(0, -1);
        selectedIndicesRef.current = next;
        return next;
      }

      selectedIndicesRef.current = prev;
      return prev;
    });
  };

  const beginSwipe = (startIndex: number, collidedIdx: number) => {
    hasActiveSwipeRef.current = true;
    setIsSwiping(true);

    if (startIndex !== -1) {
      soundEngine.playLetterConnect(0);
      const initialSelection = [startIndex];
      selectedIndicesRef.current = initialSelection;
      setSelectedIndices(initialSelection);
      if (collidedIdx !== -1 && collidedIdx !== startIndex) {
        setSelectedIndices((prev) => {
          soundEngine.playLetterConnect(prev.length);
          const next = [...prev, collidedIdx];
          selectedIndicesRef.current = next;
          return next;
        });
      }
    } else {
      setSelectedIndices([]);
      selectedIndicesRef.current = [];
      addCollisionIndex(collidedIdx);
    }
  };

  // Start tracking a pointer. Tap mode is resolved on release; swipe mode starts after movement.
  const startDrag = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isInputEnabled || activePointerIdRef.current !== null) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    e.preventDefault();
    const pos = getPointerPos(e);
    if (!pos) return;

    activePointerIdRef.current = e.pointerId;
    pointerStartRef.current = pos;
    setDragPosition(pos);
    pendingTapIndexRef.current = checkCollision(pos.x, pos.y);

    if (svgRef.current.setPointerCapture) {
      svgRef.current.setPointerCapture(e.pointerId);
    }
  };

  // Dragging update line and capture subsequent letter beads
  const continueDrag = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isInputEnabled || activePointerIdRef.current !== e.pointerId) return;
    const pos = getPointerPos(e);
    if (!pos) return;

    setDragPosition(pos);

    const collidedIdx = checkCollision(pos.x, pos.y);
    const start = pointerStartRef.current;
    const movedFarEnough = start
      ? Math.hypot(pos.x - start.x, pos.y - start.y) > 5
      : false;
    const movedToAnotherLetter = collidedIdx !== -1 && collidedIdx !== pendingTapIndexRef.current;

    if (!hasActiveSwipeRef.current && (movedFarEnough || movedToAnotherLetter)) {
      beginSwipe(pendingTapIndexRef.current, collidedIdx);
      return;
    }

    if (hasActiveSwipeRef.current) addCollisionIndex(collidedIdx);
  };

  const handleTapNode = (index: number) => {
    if (!isInputEnabled || hasActiveSwipeRef.current) return;
    setSelectedIndices((prev) => {
      if (prev.includes(index)) {
        if (prev.length > 1 && prev[prev.length - 2] === index) {
          soundEngine.playLetterConnect(Math.max(0, prev.length - 2));
          const next = prev.slice(0, -1);
          selectedIndicesRef.current = next;
          return next;
        }
        selectedIndicesRef.current = prev;
        return prev;
      }
      soundEngine.playLetterConnect(prev.length);
      const next = [...prev, index];
      selectedIndicesRef.current = next;
      return next;
    });
  };

  const submitSelectedWord = () => {
    if (!isInputEnabled) return;
    const indices = selectedIndicesRef.current;
    if (indices.length === 0) return;
    const swipedWord = indices.map((idx) => nodes[idx].letter).join("");
    onWordComplete(swipedWord);
    setSelectedIndices([]);
    selectedIndicesRef.current = [];
    setDragPosition(null);
  };

  // Finalize word selection
  const endDrag = (pointerId?: number) => {
    if (pointerId !== undefined && activePointerIdRef.current !== pointerId) return;

    if (hasActiveSwipeRef.current && isInputEnabled) {
      const indices = selectedIndicesRef.current;
      if (indices.length > 0) {
        const swipedWord = indices.map((idx) => nodes[idx].letter).join("");
        onWordComplete(swipedWord);
      }
      setSelectedIndices([]);
      selectedIndicesRef.current = [];
    } else if (pendingTapIndexRef.current !== -1) {
      handleTapNode(pendingTapIndexRef.current);
    }

    activePointerIdRef.current = null;
    pointerStartRef.current = null;
    pendingTapIndexRef.current = -1;
    hasActiveSwipeRef.current = false;
    setIsSwiping(false);
    setDragPosition(null);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    if (svgRef.current?.hasPointerCapture?.(e.pointerId)) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
    endDrag(e.pointerId);
  };

  const handlePointerCancel = (e: React.PointerEvent<SVGSVGElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    activePointerIdRef.current = null;
    pointerStartRef.current = null;
    pendingTapIndexRef.current = -1;
    hasActiveSwipeRef.current = false;
    setIsSwiping(false);
    setDragPosition(null);
    setSelectedIndices([]);
    selectedIndicesRef.current = [];
  };

  // Setup auxiliary releases to catch release outside SVGSVGElement bounds
  useEffect(() => {
    const handleGlobalPointerUp = (event: PointerEvent) => {
      if (activePointerIdRef.current === event.pointerId) {
        endDrag(event.pointerId);
      }
    };
    window.addEventListener("pointerup", handleGlobalPointerUp);
    return () => {
      window.removeEventListener("pointerup", handleGlobalPointerUp);
    };
  }, [nodes, isInputEnabled]);

  // Swiped preview word display
  const swipedWordPreview = selectedIndices.map((idx) => nodes[idx]?.letter || "").join("");

  return (
    <div className="flex flex-col items-center select-none shrink-0" id="letter_wheel_container">
      {/* Dynamic Overlay Preview */}
      <div className="h-7 sm:h-12 flex flex-col items-center justify-center mb-1 sm:mb-6 gap-1 sm:gap-2">
          {swipedWordPreview && (
            <>
              <div
                className="px-3 sm:px-6 py-1 sm:py-2 rounded-full text-white font-mono font-bold text-base sm:text-2xl tracking-widest shadow-lg animate-bounce duration-150 border uppercase"
                style={{
                  background: `radial-gradient(circle, ${accentColor} 0%, #1E293B 100%)`,
                  borderColor: accentColor,
                  boxShadow: `0 0 15px ${accentColor}80`,
                }}
              >
                {swipedWordPreview}
              </div>
              <button
                type="button"
                onClick={submitSelectedWord}
                className="px-2.5 sm:px-4 py-0.5 sm:py-1 rounded-full bg-white/90 border border-slate-300 text-slate-700 text-[9px] sm:text-xs font-bold uppercase tracking-wider hover:bg-slate-100 transition"
              >
                Submit
              </button>
            </>
        )}
      </div>

      <div className="relative w-[min(54vw,13.25rem)] h-[min(54vw,13.25rem)] sm:w-72 sm:h-72 flex items-center justify-center">
        {/* Modern tribal outer pattern backing */}
        <div className="absolute inset-0 rounded-full border border-dashed border-gray-300 opacity-20 animate-spin" style={{ animationDuration: "120s" }} />
        <div className="absolute inset-4 rounded-full border border-double border-orange-200 opacity-30" />

        {/* Circular Wheel interactive Canvas */}
        <svg
          ref={svgRef}
          className="relative z-10 w-full h-full overflow-visible touch-none"
          viewBox="0 0 280 280"
          onPointerDown={startDrag}
          onPointerMove={continueDrag}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          {/* Glowing Connect Trail Lines */}
          {selectedIndices.length > 0 &&
            selectedIndices.map((idx, index) => {
              if (index === selectedIndices.length - 1) return null;
              const start = nodes[selectedIndices[index]];
              const end = nodes[selectedIndices[index + 1]];
              if (!start || !end) return null;
              return (
                <line
                  key={`line-${index}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={accentColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  opacity="0.85"
                  className="drop-shadow-md"
                  id={`connector-${index}`}
                />
              );
            })}

          {/* Real-time drag line to cursor point */}
          {isSwiping && selectedIndices.length > 0 && dragPosition && (
            <line
              x1={nodes[selectedIndices[selectedIndices.length - 1]].x}
              y1={nodes[selectedIndices[selectedIndices.length - 1]].y}
              x2={dragPosition.x}
              y2={dragPosition.y}
              stroke={`${accentColor}B3`} // opacity hex code
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="4,4"
              id="realtime_drag_line"
            />
          )}

          {/* Render individual letter nodes/beads */}
          {nodes.map((node, index) => {
            const isSelected = selectedIndices.includes(index);
            const selectionOrderIdx = selectedIndices.indexOf(index);
            return (
              <g
                key={`node-${index}`}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-pointer group"
                id={`letter-node-${node.letter}-${index}`}
              >
                {/* Visual Bead base backing bubble */}
                <circle
                  r="24"
                  fill={isSelected ? accentColor : "#FFFFFF"}
                  stroke={isSelected ? "#FFFFFF" : accentColor}
                  strokeWidth="3.5"
                  className="transition-colors duration-200 ease-out shadow-md"
                  style={{
                    boxShadow: isSelected ? `0 0 15px ${accentColor}` : "none",
                  }}
                />

                {/* Sub-pulsar animation overlay */}
                {isSelected && (
                  <circle
                    r="32"
                    fill="none"
                    stroke={accentColor}
                    strokeWidth="1.5"
                    className="animate-ping opacity-30"
                  />
                )}

                {/* Bead letter character */}
                <text
                  textAnchor="middle"
                  dy=".3em"
                  fontSize="22"
                  fontWeight="bold"
                  fill={isSelected ? "#FFFFFF" : "#1E293B"}
                  className="font-sans select-none tracking-tight pointer-events-none"
                >
                  {node.letter}
                </text>

                {/* Little placement indicator if selected in line order (e.g. 1, 2, 3) */}
                {isSelected && (
                  <circle
                    cx="14"
                    cy="-14"
                    r="6.5"
                    fill="#1E293B"
                    className="stroke-white stroke-1"
                  />
                )}
                {isSelected && (
                  <text
                    x="14"
                    y="-14"
                    textAnchor="middle"
                    dy=".35em"
                    fontSize="9"
                    fontWeight="black"
                    fill="#FFFFFF"
                    className="pointer-events-none font-mono"
                  >
                    {selectionOrderIdx + 1}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Shuffle Buttons placed exactly in the center of the wheel */}
        <button
          onClick={handleShuffle}
          id="shuffle_letters_btn"
          aria-label="Shuffle Letters"
          className="absolute z-20 w-12 h-12 bg-white rounded-full flex items-center justify-center border shadow-md hover:scale-110 active:scale-95 transition-transform duration-200"
          style={{ borderColor: accentColor }}
        >
          <Shuffle size={18} className="text-gray-700 hover:text-amber-600 transition-colors" />
        </button>
      </div>
    </div>
  );
}
