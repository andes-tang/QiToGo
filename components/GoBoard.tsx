import React, { useMemo } from 'react';
import { BoardState, Point } from '../types';

interface GoBoardProps {
  board: BoardState;
  boardSize: number;
  onIntersectionClick: (x: number, y: number) => void;
  lastMove: Point | null;
  interactive: boolean;
  deadStones?: Set<string>;
  legalMoves?: Set<string>;
}

const GoBoard: React.FC<GoBoardProps> = ({ 
  board, 
  boardSize, 
  onIntersectionClick, 
  lastMove,
  interactive,
  deadStones,
  legalMoves
}) => {
  
  // Grid calculation
  const gridSize = 100; // Conceptual total size
  const padding = 6;    // Padding around the grid
  const cellSize = (gridSize - 2 * padding) / (boardSize - 1);

  // Generate grid lines
  const lines = useMemo(() => {
    const l = [];
    const start = padding;
    const end = gridSize - padding;
    
    for (let i = 0; i < boardSize; i++) {
      const pos = padding + i * cellSize;
      // Vertical
      l.push(<line key={`v-${i}`} x1={pos} y1={start} x2={pos} y2={end} stroke="#111" strokeWidth="0.4" />);
      // Horizontal
      l.push(<line key={`h-${i}`} x1={start} y1={pos} x2={end} y2={pos} stroke="#111" strokeWidth="0.4" />);
    }
    return l;
  }, [boardSize, cellSize]);

  // Star points (Hoshi)
  const starPoints = useMemo(() => {
    if (boardSize < 9) return [];
    
    const points: Point[] = [];
    if (boardSize === 9) {
      points.push({ x: 2, y: 2 }, { x: 6, y: 2 }, { x: 4, y: 4 }, { x: 2, y: 6 }, { x: 6, y: 6 });
    } else if (boardSize === 13) {
      points.push({ x: 3, y: 3 }, { x: 9, y: 3 }, { x: 6, y: 6 }, { x: 3, y: 9 }, { x: 9, y: 9 });
    } else if (boardSize === 19) {
       [3, 9, 15].forEach(x => {
         [3, 9, 15].forEach(y => {
           points.push({ x, y });
         });
       });
    }
    
    return points.map((p, i) => (
      <circle 
        key={`star-${i}`} 
        cx={padding + p.x * cellSize} 
        cy={padding + p.y * cellSize} 
        r={1} 
        fill="#111" 
      />
    ));
  }, [boardSize, cellSize]);

  // Render stones
  const stones = [];
  // Render hit targets (transparent circles for clicking)
  const targets = [];

  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      const cx = padding + x * cellSize;
      const cy = padding + y * cellSize;
      const stone = board[y][x];
      const isDead = deadStones?.has(`${x},${y}`);
      const isLegal = legalMoves?.has(`${x},${y}`);

      // Interactive Click Target
      targets.push(
        <circle
          key={`target-${x}-${y}`}
          cx={cx}
          cy={cy}
          r={cellSize / 2}
          fill="transparent"
          className={interactive ? "cursor-pointer" : ""}
          onClick={() => interactive && onIntersectionClick(x, y)}
        />
      );

      // Optional: Visualize legal moves with a tiny dot if interactive and empty
      if (interactive && isLegal && !stone) {
         stones.push(
            <circle
                key={`legal-${x}-${y}`}
                cx={cx}
                cy={cy}
                r={cellSize * 0.1}
                fill="rgba(0,0,0,0.1)"
                className="pointer-events-none"
            />
         );
      }

      // Stone rendering
      if (stone) {
        const isLastMove = lastMove && lastMove.x === x && lastMove.y === y && !isDead;
        const opacity = isDead ? 0.4 : 1;
        
        // Shadow
        stones.push(
            <circle
                key={`shadow-${x}-${y}`}
                cx={cx + 0.5}
                cy={cy + 0.5}
                r={cellSize * 0.48}
                fill="rgba(0,0,0,0.3)"
                opacity={opacity}
            />
        );

        if (stone === 'black') {
          stones.push(
            <g key={`stone-${x}-${y}`} opacity={opacity}>
                <defs>
                    <radialGradient id={`grad-black-${x}-${y}`} cx="30%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="#666" />
                        <stop offset="100%" stopColor="#000" />
                    </radialGradient>
                </defs>
                <circle
                    cx={cx}
                    cy={cy}
                    r={cellSize * 0.48}
                    fill={`url(#grad-black-${x}-${y})`}
                    stroke="#000"
                    strokeWidth="0.2"
                />
                {/* Last move marker */}
                {isLastMove && <circle cx={cx} cy={cy} r={cellSize * 0.15} fill="transparent" stroke="#fff" strokeWidth="0.6" />}
                
                {/* Dead stone marker */}
                {isDead && (
                   <g stroke="#fff" strokeWidth="1">
                       <line x1={cx - 2} y1={cy - 2} x2={cx + 2} y2={cy + 2} />
                       <line x1={cx + 2} y1={cy - 2} x2={cx - 2} y2={cy + 2} />
                   </g>
                )}
            </g>
          );
        } else {
          stones.push(
            <g key={`stone-${x}-${y}`} opacity={opacity}>
                 <defs>
                    <radialGradient id={`grad-white-${x}-${y}`} cx="30%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="#fff" />
                        <stop offset="90%" stopColor="#ddd" />
                        <stop offset="100%" stopColor="#ccc" />
                    </radialGradient>
                </defs>
                <circle
                    cx={cx}
                    cy={cy}
                    r={cellSize * 0.48}
                    fill={`url(#grad-white-${x}-${y})`}
                    stroke="#999"
                    strokeWidth="0.2"
                />
                 {isLastMove && <circle cx={cx} cy={cy} r={cellSize * 0.15} fill="transparent" stroke="#000" strokeWidth="0.6" />}
                 
                 {/* Dead stone marker */}
                 {isDead && (
                   <g stroke="#000" strokeWidth="1">
                       <line x1={cx - 2} y1={cy - 2} x2={cx + 2} y2={cy + 2} />
                       <line x1={cx + 2} y1={cy - 2} x2={cx - 2} y2={cy + 2} />
                   </g>
                )}
            </g>
          );
        }
      }
    }
  }

  return (
    <div className="relative w-full h-full aspect-square rounded shadow-2xl wood-texture overflow-hidden select-none touch-none">
      <svg viewBox={`0 0 ${gridSize} ${gridSize}`} className="w-full h-full block">
        {lines}
        {starPoints}
        {stones}
        {targets}
      </svg>
    </div>
  );
};

export default GoBoard;