
import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

const MODEL_NAME = 'gemini-2.5-flash';

// Typical lines for specific characters to ensure personality
const CHARACTER_LINES: Record<string, string[]> = {
  'teacher_chinese': [
    "同学们，把书翻到第十页，我们开始上课。",
    "字迹一定要工整，俗话说见字如面。",
    "窗外的同学，注意力集中！"
  ],
  'teacher_math': [
    "这道题的公式大家记住了吗？",
    "数学是逻辑的体操，不要马虎。",
    "看黑板，这个步骤很关键。"
  ],
  'teacher_english': [
    "Good morning class! Read after me.",
    "Don't forget to memorize your vocabulary.",
    "Who can answer this question?"
  ],
  'teacher_pe': [
    "集合！向右看齐！",
    "今天我们要跑五圈，动起来！",
    "注意动作规范，不要受伤。"
  ],
  'ra_npc': [
    "早点休息，不要大声喧哗。",
    "出门记得关灯锁门。",
    "被子叠整齐了吗？"
  ],
  'guard': [
    "进出校门要登记。",
    "注意安全，别在校门口逗留。",
    "那个同学，校徽戴好了吗？"
  ]
};

export const generateDialogue = async (npcId: string, npcName: string, location: string, type?: string): Promise<string> => {
  // Hardcoded animal sounds
  if (type === 'DOG') return "汪汪！(摇尾巴)";
  if (type === 'CAT') return "喵~(伸懒腰)";
  if (type === 'BIRD') return "叽叽喳喳...";

  // 30% chance to return a "Typical" line for main NPCs
  if (CHARACTER_LINES[npcId] && Math.random() < 0.3) {
      const lines = CHARACTER_LINES[npcId];
      return lines[Math.floor(Math.random() * lines.length)];
  }

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
      - Keep it natural and suitable for a school setting.
      - Maximum 20 words.
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

export const generateSpeech = async (text: string, voice: string = 'Kore'): Promise<string | null> => {
  if (!apiKey) return null;
  // Don't generate speech for brackets like (shaking tail)
  const cleanText = text.replace(/\(.*?\)/g, '').trim();
  if (!cleanText) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: { parts: [{ text: cleanText }] },
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("TTS Error", error);
    return null;
  }
};

export const generateQuiz = async (subject: string): Promise<{ question: string, options: string[], answer: number }> => {
  return {
      question: "生成题目失败，请重试。",
      options: ["...", "...", "...", "..."],
      answer: 0
    };
}
