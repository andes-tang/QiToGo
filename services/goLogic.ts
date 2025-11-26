import { BoardState, Player, Point, MoveResult, ScoreResult } from "../types";
import { KOMI } from "../constants";

// Deep copy the board to avoid mutation issues
export const cloneBoard = (board: BoardState): BoardState => {
  return board.map(row => [...row]);
};

// Check if coordinates are within bounds
export const isValidPoint = (board: BoardState, x: number, y: number): boolean => {
  const size = board.length;
  return x >= 0 && x < size && y >= 0 && y < size;
};

// Get neighboring points
export const getNeighbors = (board: BoardState, x: number, y: number): Point[] => {
  const neighbors: Point[] = [];
  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  for (const { dx, dy } of directions) {
    const nx = x + dx;
    const ny = y + dy;
    if (isValidPoint(board, nx, ny)) {
      neighbors.push({ x: nx, y: ny });
    }
  }
  return neighbors;
};

// Find a group of stones and their liberties using flood fill
interface GroupResult {
  stones: Point[];
  liberties: Point[];
}

export const getGroup = (board: BoardState, x: number, y: number): GroupResult => {
  const color = board[y][x];
  if (!color) return { stones: [], liberties: [] };

  const stones: Point[] = [];
  const liberties: Set<string> = new Set(); // Use Set of strings "x,y" to avoid duplicates
  const visited: Set<string> = new Set();
  const queue: Point[] = [{ x, y }];

  visited.add(`${x},${y}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    stones.push(current);

    const neighbors = getNeighbors(board, current.x, current.y);
    for (const n of neighbors) {
      const neighborColor = board[n.y][n.x];
      if (neighborColor === null) {
        liberties.add(`${n.x},${n.y}`);
      } else if (neighborColor === color && !visited.has(`${n.x},${n.y}`)) {
        visited.add(`${n.x},${n.y}`);
        queue.push(n);
      }
    }
  }

  // Convert liberties back to Point array
  const libertiesArray: Point[] = Array.from(liberties).map(s => {
    const [lx, ly] = s.split(',').map(Number);
    return { x: lx, y: ly };
  });

  return { stones, liberties: libertiesArray };
};

// Main logic to place a stone
export const attemptMove = (
  board: BoardState, 
  x: number, 
  y: number, 
  player: Player,
  previousBoardHash?: string
): MoveResult => {
  
  // 1. Check if occupied
  if (board[y][x] !== null) {
    return { valid: false, message: "Point is already occupied." };
  }

  // Create a temporary board to test the move
  const newBoard = cloneBoard(board);
  newBoard[y][x] = player;

  const opponent = player === 'black' ? 'white' : 'black';
  const neighbors = getNeighbors(newBoard, x, y);
  
  let capturedCount = 0;
  
  // 2. Check for captures of opponent stones
  // We check all adjacent opponent stones. If they belong to a group with 0 liberties, remove them.
  neighbors.forEach(n => {
    if (newBoard[n.y][n.x] === opponent) {
      const group = getGroup(newBoard, n.x, n.y);
      if (group.liberties.length === 0) {
        // Capture logic
        group.stones.forEach(stone => {
          newBoard[stone.y][stone.x] = null;
          capturedCount++;
        });
      }
    }
  });

  // 3. Check for suicide
  // After removing captured stones, does the newly placed stone have liberties?
  const myGroup = getGroup(newBoard, x, y);
  if (myGroup.liberties.length === 0) {
    return { valid: false, message: "Suicide move is not allowed." };
  }

  return { 
    valid: true, 
    newBoard, 
    capturedCount 
  };
};

export const initializeBoard = (size: number): BoardState => {
  return Array(size).fill(null).map(() => Array(size).fill(null));
};

// --- Scoring Logic ---

export const calculateFinalScore = (
  board: BoardState, 
  deadStones: Set<string>, 
  captures: { black: number, white: number },
  komi: number = KOMI
): ScoreResult => {
  const size = board.length;
  let blackTerritory = 0;
  let whiteTerritory = 0;
  
  // Extra captures from dead stones
  let blackDeadCount = 0;
  let whiteDeadCount = 0;

  // 1. Create a "Scoring Board" where dead stones are removed
  const scoreBoard = cloneBoard(board);
  deadStones.forEach(pos => {
    const [x, y] = pos.split(',').map(Number);
    const stone = board[y][x];
    if (stone === 'black') blackDeadCount++;
    if (stone === 'white') whiteDeadCount++;
    scoreBoard[y][x] = null; // Remove for territory calculation
  });

  const visited = new Set<string>();

  // 2. Flood fill empty spots to determine territory
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const posStr = `${x},${y}`;
      if (scoreBoard[y][x] === null && !visited.has(posStr)) {
        // Start a region fill
        const region: Point[] = [];
        const touchingColors = new Set<Player>();
        const queue: Point[] = [{x, y}];
        visited.add(posStr);
        region.push({x, y});

        while (queue.length > 0) {
          const curr = queue.shift()!;
          const neighbors = getNeighbors(scoreBoard, curr.x, curr.y);
          
          for (const n of neighbors) {
             const nPosStr = `${n.x},${n.y}`;
             const content = scoreBoard[n.y][n.x];
             
             if (content === null) {
               if (!visited.has(nPosStr)) {
                 visited.add(nPosStr);
                 queue.push(n);
                 region.push(n);
               }
             } else {
               touchingColors.add(content);
             }
          }
        }

        // 3. Analyze Region
        // If touches ONLY black -> Black territory
        // If touches ONLY white -> White territory
        // If touches BOTH or NONE -> Neutral (Dame)
        if (touchingColors.size === 1) {
          if (touchingColors.has('black')) {
            blackTerritory += region.length;
          } else if (touchingColors.has('white')) {
            whiteTerritory += region.length;
          }
        }
      }
    }
  }

  // 4. Compile Results
  // Black Score = Territory + Captures (from game) + Dead White Stones
  const totalBlackCaptures = captures.black + whiteDeadCount;
  const totalBlack = blackTerritory + totalBlackCaptures;

  // White Score = Territory + Captures (from game) + Dead Black Stones + Komi
  const totalWhiteCaptures = captures.white + blackDeadCount;
  const totalWhite = whiteTerritory + totalWhiteCaptures + komi;

  return {
    black: {
      territory: blackTerritory,
      captures: totalBlackCaptures,
      total: totalBlack
    },
    white: {
      territory: whiteTerritory,
      captures: totalWhiteCaptures,
      komi: komi,
      total: totalWhite
    },
    winner: totalBlack > totalWhite ? 'black' : 'white'
  };
};