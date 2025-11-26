import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import GoBoard from './components/GoBoard';
import { TopBar, BottomBar, SettingsOverlay, ScoreModal } from './components/Controls';
import { Difficulty, GameState, Player, GameMode } from './types';
import { attemptMove, initializeBoard, getGroup, calculateFinalScore } from './services/goLogic';
import { getAiMove } from './services/aiService';
import { KOMI } from './constants';

const App: React.FC = () => {
  // Config state
  const [boardSize, setBoardSize] = useState<number>(9);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Intermediate);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [showScoreModal, setShowScoreModal] = useState<boolean>(false);

  // Game state
  const [gameState, setGameState] = useState<GameState>({
    board: initializeBoard(9),
    boardSize: 9,
    turn: 'black',
    captures: { black: 0, white: 0 },
    history: [],
    lastMove: null,
    phase: 'playing',
    gameMode: 'PvAI', // Default
    deadStones: new Set(),
    scoreResult: null,
    isAiThinking: false,
    message: "Game started. Black to move.",
  });

  // Track consective passes for game end
  const consecutivePasses = useRef(0);

  // Initialize game
  const startNewGame = (size: number, diff: Difficulty, mode: GameMode) => {
    // Cast strict type for GameState
    const validSize = size as 9 | 13 | 19;
    setBoardSize(validSize);
    setDifficulty(diff);
    consecutivePasses.current = 0;
    setShowScoreModal(false);
    setGameState({
      board: initializeBoard(validSize),
      boardSize: validSize,
      turn: 'black',
      captures: { black: 0, white: 0 },
      history: [],
      lastMove: null,
      phase: 'playing',
      gameMode: mode,
      deadStones: new Set(),
      scoreResult: null,
      isAiThinking: false,
      message: "New game started. Black to move.",
    });
    setIsSettingsOpen(false);
  };

  // Helper to update game state after a valid move
  const applyMove = useCallback((
    x: number, 
    y: number, 
    player: Player, 
    pass: boolean = false
  ) => {
    setGameState(prev => {
      // Handle Pass
      if (pass) {
        consecutivePasses.current += 1;
        // Logic for transitioning to scoring phase
        const enterScoring = consecutivePasses.current >= 2;
        
        let message = `${player === 'black' ? 'Black' : 'White'} passed.`;
        if (enterScoring) {
             message = "Both passed. Tap stones to mark dead ones, then Calculate Score.";
        } else {
             message = `${player === 'black' ? 'Black' : 'White'} passed. ${player === 'black' ? 'White' : 'Black'} to move.`;
        }

        return {
          ...prev,
          turn: prev.turn === 'black' ? 'white' : 'black',
          lastMove: null, // Pass has no coordinate
          phase: enterScoring ? 'scoring' : 'playing',
          message,
          isAiThinking: false,
        };
      }

      consecutivePasses.current = 0; // Reset consecutive passes

      const moveResult = attemptMove(prev.board, x, y, player);

      if (!moveResult.valid || !moveResult.newBoard) {
        return {
          ...prev,
          message: moveResult.message || "Invalid move",
        };
      }

      const newCaptures = { ...prev.captures };
      if (player === 'black') {
        newCaptures.black += moveResult.capturedCount || 0;
      } else {
        newCaptures.white += moveResult.capturedCount || 0;
      }

      return {
        ...prev,
        board: moveResult.newBoard,
        turn: prev.turn === 'black' ? 'white' : 'black',
        captures: newCaptures,
        history: [...prev.history, prev.board], 
        lastMove: { x, y },
        message: moveResult.capturedCount ? `Captured ${moveResult.capturedCount} stones!` : "",
        isAiThinking: false,
      };
    });
  }, []);

  // Handle Score Calculation
  const handleFinishScoring = () => {
    const result = calculateFinalScore(
        gameState.board,
        gameState.deadStones,
        gameState.captures,
        KOMI
    );
    setGameState(prev => ({
        ...prev,
        phase: 'ended',
        scoreResult: result,
        message: `Game Over. Winner: ${result.winner.toUpperCase()}`
    }));
    setShowScoreModal(true);
  };

  // Human Move / Scoring Handler
  const handleIntersectionClick = (x: number, y: number) => {
    // SCORING MODE
    if (gameState.phase === 'scoring') {
        const stone = gameState.board[y][x];
        if (stone) {
            // Find entire group to toggle
            const group = getGroup(gameState.board, x, y);
            setGameState(prev => {
                const newDeadStones = new Set(prev.deadStones);
                const isDead = newDeadStones.has(`${x},${y}`);
                
                // Toggle entire group
                group.stones.forEach(s => {
                    if (isDead) {
                        newDeadStones.delete(`${s.x},${s.y}`);
                    } else {
                        newDeadStones.add(`${s.x},${s.y}`);
                    }
                });

                return { ...prev, deadStones: newDeadStones };
            });
        }
        return;
    }

    // PLAYING MODE
    if (gameState.phase !== 'playing' || gameState.isAiThinking) return;

    // In PvAI, only allow moves if it's Black's turn (Human)
    if (gameState.gameMode === 'PvAI' && gameState.turn !== 'black') return;

    // In PvP, allow whoever's turn it is
    const playerToMove = gameState.turn;

    // Check legality quickly before state update
    const moveResult = attemptMove(gameState.board, x, y, playerToMove);
    if (moveResult.valid) {
      applyMove(x, y, playerToMove);
    } else {
      setGameState(prev => ({ ...prev, message: moveResult.message || "Invalid move" }));
    }
  };

  const handlePass = () => {
    applyMove(0, 0, gameState.turn, true);
  };

  const handleResign = () => {
    // Resignation logic
    const winner = gameState.turn === 'black' ? 'white' : 'black';
    setGameState(prev => ({
      ...prev,
      phase: 'ended',
      isGameOver: true, 
      scoreResult: {
          black: { territory: 0, captures: prev.captures.black, total: winner === 'black' ? 100 : 0 },
          white: { territory: 0, captures: prev.captures.white, komi: KOMI, total: winner === 'white' ? 100 : 0 },
          winner: winner
      },
      message: `${gameState.turn === 'black' ? 'Black' : 'White'} resigned. ${winner === 'black' ? 'Black' : 'White'} wins.`
    }));
    setShowScoreModal(true);
  };

  // Calculate Legal Moves for UI Hints
  const legalMoves = useMemo(() => {
    // Only calculate during playing phase and not when AI is thinking
    if (gameState.phase !== 'playing' || gameState.isAiThinking) {
      return new Set<string>();
    }

    // In PvAI, only show hints for Black
    if (gameState.gameMode === 'PvAI' && gameState.turn !== 'black') {
      return new Set<string>();
    }
    
    // In PvP, show hints for whoever is playing
    const player = gameState.turn;

    const moves = new Set<string>();
    const size = gameState.boardSize;
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Optimization: Only check empty spots
        if (gameState.board[y][x] === null) {
          const result = attemptMove(gameState.board, x, y, player);
          if (result.valid) {
            moves.add(`${x},${y}`);
          }
        }
      }
    }
    return moves;
  }, [gameState.board, gameState.boardSize, gameState.turn, gameState.phase, gameState.isAiThinking, gameState.gameMode]);

  // AI Logic Effect
  useEffect(() => {
    let isMounted = true;

    const triggerAi = async () => {
      // AI only moves in PvAI mode, playing phase, when it is White's turn
      if (gameState.gameMode === 'PvAI' && gameState.turn === 'white' && gameState.phase === 'playing') {
        setGameState(prev => ({ ...prev, isAiThinking: true }));
        
        // Reduced artificial delay
        await new Promise(r => setTimeout(r, 300)); 

        try {
          const aiMove = await getAiMove(
            gameState.board,
            gameState.boardSize,
            difficulty,
            gameState.captures,
            gameState.lastMove
          );

          if (!isMounted) return;

          if (aiMove.resign) {
             setGameState(prev => ({
                ...prev,
                phase: 'ended',
                message: `AI Resigned. Black Wins! ("${aiMove.thought}")`,
                scoreResult: {
                    black: { territory: 0, captures: prev.captures.black, total: 100 },
                    white: { territory: 0, captures: prev.captures.white, komi: KOMI, total: 0 },
                    winner: 'black'
                },
                isAiThinking: false
             }));
             setShowScoreModal(true);
             return;
          }

          if (aiMove.pass) {
            applyMove(0, 0, 'white', true);
          } else {
            const validation = attemptMove(gameState.board, aiMove.x, aiMove.y, 'white');
            if (validation.valid) {
               applyMove(aiMove.x, aiMove.y, 'white');
               if (aiMove.thought) {
                 setGameState(prev => ({ ...prev, message: `AI: "${aiMove.thought}"` }));
               }
            } else {
               console.warn("AI attempted illegal move at", aiMove.x, aiMove.y, validation.message);
               // Try one random fallback attempt immediately if AI invalid
               let found = false;
               for(let i=0; i<gameState.boardSize; i++) {
                   for(let j=0; j<gameState.boardSize; j++) {
                        if (gameState.board[j][i] === null) {
                            applyMove(i, j, 'white');
                            setGameState(prev => ({ ...prev, message: "AI played fallback." }));
                            found = true;
                            break;
                        }
                   }
                   if(found) break;
               }
               if (!found) {
                   applyMove(0, 0, 'white', true);
                   setGameState(prev => ({ ...prev, message: "AI passed (illegal move)." }));
               }
            }
          }

        } catch (err) {
          console.error(err);
          if (isMounted) {
            setGameState(prev => ({ ...prev, isAiThinking: false, message: "AI Error. Try passing?" }));
          }
        }
      }
    };

    triggerAi();

    return () => { isMounted = false; };
  }, [gameState.turn, gameState.phase, gameState.board, gameState.boardSize, gameState.captures, gameState.lastMove, difficulty, applyMove, gameState.gameMode]);


  return (
    <div className="flex flex-col h-full w-full bg-zinc-100 overflow-hidden relative">
        {/* Top HUD */}
        <TopBar 
            gameState={gameState} 
            onOpenSettings={() => setIsSettingsOpen(true)} 
        />

        {/* Board Container - Flexes to take maximum available space */}
        <div className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden w-full">
            <div className="relative aspect-square w-full h-full max-h-full max-w-full flex items-center justify-center">
                 <div className="w-full h-full max-w-[95vmin] max-h-[95vmin]">
                    <GoBoard 
                        board={gameState.board} 
                        boardSize={gameState.boardSize}
                        onIntersectionClick={handleIntersectionClick}
                        lastMove={gameState.lastMove}
                        interactive={(gameState.phase === 'playing' && !gameState.isAiThinking && (gameState.gameMode === 'PvP' || gameState.turn === 'black')) || gameState.phase === 'scoring'}
                        deadStones={gameState.deadStones}
                        legalMoves={legalMoves}
                    />
                 </div>
            </div>
        </div>

        {/* Bottom Actions */}
        <BottomBar 
            gameState={gameState} 
            onPass={handlePass} 
            onResign={handleResign} 
            onFinishScoring={handleFinishScoring}
        />

        {/* Settings Overlay */}
        {isSettingsOpen && (
            <SettingsOverlay
                currentSize={boardSize}
                currentDifficulty={difficulty}
                setSize={setBoardSize}
                setDifficulty={setDifficulty}
                onStart={startNewGame}
                onClose={() => setIsSettingsOpen(false)}
                hasActiveGame={gameState.phase !== 'ended' && gameState.history.length > 0}
            />
        )}

        {/* Score Result Modal */}
        {showScoreModal && gameState.scoreResult && (
            <ScoreModal 
                result={gameState.scoreResult}
                onClose={() => setShowScoreModal(false)}
                onNewGame={() => setIsSettingsOpen(true)}
            />
        )}
    </div>
  );
};

export default App;