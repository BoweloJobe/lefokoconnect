import React, { useState, useEffect, useRef } from "react";
import { soundEngine } from "./AudioSynthesizer";
import { Shuffle } from "lucide-react";

interface LetterWheelProps {
  letters: string[];
  onWordComplete: (word: string) => void;
  accentColor?: string; // e.g. deep gold or Botswana blue
  onShuffleRequest?: () => void;
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
}: LetterWheelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [nodes, setNodes] = useState<LetterNode[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [wheelKey, setWheelKey] = useState(0); // for shuffle animation resets

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
    setIsSwiping(false);
    setDragPosition(null);
  }, [letters, wheelKey]);

  // Handle shuffling letter node order locally (with visual feedback)
  const handleShuffle = () => {
    soundEngine.playShuffle();
    if (onShuffleRequest) {
      onShuffleRequest();
    } else {
      setWheelKey((prev) => prev + 1);
    }
  };

  const getPointerPos = (e: React.MouseEvent | React.TouchEvent | TouchEvent | MouseEvent) => {
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

  // Start swiping on a bead or empty area
  const startDrag = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    e.preventDefault();
    const pos = getPointerPos(e);
    if (!pos) return;

    setIsSwiping(true);
    setDragPosition(pos);

    const collidedIdx = checkCollision(pos.x, pos.y);
    if (collidedIdx !== -1) {
      setSelectedIndices([collidedIdx]);
      soundEngine.playLetterConnect(0);
    }
  };

  // Dragging update line and capture subsequent letter beads
  const continueDrag = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!isSwiping) return;
    const pos = getPointerPos(e);
    if (!pos) return;

    setDragPosition(pos);

    const collidedIdx = checkCollision(pos.x, pos.y);
    if (collidedIdx !== -1) {
      // If was not already selected
      if (!selectedIndices.includes(collidedIdx)) {
        const lastIdx = selectedIndices[selectedIndices.length - 1];
        // Allow selection of adjacent/any letters as long as not duplicated immediately
        setSelectedIndices((prev) => [...prev, collidedIdx]);
        soundEngine.playLetterConnect(selectedIndices.length);
      } else {
        // If it's the second-to-last item, support "rolling back" the swipe (highly tactile feature!)
        if (selectedIndices.length > 1 && selectedIndices[selectedIndices.length - 2] === collidedIdx) {
          setSelectedIndices((prev) => prev.slice(0, -1));
          soundEngine.playLetterConnect(Math.max(0, selectedIndices.length - 2));
        }
      }
    }
  };

  // Finalize word selection
  const endDrag = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    setDragPosition(null);

    if (selectedIndices.length > 0) {
      const swipedWord = selectedIndices.map((idx) => nodes[idx].letter).join("");
      onWordComplete(swipedWord);
    }
    setSelectedIndices([]);
  };

  // Setup auxiliary releases to catch release outside SVGSVGElement bounds
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSwiping) {
        endDrag();
      }
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("touchend", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchend", handleGlobalMouseUp);
    };
  }, [isSwiping, selectedIndices, nodes]);

  // Swiped preview word display
  const swipedWordPreview = selectedIndices.map((idx) => nodes[idx]?.letter || "").join("");

  return (
    <div className="flex flex-col items-center select-none" id="letter_wheel_container">
      {/* Dynamic Overlay Preview */}
      <div className="h-12 flex items-center justify-center mb-6">
        {swipedWordPreview && (
          <div
            className="px-6 py-2 rounded-full text-white font-mono font-bold text-2xl tracking-widest shadow-lg animate-bounce duration-150 border uppercase"
            style={{
              background: `radial-gradient(circle, ${accentColor} 0%, #1E293B 100%)`,
              borderColor: accentColor,
              boxShadow: `0 0 15px ${accentColor}80`,
            }}
          >
            {swipedWordPreview}
          </div>
        )}
      </div>

      <div className="relative w-72 h-72 flex items-center justify-center">
        {/* Modern tribal outer pattern backing */}
        <div className="absolute inset-0 rounded-full border border-dashed border-gray-300 opacity-20 animate-spin" style={{ animationDuration: "120s" }} />
        <div className="absolute inset-4 rounded-full border border-double border-orange-200 opacity-30" />

        {/* Circular Wheel interactive Canvas */}
        <svg
          ref={svgRef}
          className="relative z-10 w-full h-full overflow-visible touch-none"
          viewBox="0 0 280 280"
          onMouseDown={startDrag}
          onMouseMove={continueDrag}
          onTouchStart={startDrag}
          onTouchMove={continueDrag}
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
                id={`letter-node-${node.letter}`}
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
