export type Player = 'black' | 'white';

export interface Point {
  x: number;
  y: number;
}

export type BoardState = (Player | null)[][];

export enum Difficulty {
  Novice = 'Novice',
  Intermediate = 'Intermediate',
  Master = 'Master'
}

export type GamePhase = 'playing' | 'scoring' | 'ended';

export type GameMode = 'PvAI' | 'PvP';

export interface ScoreResult {
  black: {
    territory: number;
    captures: number;
    total: number;
  };
  white: {
    territory: number;
    captures: number;
    komi: number;
    total: number;
  };
  winner: Player | 'draw';
}

export interface GameState {
  board: BoardState;
  boardSize: 9 | 13 | 19;
  turn: Player;
  captures: {
    black: number;
    white: number;
  };
  history: BoardState[]; 
  lastMove: Point | null;
  phase: GamePhase;
  gameMode: GameMode;
  deadStones: Set<string>; // Strings in format "x,y"
  scoreResult: ScoreResult | null;
  isAiThinking: boolean;
  message: string;
}

export interface MoveResult {
  valid: boolean;
  newBoard?: BoardState;
  capturedCount?: number;
  message?: string;
}