
import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

const MODEL_NAME = 'gemini-2.5-flash';

// Typical lines for specific characters to ensure personality
const CHARACTER_LINES: Record<string, string[]> = {
  'teacher_chinese': [
    "（温柔）同学，要多读书，书里有黄金屋哦。",
    "（微笑）字如其人，写字要一笔一划。",
    "（提醒）上课要专心，不要走神。"
  ],
  'teacher_math': [
    "（推眼镜）数学很有趣，生活处处是数学。",
    "（严肃）计算要仔细，小数点不能点错。",
    "（鼓励）不懂就问，老师很喜欢爱提问的同学。"
  ],
  'teacher_english': [
    "（活泼）Hello! How are you today?",
    "（指着卡片）Apple! A-P-P-L-E.",
    "（轻松）Don't be shy, speak up!"
  ],
  'teacher_pe': [
    "（大声）身体健康最重要！多运动！",
    "（拍手）集合！动作快一点！",
    "（鼓励）坚持就是胜利，再跑一圈！"
  ],
  'ra_npc': [
    "（关心）天冷了，多穿点衣服。",
    "（检查）被子要叠整齐哦。",
    "（温和）早点休息，别熬夜。"
  ],
  'guard': [
    "（警惕）注意安全，不要跟陌生人走。",
    "（和蔼）放学早点回家，别贪玩。",
    "（敬礼）早上好！"
  ],
  'cashier': [
    "（热情）小朋友，想买点什么？",
    "（算账）一共两块钱，拿好。",
    "（推荐）这个棒棒糖很甜哦。"
  ]
};

export const generateDialogue = async (
    npcId: string, 
    npcName: string, 
    location: string, 
    type?: string, 
    persona?: string,
    isLecture: boolean = false,
    subject?: string
): Promise<string> => {
  // Hardcoded animal sounds (TTS usually handles these simple sounds okay)
  if (type === 'DOG') return "汪汪！";
  if (type === 'CAT') return "喵~";
  if (type === 'BIRD') return "叽叽喳喳";

  // If asking for a lecture, strictly generate educational content
  if (isLecture && subject && apiKey) {
      const prompt = `
        Roleplay: Primary school teacher (${subject}).
        Context: Giving a lecture in class.
        Task: Say ONE sentence explaining a simple concept in ${subject}.
        - Chinese: Explain a simple idiom or poem line.
        - Math: Explain a simple addition/subtraction or geometry concept.
        - English: Teach a simple phrase or word.
        - PE: Give a specific exercise instruction.
        Language: Simplified Chinese (English teacher can mix English).
        Length: Max 30 words.
      `;
      try {
          const response = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: prompt,
          });
          return response.text?.trim() || "同学们，看黑板...";
      } catch (e) {
          return "同学们请安静，我们继续上课。";
      }
  }

  // 40% chance to return a "Typical" line for main NPCs to save tokens/time and ensure consistency
  // But if a persona is provided (students), we prefer generating dynamic content.
  if (!persona && CHARACTER_LINES[npcId] && Math.random() < 0.4) {
      const lines = CHARACTER_LINES[npcId];
      return lines[Math.floor(Math.random() * lines.length)];
  }

  if (!apiKey) return "你好！(API Key missing)";

  try {
    let prompt = '';
    
    if (persona && type === 'NPC') {
        // Child / Student Prompt
        prompt = `
          Context: Primary school RPG.
          Character: ${npcName} (Child/Student).
          Persona: ${persona}.
          Task: Say a very short, cute, casual greeting or simple thought to a classmate.
          - Max 10 words.
          - Child-like tone.
          - Simplified Chinese.
        `;
    } else {
        // Fallback for generic NPCs
        prompt = `
          Context: Primary school RPG.
          Character: ${npcName}.
          Location: ${location}.
          Task: Say one short sentence to a student.
          - Max 15 words.
          - Simplified Chinese.
        `;
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    return response.text?.trim() || "你好呀！";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "...";
  }
};

export const generateSpeech = async (text: string, voice: string = 'Kore'): Promise<string | null> => {
  if (!apiKey) return null;
  // Don't generate speech for brackets like (shaking tail)
  const cleanText = text.replace(/（.*?）|\(.*?\)/g, '').trim();
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
