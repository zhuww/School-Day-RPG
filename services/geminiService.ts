
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

const MODEL_NAME = 'gemini-2.5-flash';

// In-memory cache to reduce API calls
const dialogueCache = new Map<string, string>();
const audioCache = new Map<string, string>();

// Fallback lines for offline mode or quota exceeded
const FALLBACK_LINES: Record<string, string[]> = {
  'teacher_chinese': [
    "（温柔）同学们，‘读书破万卷，下笔如有神’，今天要多读几页书哦。",
    "（提问）大家知道‘春眠不觉晓’描写的是哪个季节吗？",
    "（讲解）写字的时候要心静，横平竖直，字如其人。",
    "（鼓励）这篇作文写得真生动，继续加油！"
  ],
  'teacher_math': [
    "（推眼镜）数学是思维的体操，大家做题要细心。",
    "（提问）谁能告诉我，三角形的内角和是多少度？",
    "（讲解）计算的时候小数点要对齐，不可以马虎。",
    "（严谨）逻辑要清晰，一步一步推导才能得出正确答案。"
  ],
  'teacher_english': [
    "（活泼）Good morning class! How are you today?",
    "（提问）Can you tell me what color this is? Yes, it's red!",
    "（鼓励）Don't be shy! Speak out loud! 大声读出来！",
    "（唱歌）Let's sing the ABC song together! A B C D..."
  ],
  'teacher_pe': [
    "（大声）集合！向右看齐！精神饱满一点！",
    "（口令）一二一，一二一！脚步跟上节奏！",
    "（强调）身体是革命的本钱，多运动才能不生病！",
    "（示范）看我看我，深蹲要做到位，背挺直！"
  ],
  'ra_npc': [
    "（关心）天冷了，记得多穿件衣服，别着凉了。",
    "（检查）宿舍卫生要注意，被子要叠成豆腐块哦。",
    "（温和）晚上早点休息，明天上课才有精神。",
    "（叮嘱）离开宿舍记得关好门窗，注意安全呀。"
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

// Helper to generate local fallback based on persona keywords
const getLocalFallback = (npcName: string, persona?: string, type?: string): string => {
    if (!persona) return "你好呀！";
    
    if (persona.includes('吃货') || persona.includes('零食')) return "（嚼嚼）今天的午饭吃什么呢...";
    if (persona.includes('看书') || persona.includes('学霸')) return "嘘，我在看书呢，别打扰我。";
    if (persona.includes('运动') || persona.includes('打球')) return "好想去操场跑步啊！";
    if (persona.includes('睡觉')) return "（揉眼睛）好困啊...再睡五分钟...";
    if (persona.includes('画画')) return "你看我画的这只小猫像吗？";
    if (persona.includes('秘密') || persona.includes('说话')) return "我告诉你一个秘密，你别告诉别人哦...";
    if (persona.includes('害羞')) return "（脸红）那个...你好...";
    if (persona.includes('追星')) return "你听过那个新的组合唱歌吗？太好听了！";
    if (persona.includes('科技')) return "我在研究怎么把橡皮变成机器人！";
    
    return "今天天气真不错！";
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
  // Hardcoded animal sounds (No API needed)
  if (type === 'DOG') return "汪汪！";
  if (type === 'CAT') return "喵~";
  if (type === 'BIRD') return "叽叽喳喳";

  // Check Cache
  const cacheKey = `dialogue_${npcId}_${isLecture}_${subject}`;
  if (dialogueCache.has(cacheKey) && Math.random() > 0.3) { // 30% chance to regenerate to keep lectures fresh
      return dialogueCache.get(cacheKey)!;
  }

  // Fallback Logic for Lectures if API fails
  const getLectureFallback = () => {
      if (subject === '语文') return "同学们，谁能背诵《静夜思》？";
      if (subject === '数学') return "大家算一算，5加7等于多少？";
      if (subject === '英语') return "Class, what is your name?";
      if (subject === '体育') return "伸展运动，开始！一二三四！";
      return "同学们，请看黑板。";
  };

  try {
      if (!apiKey) throw new Error("No API Key");

      let prompt = '';
      
      if (isLecture && subject) {
          prompt = `
            Roleplay: Primary school teacher (${subject}).
            Context: Giving a lecture in class.
            Task: Teach a very brief concept and ASK THE STUDENT A SIMPLE QUESTION about it to interact.
            Language: Simplified Chinese.
            Length: Max 25 words.
            Tone: Encouraging and educational.
          `;
      } else if (persona && type === 'NPC') {
          prompt = `
            Context: Primary school RPG.
            Character: ${npcName} (Child).
            Persona: ${persona}.
            Task: Roleplay as this child. Based on your persona, start a conversation topic related to your interests. Ask a question or share a thought.
            Length: Max 15 words.
            Language: Simplified Chinese.
          `;
      } else {
          prompt = `
            Context: Primary school RPG.
            Character: ${npcName}.
            Location: ${location}.
            Task: Say one short sentence.
            Length: Max 15 words.
            Language: Simplified Chinese.
          `;
      }

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
      });

      const text = response.text?.trim() || "你好！";
      dialogueCache.set(cacheKey, text); // Cache the result
      return text;

  } catch (error) {
    console.warn("Gemini API Error (Dialogue):", error);
    // Graceful Fallback
    if (isLecture) return getLectureFallback();
    if (FALLBACK_LINES[npcId]) {
        const lines = FALLBACK_LINES[npcId];
        return lines[Math.floor(Math.random() * lines.length)];
    }
    return getLocalFallback(npcName, persona, type);
  }
};

export const generateSpeech = async (text: string, voice: string = 'Kore'): Promise<string | null> => {
  if (!apiKey) return null;
  
  // Clean text
  const cleanText = text.replace(/（.*?）|\(.*?\)/g, '').trim();
  if (!cleanText) return null;

  // Check Cache
  const cacheKey = `audio_${voice}_${cleanText}`;
  if (audioCache.has(cacheKey)) {
      return audioCache.get(cacheKey)!;
  }

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
    
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    if (audioData) {
        audioCache.set(cacheKey, audioData);
    }
    return audioData;

  } catch (error) {
    console.warn("Gemini API Error (TTS): Quota likely exceeded. Skipping audio.");
    return null; // Return null to fail silently without breaking the game loop
  }
};

export const generateQuiz = async (subject: string): Promise<{ question: string, options: string[], answer: number }> => {
  return {
      question: "生成题目失败，请重试。",
      options: ["...", "...", "...", "..."],
      answer: 0
    };
}
