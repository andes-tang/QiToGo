import { GoogleGenAI, Type, Schema } from "@google/genai";
import { BoardState, Difficulty, Point } from "../types";
import { AI_MODELS, KOMI } from "../constants";

// Helper to convert board to SGF-like simple string representation for AI context
const boardToString = (board: BoardState, size: number): string => {
  let output = `Board Size: ${size}x${size}\n`;
  output += "  " + Array.from({ length: size }, (_, i) => String.fromCharCode(65 + i + (i >= 8 ? 1 : 0))).join(" ") + "\n";
  
  for (let y = 0; y < size; y++) {
    const rowNum = String(size - y).padStart(2, ' ');
    let rowStr = `${rowNum} `;
    for (let x = 0; x < size; x++) {
      const cell = board[y][x];
      if (cell === 'black') rowStr += "X ";
      else if (cell === 'white') rowStr += "O ";
      else rowStr += ". ";
    }
    output += rowStr + "\n";
  }
  return output;
};

// Helper: Convert internal (x,y) to human readable (e.g., C4)
const toHumanCoord = (x: number, y: number, size: number): string => {
  const colLetter = String.fromCharCode(65 + x + (x >= 8 ? 1 : 0));
  const rowNum = size - y;
  return `${colLetter}${rowNum}`;
};

interface AiMoveResponse {
  x: number;
  y: number;
  pass: boolean;
  resign: boolean;
  thought?: string;
}

export const getAiMove = async (
  board: BoardState,
  boardSize: number,
  difficulty: Difficulty,
  captures: { black: number; white: number },
  lastMove: Point | null
): Promise<AiMoveResponse> => {
  
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key missing");
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelName = AI_MODELS[difficulty];

  // System instruction based on difficulty
  let systemInstruction = "You are an expert Go (Weiqi/Baduk) AI. You are playing as WHITE (O). Black (X) has just moved.";
  
  if (difficulty === Difficulty.Novice) {
    systemInstruction += " Play casually. Make minor mistakes occasionally. Do not be aggressive.";
  } else if (difficulty === Difficulty.Intermediate) {
    systemInstruction += " Play a solid game. Focus on standard joseki and good shape.";
  } else {
    systemInstruction += " Play at a professional, master level. Calculate liberties and territory deeply.";
  }

  systemInstruction += "\nIMPORTANT: You must output JSON. Coordinates are 0-indexed: x (column, 0 is Left), y (row, 0 is Top).";

  const boardVisual = boardToString(board, boardSize);
  
  const lastMoveStr = lastMove 
    ? `Black played at ${toHumanCoord(lastMove.x, lastMove.y, boardSize)} (internal: x=${lastMove.x}, y=${lastMove.y}).` 
    : "Black just started or passed.";

  const prompt = `
Current Board State:
${boardVisual}

Captures -> Black: ${captures.black}, White: ${captures.white}
Komi: ${KOMI} (Points added to White's final score)
Last Move: ${lastMoveStr}

Analyze the board.
1. Identify weak groups.
2. Find the biggest move on the board.
3. Ensure the move is valid (not suicide, not on top of another stone).
4. If there are no good moves or the game is clearly over, you may Pass.
5. If you are significantly behind (e.g., > 15-20 points estimated difference) and victory is impossible, set 'resign' to true.

Output strict JSON:
{
  "x": number, // 0 to ${boardSize - 1}
  "y": number, // 0 to ${boardSize - 1}
  "pass": boolean,
  "resign": boolean, // Set to true to give up
  "thought": "Short explanation of your strategy"
}
`;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      x: { type: Type.INTEGER, description: "0-indexed column coordinate" },
      y: { type: Type.INTEGER, description: "0-indexed row coordinate" },
      pass: { type: Type.BOOLEAN, description: "True if passing the turn" },
      resign: { type: Type.BOOLEAN, description: "True if resigning the game" },
      thought: { type: Type.STRING, description: "Strategic reasoning for the move" }
    },
    required: ["x", "y", "pass", "resign", "thought"]
  };

  // Function to perform the API call with specific config
  const performAiCall = async (model: string, useThinking: boolean) => {
    const config: any = {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      systemInstruction: systemInstruction, // Inject system instruction here if needed, or in prompt. 
                                            // Since @google/genai supports config.systemInstruction, we use it.
    };

    if (useThinking) {
       // Reduced thinking budget for speed (approx < 10s)
       // 1024 tokens is a reasonable balance for speed vs intelligence on a game board
       config.thinkingConfig = { thinkingBudget: 1024 }; 
    }

    return ai.models.generateContent({
      model: model,
      contents: prompt,
      config: config
    });
  };

  try {
    // Determine if we should use thinking based on difficulty
    // Only Master uses thinking, and we enforce a timeout
    const useThinking = difficulty === Difficulty.Master;
    
    // Strict 10s timeout promise
    const timeoutMs = 9500; // 9.5s to be safe within 10s
    const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("AI Timeout")), timeoutMs)
    );

    const response = await Promise.race([
        performAiCall(modelName, useThinking),
        timeoutPromise
    ]);

    const text = response.text;
    if (!text) throw new Error("Empty AI response");

    const result = JSON.parse(text) as AiMoveResponse;
    return result;

  } catch (error) {
    console.warn("Primary AI Error or Timeout:", error);
    
    // Fallback: Quick Flash model call if the main one timed out or failed
    // This ensures we still get a "smart" move rather than random
    try {
        console.log("Attempting fallback with Gemini 2.5 Flash...");
        const fallbackResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt + "\n\n(Previous attempt timed out. Provide a valid move immediately.)",
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                systemInstruction: "You are a fallback Go AI. Play a valid move instantly."
            }
        });
        
        const text = fallbackResponse.text;
        if (text) {
             const result = JSON.parse(text) as AiMoveResponse;
             return { ...result, thought: result.thought + " (Fast Fallback)" };
        }
    } catch (fallbackError) {
        console.error("Fallback failed:", fallbackError);
    }

    // Last Resort: Random valid move
    for(let i=0; i<boardSize; i++) {
        for(let j=0; j<boardSize; j++) {
            if (board[j][i] === null) {
                return { x: i, y: j, pass: false, resign: false, thought: "Fallback random move due to connection error." };
            }
        }
    }
    return { x: 0, y: 0, pass: true, resign: false, thought: "Error, passing." };
  }
};