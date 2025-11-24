import React, { useMemo } from 'react';

interface PianoProps {
  activeNotes: string[];
  rootNote?: string;
}

// Static mapping to avoid repeated object creation
const NOTE_TO_OFFSET: Record<string, number> = {
  'C': 0, 'B#': 0,
  'C#': 1, 'DB': 1,
  'D': 2,
  'D#': 3, 'EB': 3,
  'E': 4, 'FB': 4,
  'F': 5, 'E#': 5,
  'F#': 6, 'GB': 6,
  'G': 7,
  'G#': 8, 'AB': 8,
  'A': 9,
  'A#': 10, 'BB': 10,
  'B': 11, 'CB': 11
};

// Helper to map note names to key indices (0-11)
const noteToOffset = (note: string): number => {
  const n = note.toUpperCase().replace(/[0-9]/g, ''); // remove octave numbers if present
  return NOTE_TO_OFFSET[n] ?? -1;
};

const OCTAVES = 2; // Number of octaves to render
const START_OCTAVE = 3; // Start at C3

const Piano: React.FC<PianoProps> = ({ activeNotes, rootNote }) => {
  const whiteKeyWidth = 40;
  const whiteKeyHeight = 160;
  const blackKeyWidth = 24;
  const blackKeyHeight = 100;

  // Optimization: Pre-calculate active note indices and root index to avoid repeated string parsing
  const { activeIndices, rootIndex } = useMemo(() => {
    const activeSet = new Set<number>();
    activeNotes.forEach(n => {
      const offset = noteToOffset(n);
      if (offset !== -1) activeSet.add(offset);
    });

    let rIndex = -1;
    if (rootNote) {
      rIndex = noteToOffset(rootNote);
    }

    return { activeIndices: activeSet, rootIndex: rIndex };
  }, [activeNotes, rootNote]);

  // Optimization: Memoize the SVG keys generation to prevent unnecessary re-renders
  const keys = useMemo(() => {
    const generatedKeys = [];

    for (let oct = 0; oct < OCTAVES; oct++) {
      const xOffset = oct * (whiteKeyWidth * 7);

      // White Keys
      const whiteNotes = [0, 2, 4, 5, 7, 9, 11]; // C, D, E, F, G, A, B offsets
      whiteNotes.forEach((noteIndex, i) => {
        // Check if this key matches any active note using O(1) Set lookup
        const isActive = activeIndices.has(noteIndex);
        const isRoot = rootIndex === noteIndex;

        // Violet for root, Blue for active, White default
        let fill = 'white';
        if (isRoot) {
          fill = '#8b5cf6'; // violet-500
        } else if (isActive) {
          fill = '#60a5fa'; // blue-400
        }

        generatedKeys.push(
          <rect
            key={`white-${oct}-${noteIndex}`}
            x={xOffset + i * whiteKeyWidth}
            y={0}
            width={whiteKeyWidth}
            height={whiteKeyHeight}
            fill={fill}
            stroke="#cbd5e1"
            strokeWidth="1"
            className="transition-colors duration-300 ease-in-out hover:opacity-90"
            rx={4}
            ry={4}
          />
        );
        
        // Label C notes
        if (noteIndex === 0) {
           generatedKeys.push(
              <text 
                  key={`label-${oct}`} 
                  x={xOffset + i * whiteKeyWidth + whiteKeyWidth/2} 
                  y={whiteKeyHeight - 10} 
                  fontSize="10" 
                  textAnchor="middle" 
                  fill="#94a3b8"
                  pointerEvents="none"
                  style={{ userSelect: 'none' }}
              >
                  C{START_OCTAVE + oct}
              </text>
           );
        }
      });

      // Black Keys
      const blackNotes = [
        { idx: 1, pos: 1 }, // C#
        { idx: 3, pos: 2 }, // D#
        { idx: 6, pos: 4 }, // F#
        { idx: 8, pos: 5 }, // G#
        { idx: 10, pos: 6 } // A#
      ];

      blackNotes.forEach(({ idx, pos }) => {
        const isActive = activeIndices.has(idx);
        const isRoot = rootIndex === idx;
        
        // Darker Violet for root, Blue for active, Slate-800 default
        let fill = '#1e293b';
        if (isRoot) {
          fill = '#7c3aed'; // violet-600
        } else if (isActive) {
          fill = '#3b82f6'; // blue-500
        }

        // Position calculation: pos is the gap index (1 = between 1st and 2nd white key)
        const xPos = xOffset + (pos * whiteKeyWidth) - (blackKeyWidth / 2);

        generatedKeys.push(
          <rect
            key={`black-${oct}-${idx}`}
            x={xPos}
            y={0}
            width={blackKeyWidth}
            height={blackKeyHeight}
            fill={fill}
            stroke="#0f172a"
            strokeWidth="1"
            className="transition-colors duration-300 ease-in-out z-10 hover:opacity-90"
            rx={2}
            ry={2}
          />
        );
      });
    }
    return generatedKeys;
  }, [activeIndices, rootIndex]);

  // Total width = 7 white keys * OCTAVES
  const totalWidth = 7 * whiteKeyWidth * OCTAVES;

  return (
    <div className="relative inline-block p-4 bg-slate-900 rounded-xl shadow-2xl border border-slate-800">
      {/* Piano Stripe Decoration */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-xl opacity-50"></div>
      
      <svg width={totalWidth} height={whiteKeyHeight} className="block">
        {keys}
      </svg>
    </div>
  );
};

export default Piano;