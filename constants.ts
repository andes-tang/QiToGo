import { Difficulty } from "./types";

export const BOARD_SIZES = [9, 13, 19] as const;

export const KOMI = 6.5;

export const AI_MODELS = {
  [Difficulty.Novice]: 'gemini-2.5-flash',
  [Difficulty.Intermediate]: 'gemini-2.5-flash',
  [Difficulty.Master]: 'gemini-3-pro-preview', 
};

export const DIFFICULTY_DESCRIPTIONS = {
  [Difficulty.Novice]: "Fast, makes mistakes. Good for learning.",
  [Difficulty.Intermediate]: "Balanced gameplay. Standard challenge.",
  [Difficulty.Master]: "High-level reasoning (Uses Thinking Model).",
};