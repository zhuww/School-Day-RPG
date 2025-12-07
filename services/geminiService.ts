
import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

const MODEL_NAME = 'gemini-2.5-flash';

export const generateDialogue = async (npcName: string, location: string, type?: string): Promise<string> => {
  // Hardcoded animal sounds to prevent talking animals
  if (type === 'DOG') return "汪汪！(摇尾巴)";
  if (type === 'CAT') return "喵~(伸懒腰)";
  if (type === 'BIRD') return "叽叽喳喳...";

  if (!apiKey) return "你好！(API Key missing)";

  try {
    const prompt = `
      Context: A Role Playing Game set in a primary school in China.
      Character: ${npcName}
      Location: ${location}
      Player: A young girl in purple pajamas.
      
      Write ONE short, casual sentence of dialogue that ${npcName} says to the player in Simplified Chinese (中文).
      
      Rules:
      - If it's a Teacher, they might scold the player for the pajamas or tell them to study.
      - If it's a Student, they might be curious or friendly.
      - If it's a Guard, they might be confused.
      
      Keep it natural and suitable for a school setting.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    return response.text?.trim() || "...";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "...";
  }
};

export const generateQuiz = async (subject: string): Promise<{ question: string, options: string[], answer: number }> => {
  if (!apiKey) return {
    question: "1 + 1 = ?",
    options: ["1", "2", "3", "4"],
    answer: 1
  };

  try {
    const prompt = `Generate a simple single-choice question for a primary school student in China for the subject: ${subject}.
    Return JSON format.
    The question should be in Chinese.
    The options should be an array of 4 strings.
    The answer should be the index (0-3) of the correct option.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            answer: { type: Type.INTEGER }
          }
        }
      }
    });
    
    const text = response.text || "{}";
    return JSON.parse(text);

  } catch (error) {
    console.error("Quiz Gen Error", error);
    return {
      question: "生成题目失败，请重试。",
      options: ["...", "...", "...", "..."],
      answer: 0
    };
  }
}
