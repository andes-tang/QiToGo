import React from 'react';
import { Difficulty, GameState, ScoreResult, GameMode } from '../types';
import { BOARD_SIZES, DIFFICULTY_DESCRIPTIONS } from '../constants';

// --- Sub-components for Mobile UI ---

interface TopBarProps {
  gameState: GameState;
  onOpenSettings: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ gameState, onOpenSettings }) => {
  return (
    <div className="w-full bg-white/90 backdrop-blur-md shadow-sm border-b border-zinc-200 px-4 py-2 flex items-center justify-between z-10">
      
      {/* Scores */}
      <div className="flex gap-4 items-center">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${gameState.turn === 'black' ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-200 text-zinc-600'}`}>
          <div className={`w-3 h-3 rounded-full ${gameState.turn === 'black' ? 'bg-white' : 'bg-black'}`}></div>
          <span className="font-bold text-sm">{gameState.captures.black}</span>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${gameState.turn === 'white' ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-white border-zinc-200 text-zinc-600'}`}>
          <div className="w-3 h-3 rounded-full bg-white border border-zinc-300"></div>
          <span className="font-bold text-sm">{gameState.captures.white}</span>
        </div>
      </div>

      {/* Status Text (Condensed) */}
      <div className="flex-1 text-center px-2">
         {gameState.isAiThinking ? (
            <div className="flex items-center justify-center gap-1 text-amber-600 text-xs font-semibold animate-pulse">
                <span>AI Thinking</span>
                <span className="flex gap-0.5">
                    <span className="w-1 h-1 bg-amber-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                    <span className="w-1 h-1 bg-amber-600 rounded-full animate-bounce" style={{animationDelay: '100ms'}}></span>
                    <span className="w-1 h-1 bg-amber-600 rounded-full animate-bounce" style={{animationDelay: '200ms'}}></span>
                </span>
            </div>
         ) : gameState.phase === 'scoring' ? (
             <div className="text-xs font-bold text-blue-600 animate-pulse">
                Tap dead stones
             </div>
         ) : (
            <div className="text-xs font-medium text-zinc-500 truncate">
                {gameState.message || (gameState.turn === 'black' ? "Black to Move" : "White to Move")}
            </div>
         )}
      </div>

      {/* Settings Button */}
      <button 
        onClick={onOpenSettings}
        className="p-2 -mr-2 text-zinc-600 hover:text-zinc-900 transition-colors"
        aria-label="Menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
    </div>
  );
};

interface BottomBarProps {
  gameState: GameState;
  onPass: () => void;
  onResign: () => void;
  onFinishScoring: () => void;
}

export const BottomBar: React.FC<BottomBarProps> = ({ gameState, onPass, onResign, onFinishScoring }) => {
  if (gameState.phase === 'scoring') {
     return (
        <div className="w-full bg-white border-t border-zinc-200 p-3 pb-6 flex gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
             <div className="flex-1 flex flex-col justify-center text-xs text-zinc-500 px-2">
                Mark dead stones, then click done.
             </div>
             <button 
                onClick={onFinishScoring}
                className="flex-[2] py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg transition-all active:scale-95"
            >
                Calculate Score
            </button>
        </div>
     );
  }

  // Allow pass/resign if it's playing phase and not AI thinking
  // In PvP, both can pass/resign. In PvAI, only Black usually initiates but we allow controls.
  const disabled = gameState.phase === 'ended' || gameState.isAiThinking || (gameState.gameMode === 'PvAI' && gameState.turn !== 'black');

  return (
    <div className="w-full bg-white border-t border-zinc-200 p-3 pb-6 flex gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <button 
        onClick={onResign}
        disabled={disabled}
        className="flex-1 py-3 px-4 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:bg-zinc-50 disabled:text-zinc-300 transition-colors"
      >
        Resign
      </button>
      <button 
        onClick={onPass}
        disabled={disabled}
        className="flex-[2] py-3 px-4 rounded-xl font-bold text-white bg-zinc-900 hover:bg-zinc-800 shadow-lg disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
      >
        Pass Turn
      </button>
    </div>
  );
};

interface SettingsOverlayProps {
  currentDifficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  currentSize: number;
  setSize: (s: number) => void;
  onStart: (size: number, diff: Difficulty, mode: GameMode) => void;
  onClose: () => void;
  hasActiveGame: boolean;
}

export const SettingsOverlay: React.FC<SettingsOverlayProps> = ({
  currentDifficulty,
  setDifficulty,
  currentSize,
  setSize,
  onStart,
  onClose,
  hasActiveGame
}) => {
  const [selectedMode, setSelectedMode] = React.useState<GameMode>('PvAI');

  return (
    <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md h-[85vh] sm:h-auto sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-100">
            <h2 className="text-2xl font-serif-jp font-bold text-zinc-900">New Game</h2>
            {hasActiveGame && (
                <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* Game Mode */}
            <div className="space-y-3">
                <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Game Mode</label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setSelectedMode('PvAI')}
                        className={`py-4 px-4 rounded-xl text-left font-bold transition border-2 flex flex-col ${
                            selectedMode === 'PvAI' 
                            ? 'border-zinc-900 bg-zinc-900 text-white' 
                            : 'border-zinc-100 bg-zinc-50 text-zinc-600 hover:border-zinc-300'
                        }`}
                    >
                        <span>Vs AI</span>
                        <span className={`text-xs font-normal mt-1 ${selectedMode === 'PvAI' ? 'text-zinc-300' : 'text-zinc-400'}`}>Play against Gemini</span>
                    </button>
                    <button
                        onClick={() => setSelectedMode('PvP')}
                        className={`py-4 px-4 rounded-xl text-left font-bold transition border-2 flex flex-col ${
                            selectedMode === 'PvP' 
                            ? 'border-zinc-900 bg-zinc-900 text-white' 
                            : 'border-zinc-100 bg-zinc-50 text-zinc-600 hover:border-zinc-300'
                        }`}
                    >
                        <span>Vs Friend</span>
                        <span className={`text-xs font-normal mt-1 ${selectedMode === 'PvP' ? 'text-zinc-300' : 'text-zinc-400'}`}>Pass & Play</span>
                    </button>
                </div>
            </div>

            {/* Board Size */}
            <div className="space-y-3">
                <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Board Size</label>
                <div className="grid grid-cols-3 gap-3">
                    {BOARD_SIZES.map(size => (
                    <button
                        key={size}
                        onClick={() => setSize(size)}
                        className={`py-4 rounded-xl text-lg font-bold transition border-2 ${
                            currentSize === size 
                            ? 'border-zinc-900 bg-zinc-900 text-white' 
                            : 'border-zinc-100 bg-zinc-50 text-zinc-600 hover:border-zinc-300'
                        }`}
                    >
                        {size}x{size}
                    </button>
                    ))}
                </div>
            </div>

            {/* Difficulty (Only show if PvAI) */}
            {selectedMode === 'PvAI' && (
                <div className="space-y-3">
                    <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Opponent Strength</label>
                    <div className="flex flex-col gap-3">
                        {(Object.values(Difficulty) as Difficulty[]).map(level => (
                        <button
                            key={level}
                            onClick={() => setDifficulty(level)}
                            className={`relative p-4 rounded-xl border-2 text-left transition ${
                                currentDifficulty === level 
                                ? 'border-amber-400 bg-amber-50' 
                                : 'border-zinc-100 bg-white hover:border-zinc-200'
                            }`}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className={`font-bold ${currentDifficulty === level ? 'text-amber-900' : 'text-zinc-800'}`}>{level}</span>
                                {currentDifficulty === level && (
                                    <div className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-zinc-500 font-medium">{DIFFICULTY_DESCRIPTIONS[level]}</p>
                        </button>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Footer Action */}
        <div className="p-6 border-t border-zinc-100 bg-zinc-50/50">
            <button 
                onClick={() => onStart(currentSize, currentDifficulty, selectedMode)}
                className="w-full py-4 bg-zinc-900 text-white rounded-xl font-bold text-lg shadow-xl hover:bg-zinc-800 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
                Start Game
            </button>
        </div>

      </div>
    </div>
  );
};

interface ScoreModalProps {
    result: ScoreResult;
    onClose: () => void;
    onNewGame: () => void;
}

export const ScoreModal: React.FC<ScoreModalProps> = ({ result, onClose, onNewGame }) => {
    return (
      <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
             
             {/* Header Winner Announcement */}
             <div className="p-6 text-center border-b border-zinc-100 bg-zinc-50">
                <div className="uppercase tracking-widest text-xs font-bold text-zinc-400 mb-2">Winner</div>
                <h2 className="text-4xl font-serif-jp font-black text-zinc-900">
                    {result.winner === 'black' ? 'BLACK' : result.winner === 'white' ? 'WHITE' : 'DRAW'}
                </h2>
                <div className="mt-2 text-zinc-500 font-medium">
                    {result.winner === 'black' 
                        ? `Won by ${(result.black.total - result.white.total).toFixed(1)} points`
                        : `Won by ${(result.white.total - result.black.total).toFixed(1)} points`
                    }
                </div>
             </div>

             {/* Score Details */}
             <div className="p-6 space-y-6">
                 
                 {/* Black Score */}
                 <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-black border-2 border-zinc-800 shadow-sm"></div>
                         <div className="font-bold text-lg">Black</div>
                     </div>
                     <div className="text-right">
                         <div className="text-2xl font-black text-zinc-900">{result.black.total}</div>
                         <div className="text-xs text-zinc-400 font-medium">
                             {result.black.territory} terr + {result.black.captures} cap
                         </div>
                     </div>
                 </div>

                 <div className="h-px bg-zinc-100 w-full"></div>

                 {/* White Score */}
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-white border-2 border-zinc-200 shadow-sm"></div>
                         <div className="font-bold text-lg">White</div>
                     </div>
                     <div className="text-right">
                         <div className="text-2xl font-black text-zinc-900">{result.white.total}</div>
                         <div className="text-xs text-zinc-400 font-medium">
                             {result.white.territory} terr + {result.white.captures} cap + {result.white.komi} komi
                         </div>
                     </div>
                 </div>

             </div>

             {/* Footer Actions */}
             <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex gap-3">
                 <button 
                    onClick={onClose}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors"
                >
                    Close
                </button>
                <button 
                    onClick={onNewGame}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-zinc-900 hover:bg-zinc-800 transition-colors"
                >
                    New Game
                </button>
             </div>
        </div>
      </div>
    );
};