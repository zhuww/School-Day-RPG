
import React, { useRef, useEffect, useState } from 'react';
import { GameState, MapData, Entity, EntityType, Point, Friend, Quiz, Item } from './types';
import { generateDialogue, generateSpeech } from './services/geminiService';
import GameClock from './components/GameClock';

// --- CONSTANTS ---
const PLAYER_SPEED = 2.0;
const NPC_SPEED = 1.5;
const ANIMAL_SPEED = 2.0;
const CURFEW_TIMEOUT_MS = 20000; 

const TEACHERS: Record<string, any> = {
  'Chinese': { 
      id: 'teacher_chinese', 
      name: '王老师', 
      color: '#FFFFFF', 
      subject: '语文',
      voice: 'Zephyr', // Soft female for gentle personality
      persona: '温柔知性，喜欢引用古诗词',
      visual: { hair: 'curly_brown', outfit: 'apron' }
  },
  'Math': { 
      id: 'teacher_math', 
      name: '李老师', 
      color: '#2563EB', 
      subject: '数学',
      voice: 'Kore', // Standard female for strict personality
      persona: '严谨认真，注重逻辑',
      visual: { hair: 'long_black', outfit: 'normal' }
  },
  'English': { 
      id: 'teacher_english', 
      name: '张老师', 
      color: '#000000', 
      subject: '英语',
      voice: 'Aoede', // High pitch female for lively personality
      persona: '活泼开朗，喜欢唱歌',
      visual: { hair: 'short_black', outfit: 'skirt' }
  },
  'PE': { 
      id: 'teacher_pe', 
      name: '李老师(体)', 
      color: '#16A34A', 
      subject: '体育',
      voice: 'Fenrir', // Deep male
      persona: '充满活力，嗓门大，强调健康',
      visual: { hair: 'short_black_male', outfit: 'sport_male' }
  },
};

const STUDENT_TRAITS = [
    '吃货，口袋里总有零食',
    '学霸，喜欢看书',
    '运动健将，想去打球',
    '爱说话，知道很多秘密',
    '害羞，声音很小',
    '喜欢画画',
    '调皮，喜欢玩',
    '热心肠，帮老师做事',
    '爱睡觉',
    '追星族，喜欢讨论偶像',
    '科技迷，喜欢机器人'
];

const INITIAL_ITEMS: Item[] = [
    { id: 'book_chinese', name: '语文课本', category: 'study', icon: '📕' },
    { id: 'book_math', name: '数学课本', category: 'study', icon: '📘' },
    { id: 'book_english', name: '英语课本', category: 'study', icon: '📗' },
    { id: 'jump_rope', name: '跳绳', category: 'sport', icon: '➰' }
];

const MAPS: Record<string, MapData> = {
  'playground': {
    id: 'playground',
    name: '校门口',
    width: 1400,
    height: 1200,
    backgroundColor: '#65A30D',
    spawnPoint: { x: 700, y: 1100 },
    walls: [
      { x: 0, y: 0, w: 1400, h: 50 },
      { x: 0, y: 0, w: 50, h: 1200 },
      { x: 1350, y: 0, w: 50, h: 1200 },
      { x: 0, y: 1150, w: 600, h: 50 },
      { x: 800, y: 1150, w: 600, h: 50 },
      { x: 400, y: 200, w: 600, h: 100 }, 
      { x: 100, y: 400, w: 200, h: 100 },
      { x: 1100, y: 200, w: 150, h: 80 },
    ],
    entities: [
      { id: 'school_bldg', type: EntityType.BUILDING, pos: { x: 700, y: 300 }, size: 0, color: 'transparent' }, 
      { id: 'portal_class', type: EntityType.PORTAL, pos: { x: 700, y: 320 }, size: 60, color: 'rgba(0,0,0,0)', targetMap: 'classroom', targetPos: { x: 100, y: 400 } },
      
      { id: 'dorm_bldg', type: EntityType.DORMITORY, pos: { x: 200, y: 450 }, size: 0, color: 'transparent' },
      { id: 'portal_dorm_hall', type: EntityType.PORTAL, pos: { x: 200, y: 450 }, size: 60, color: 'rgba(0,0,0,0)', targetMap: 'dorm_hallway', targetPos: { x: 50, y: 150 } },

      { id: 'store_bldg', type: EntityType.STORE, pos: { x: 1175, y: 280 }, size: 0, color: 'transparent' },
      { id: 'portal_store', type: EntityType.PORTAL, pos: { x: 1175, y: 280 }, size: 50, color: 'rgba(0,0,0,0)', targetMap: 'store_interior', targetPos: { x: 300, y: 450 } },

      { id: 'pool', type: EntityType.SWIMMING_POOL, pos: { x: 200, y: 900 }, size: 150, color: '#3B82F6', name: '游泳池' },

      { id: 'guard', type: EntityType.NPC, subtype: 'adult', pos: { x: 650, y: 1120 }, size: 25, color: '#1F2937', name: '保安叔叔', facing: 'right', persona: '尽职尽责，关心学生安全', voiceName: 'Charon' }, // Deep male
      
      { id: 'hoop_1', type: EntityType.HOOP, pos: { x: 200, y: 600 }, size: 40, color: '#eee' },
      { id: 'hoop_2', type: EntityType.HOOP, pos: { x: 1200, y: 600 }, size: 40, color: '#eee' },

      { id: 'dog_1', type: EntityType.DOG, pos: { x: 300, y: 1000 }, size: 20, color: '#92400E', name: '大黄' },
      { id: 'cat_1', type: EntityType.CAT, pos: { x: 1100, y: 900 }, size: 15, color: '#E5E7EB', name: '小白' },
      { id: 'bird_1', type: EntityType.BIRD, pos: { x: 400, y: 400 }, size: 10, color: '#60A5FA', name: '小鸟' },
      { id: 'bird_2', type: EntityType.BIRD, pos: { x: 450, y: 420 }, size: 10, color: '#60A5FA', name: '小鸟' },

      { id: 'c1', type: EntityType.NPC, subtype: 'child', pos: { x: 300, y: 800 }, size: 18, color: '#F59E0B', name: '跑步的男生', facing: 'left', persona: '喜欢跑步', voiceName: 'Puck' },
      { id: 'c2', type: EntityType.NPC, subtype: 'child', pos: { x: 900, y: 700 }, size: 18, color: '#EC4899', name: '聊天的女生', facing: 'left', persona: '正在讨论动画片', voiceName: 'Puck' },
    ]
  },
  'classroom': {
    id: 'classroom',
    name: '一年级(2)班',
    width: 1000,
    height: 900,
    backgroundColor: '#FEF3C7',
    spawnPoint: { x: 80, y: 400 },
    walls: [
      { x: 0, y: 0, w: 1000, h: 50 },
      { x: 0, y: 850, w: 1000, h: 50 },
      { x: 0, y: 0, w: 50, h: 900 },
      { x: 950, y: 0, w: 50, h: 900 },
      { x: 350, y: 50, w: 300, h: 60 },
    ],
    entities: [
      { id: 'portal_out', type: EntityType.PORTAL, pos: { x: 50, y: 400 }, size: 40, color: '#E5E7EB', targetMap: 'playground', targetPos: { x: 700, y: 380 } },
      
      // Classroom Decorations
      { id: 'blackboard', type: EntityType.BLACKBOARD, pos: { x: 500, y: 30 }, size: 240, color: '#111827', name: '黑板' },
      { id: 'poster_1', type: EntityType.POSTER, pos: { x: 150, y: 20 }, size: 40, color: '#F87171', name: '名人名言' },
      { id: 'poster_2', type: EntityType.POSTER, pos: { x: 850, y: 20 }, size: 40, color: '#60A5FA', name: '班级公约' },
      { id: 'win_c1', type: EntityType.WINDOW, pos: { x: 300, y: 10 }, size: 60, color: '#fff' },
      { id: 'win_c2', type: EntityType.WINDOW, pos: { x: 700, y: 10 }, size: 60, color: '#fff' },
      { id: 'plant_1', type: EntityType.PLANT, pos: { x: 300, y: 20 }, size: 20, color: '#22C55E', name: '绿植' },
      { id: 'plant_2', type: EntityType.PLANT, pos: { x: 700, y: 20 }, size: 20, color: '#22C55E', name: '绿植' },

      ...Array.from({ length: 20 }).map((_, i) => {
        const row = Math.floor(i / 4);
        const col = i % 4;
        const xBase = col < 2 ? 250 + col * 130 : 600 + (col-2) * 130;
        const yBase = 320 + row * 130;
        const isPlayerSeat = row === 0 && col === 1;

        return {
          id: `desk_${i}`,
          type: EntityType.DESK,
          subtype: 'child' as const,
          pos: { x: xBase, y: yBase },
          size: 30,
          color: '#92400E',
          name: isPlayerSeat ? '空座位' : '座位',
          isOccupied: !isPlayerSeat
        };
      }),
      { id: 'my_backpack', type: EntityType.BACKPACK, pos: { x: 430, y: 330 }, size: 15, color: '#DB2777', name: '我的书包' }
    ]
  },
  'dorm_hallway': {
    id: 'dorm_hallway',
    name: '宿舍走廊',
    width: 600,
    height: 400,
    backgroundColor: '#F3F4F6',
    spawnPoint: { x: 50, y: 150 },
    walls: [
      { x: 0, y: 0, w: 600, h: 50 },
      { x: 0, y: 350, w: 600, h: 50 },
    ],
    entities: [
      // Explicit labels and brighter colors for doors
      { id: 'portal_playground', type: EntityType.PORTAL, pos: { x: 30, y: 200 }, size: 40, color: '#9CA3AF', targetMap: 'playground', targetPos: { x: 200, y: 550 }, name: '出口' },
      { id: 'door_my_dorm', type: EntityType.PORTAL, pos: { x: 500, y: 50 }, size: 50, color: '#8B4513', targetMap: 'dorm_room', targetPos: { x: 400, y: 500 }, name: '我的宿舍' },
      
      { id: 'ra_desk', type: EntityType.TABLE, pos: { x: 300, y: 250 }, size: 100, color: '#D97706', name: '值班前台' },
      { id: 'ra_chair', type: EntityType.CHAIR, pos: { x: 300, y: 200 }, size: 25, color: '#1F2937', name: '椅子', facing: 'down' },
      { id: 'ra_npc', type: EntityType.NPC, subtype: 'adult', pos: { x: 300, y: 200 }, size: 25, color: '#BE123C', name: '宿管老师', facing: 'down', persona: '像妈妈一样关心学生的生活', voiceName: 'Zephyr' } // Soft female
    ]
  },
  'dorm_room': {
    id: 'dorm_room',
    name: '我的宿舍',
    width: 800,
    height: 600,
    backgroundColor: '#FEF3C7',
    spawnPoint: { x: 400, y: 500 },
    walls: [
      { x: 0, y: 0, w: 800, h: 50 },
      { x: 0, y: 550, w: 800, h: 50 },
      { x: 0, y: 0, w: 50, h: 600 },
      { x: 750, y: 0, w: 50, h: 600 },
    ],
    entities: [
      // Exit Red Hole
      { id: 'portal_hallway', type: EntityType.PORTAL, pos: { x: 100, y: 500 }, size: 60, color: '#EF4444', targetMap: 'dorm_hallway', targetPos: { x: 300, y: 100 } },
      { id: 'win1', type: EntityType.WINDOW, pos: { x: 150, y: 10 }, size: 60, color: '#fff' },
      { id: 'win2', type: EntityType.WINDOW, pos: { x: 650, y: 10 }, size: 60, color: '#fff' },
      { id: 'bed_1', type: EntityType.BED, pos: { x: 100, y: 150 }, size: 80, color: '#60A5FA', name: '室友的床' },
      { id: 'bed_2', type: EntityType.BED, pos: { x: 100, y: 350 }, size: 80, color: '#F472B6', name: '室友的床' },
      { id: 'bed_my', type: EntityType.BED, pos: { x: 700, y: 150 }, size: 80, color: '#DB2777', name: '我的床' },
      { id: 'bed_4', type: EntityType.BED, pos: { x: 700, y: 350 }, size: 80, color: '#34D399', name: '室友的床' },
      { id: 'table', type: EntityType.TABLE, pos: { x: 400, y: 300 }, size: 120, color: '#78350F', name: '写字桌' },
      { id: 'chair_my', type: EntityType.CHAIR, pos: { x: 400, y: 380 }, size: 25, color: '#92400E', name: '我的椅子', facing: 'up' },
      { id: 'chair_2', type: EntityType.CHAIR, pos: { x: 300, y: 300 }, size: 25, color: '#92400E', name: '椅子', facing: 'right' },
      { id: 'chair_3', type: EntityType.CHAIR, pos: { x: 500, y: 300 }, size: 25, color: '#92400E', name: '椅子', facing: 'left' },
      { id: 'chair_4', type: EntityType.CHAIR, pos: { x: 400, y: 220 }, size: 25, color: '#92400E', name: '椅子', facing: 'down' },
      { id: 'dorm_backpack', type: EntityType.BACKPACK, pos: { x: 430, y: 380 }, size: 15, color: '#DB2777', name: '我的书包' }
    ]
  },
  'store_interior': {
    id: 'store_interior',
    name: '小卖部',
    width: 600,
    height: 500,
    backgroundColor: '#FFF7ED',
    spawnPoint: { x: 300, y: 450 },
    walls: [
      { x: 0, y: 0, w: 600, h: 50 },
      { x: 0, y: 450, w: 600, h: 50 },
      { x: 0, y: 0, w: 50, h: 500 },
      { x: 550, y: 0, w: 50, h: 500 },
    ],
    entities: [
      { id: 'portal_exit', type: EntityType.PORTAL, pos: { x: 300, y: 480 }, size: 40, color: '#9CA3AF', targetMap: 'playground', targetPos: { x: 1175, y: 350 } },
      { id: 'counter', type: EntityType.TABLE, pos: { x: 150, y: 300 }, size: 100, color: '#FCD34D', name: '收银台' },
      { id: 'cashier', type: EntityType.NPC, subtype: 'adult', pos: { x: 150, y: 280 }, size: 25, color: '#EF4444', name: '收银员', facing: 'down', persona: '精明但热情，喜欢推荐新零食', voiceName: 'Zephyr' },
      { id: 'shelf_1', type: EntityType.SHELF, pos: { x: 400, y: 150 }, size: 100, color: '#A78BFA', name: '零食货架' },
      { id: 'shelf_2', type: EntityType.SHELF, pos: { x: 400, y: 300 }, size: 100, color: '#F472B6', name: '面包货架' },
      { id: 'fridge_1', type: EntityType.FRIDGE, pos: { x: 150, y: 150 }, size: 80, color: '#60A5FA', name: '饮料柜' }
    ]
  }
};

const CLASSROOM_ENTITIES = MAPS['classroom'].entities;
const COLORS = ['#F87171', '#60A5FA', '#34D399', '#A78BFA', '#FBBF24', '#F472B6'];
const NAMES = ['小明', '小红', '刚子', '丽丽', '强子', '芳芳', '小军', '娜娜', '涛涛', '静静'];
const LEADERS = ['芳芳', '丽丽', '娜娜', '静静'];

// Initialize Classroom Students with Personas and Voices
CLASSROOM_ENTITIES.forEach((e, i) => {
   if (e.type === EntityType.DESK && e.isOccupied) {
       const npcId = `student_${i}`;
       // Use Random Trait for each student
       const trait = STUDENT_TRAITS[Math.floor(Math.random() * STUDENT_TRAITS.length)]; 
       // Assign 'Puck' (High pitch/Childlike) for children voices
       const voice = 'Puck'; 
       
       MAPS['classroom'].entities.push({
           id: npcId,
           type: EntityType.NPC,
           subtype: 'child',
           pos: { x: e.pos.x, y: e.pos.y + 40 }, 
           size: 18,
           color: COLORS[i % COLORS.length],
           name: NAMES[i % NAMES.length],
           facing: 'up',
           persona: trait,
           voiceName: voice
       });
   }
});

const DORM_NAMES = ['芳芳', '娜娜', '静静', '小兰', '小美'];
const spawnRoommates = () => {
    MAPS['dorm_room'].entities = MAPS['dorm_room'].entities.filter(e => !e.id.startsWith('roommate_'));
    DORM_NAMES.forEach((name, i) => {
        const isSleeping = Math.random() > 0.5;
        const targets = [
            { x: 100, y: 150 }, 
            { x: 100, y: 350 },
            { x: 700, y: 350 }, 
            { x: 300, y: 300 }, 
            { x: 500, y: 300 }, 
        ];
        const spot = targets[i];
        // Use Random Trait
        const trait = STUDENT_TRAITS[Math.floor(Math.random() * STUDENT_TRAITS.length)]; 
        // Force 'Puck' for all children to sound like kids
        const voice = 'Puck';

        MAPS['dorm_room'].entities.push({
            id: `roommate_${i}`,
            type: EntityType.NPC,
            subtype: 'child',
            pos: { x: spot.x, y: spot.y },
            size: 18,
            color: COLORS[i % COLORS.length],
            name: name,
            facing: isSleeping ? 'down' : 'up',
            behavior: isSleeping ? 'sleep' : 'study',
            persona: trait,
            voiceName: voice
        });
    });
};
spawnRoommates();

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const requestRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState<GameState>({
    currentMapId: 'playground',
    playerPos: { x: 700, y: 1100 },
    targetPos: null,
    isMoving: false,
    facing: 'right',
    dialogue: null,
    satAtDeskId: null,
    currentLesson: 'Chinese',
    selectedBook: null,
    isBackpackOpen: false,
    inventory: [...INITIAL_ITEMS], // Initialize Inventory
    friends: [],
    isFriendListOpen: false,
    isClassStarted: false,
    quiz: null,
    isTeacherTransitioning: false,
    isLiningUp: false,
    isSchoolOver: false,
    schoolOverTime: null,
    homeworkStatus: 'none',
    isNight: false,
    isMorningWakeUp: false,
    isMorningQueue: false,
    gameTime: 420, // 7:00 AM (420 minutes)
  });
  
  // Use a Ref to hold the latest game state to avoid restarting the render loop
  const gameStateRef = useRef(gameState);
  
  // Keep the Ref in sync with state
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const playerRef = useRef(gameState.playerPos);
  const targetRef = useRef<Point | null>(null);
  const mapRef = useRef(MAPS['playground']);
  const walkFrameRef = useRef(0);
  const lastStepAudioRef = useRef(0);
  const facingRef = useRef<'left' | 'right' | 'up' | 'down'>('right');
  const npcStateRef = useRef<Map<string, { target: Point | null, timer: number, behavior?: 'exit' | 'stay' }>>(new Map());

  // --- AUDIO SYSTEM (SFX & TTS) ---
  const initAudio = () => {
    if (!audioContextRef.current) {
         audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }
  };

  const playSfx = (type: 'step' | 'click' | 'open' | 'close' | 'success' | 'door' | 'furniture' | 'backpack') => {
      if (!audioContextRef.current) initAudio();
      const ctx = audioContextRef.current!;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      
      if (type === 'step') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(100, now);
          osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
      } else if (type === 'click') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
      } else if (type === 'open') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.linearRampToValueAtTime(800, now + 0.2);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
      } else if (type === 'close') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.linearRampToValueAtTime(400, now + 0.2);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
      } else if (type === 'success') {
          // Major Chord Arpeggio
          [440, 554, 659].forEach((freq, i) => {
              const o = ctx.createOscillator();
              const g = ctx.createGain();
              o.connect(g);
              g.connect(ctx.destination);
              o.frequency.value = freq;
              g.gain.setValueAtTime(0.05, now + i*0.1);
              g.gain.exponentialRampToValueAtTime(0.001, now + i*0.1 + 0.5);
              o.start(now + i*0.1);
              o.stop(now + i*0.1 + 0.5);
          });
      } else if (type === 'door') {
          osc.type = 'square';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
      } else if (type === 'furniture') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(100, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
      } else if (type === 'backpack') {
           osc.type = 'sawtooth';
           osc.frequency.setValueAtTime(800, now);
           osc.frequency.linearRampToValueAtTime(1200, now + 0.15);
           gain.gain.setValueAtTime(0.05, now);
           gain.gain.linearRampToValueAtTime(0, now + 0.15);
           osc.start(now);
           osc.stop(now + 0.15);
      }
  };

  const playAudio = async (base64Audio: string) => {
      try {
          initAudio();
          const ctx = audioContextRef.current!;
          const binaryString = atob(base64Audio);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
          }

          const dataInt16 = new Int16Array(bytes.buffer);
          const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
          const channelData = buffer.getChannelData(0);
          
          for (let i = 0; i < dataInt16.length; i++) {
               channelData[i] = dataInt16[i] / 32768.0;
          }

          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start();
      } catch (e) {
          console.error("Audio playback failed", e);
      }
  };

  // --- TIME CYCLE ---
  useEffect(() => {
    const timer = setInterval(() => {
      setGameState(prev => {
        const newTime = prev.gameTime + 5; // +5 mins every real second
        
        // Check Night (20:00 = 1200 mins)
        const isNightTime = newTime >= 1200 || newTime < 420; // 8 PM - 7 AM
        
        // Behavior Changes
        if (isNightTime && !prev.isNight) {
            // Transition to Night
            MAPS['dorm_room'].entities.forEach(e => {
                if (e.id.startsWith('roommate_')) {
                    e.behavior = 'sleep';
                    e.facing = 'down';
                }
            });
            return { 
                ...prev, 
                gameTime: newTime, 
                isNight: true, 
                dialogue: { speaker: '旁白', text: '天黑了，该回宿舍睡觉了...' } 
            };
        } else if (!isNightTime && prev.isNight) {
             // Transition to Day (handled by sleep usually, but just in case)
             return { ...prev, gameTime: newTime, isNight: false };
        }

        // Auto Curfew Warning (22:00 = 1320 mins)
        if (newTime === 1320 && !['dorm_room', 'dorm_hallway'].includes(prev.currentMapId)) {
             handleRAEscort();
        }

        return { ...prev, gameTime: newTime };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
      let interval: any;
      if (gameState.isMorningQueue) {
          interval = setInterval(() => {
              const roommates = MAPS['dorm_room'].entities.filter(e => e.id.startsWith('roommate_'));
              if (roommates.length > 0) {
                  const toRemove = roommates[0];
                  MAPS['dorm_room'].entities = MAPS['dorm_room'].entities.filter(e => e.id !== toRemove.id);
                  playSfx('step'); // Sound for roommate leaving
                  setGameState(prev => ({...prev}));
              } else {
                  setGameState(prev => ({ 
                      ...prev, 
                      isMorningQueue: false,
                      dialogue: { speaker: '旁白', text: '大家走完了，楼梯不挤了，我也可以出门了。' }
                  }));
              }
          }, 1500);
      }
      return () => clearInterval(interval);
  }, [gameState.isMorningQueue]);

  useEffect(() => {
      const interval = setInterval(() => {
          if (gameState.isSchoolOver && gameState.schoolOverTime) {
              const elapsed = Date.now() - gameState.schoolOverTime;
              if (elapsed > CURFEW_TIMEOUT_MS && !['dorm_room', 'dorm_hallway', 'store_interior'].includes(gameState.currentMapId)) {
                  handleRAEscort();
              }
          }
      }, 1000);
      return () => clearInterval(interval);
  }, [gameState.isSchoolOver, gameState.schoolOverTime, gameState.currentMapId]);

  const handleRAEscort = () => {
      mapRef.current = MAPS['dorm_hallway'];
      const deskPos = { x: 300, y: 320 };
      playerRef.current = { ...deskPos };
      facingRef.current = 'up';
      targetRef.current = null;

      const text = '同学，这么晚了还在外面很不安全！快回宿舍登记休息。';
      setGameState(prev => ({
          ...prev,
          currentMapId: 'dorm_hallway',
          playerPos: deskPos,
          targetPos: null,
          dialogue: { speaker: '宿管老师', text: text },
          schoolOverTime: null
      }));
      generateSpeech(text, 'Zephyr').then(audio => audio && playAudio(audio));
  };

  const checkCollision = (nextPos: Point, map: MapData): boolean => {
    for (const wall of map.walls) {
      if (
        nextPos.x + 15 > wall.x &&
        nextPos.x - 15 < wall.x + wall.w &&
        nextPos.y + 10 > wall.y &&
        nextPos.y - 10 < wall.y + wall.h
      ) {
        return true;
      }
    }
    return false;
  };

  const interact = async (entity: Entity) => {
    // Portals
    if (entity.type === EntityType.PORTAL && entity.targetMap && entity.targetPos) {
      if (gameState.isMorningQueue && entity.targetMap === 'dorm_hallway') {
           playSfx('click');
           setGameState(prev => ({ ...prev, dialogue: { speaker: '旁白', text: '楼梯太挤了，大家都在排队，等一会再出去吧。' } }));
           targetRef.current = null;
           return;
      }
      playSfx('door');
      mapRef.current = MAPS[entity.targetMap];
      playerRef.current = { ...entity.targetPos };
      targetRef.current = null;
      setGameState(prev => ({
        ...prev,
        currentMapId: entity.targetMap!,
        playerPos: entity.targetPos!,
        targetPos: null,
        dialogue: null,
        satAtDeskId: null,
        isBackpackOpen: false,
        isClassStarted: false,
        quiz: null,
        isLiningUp: false
      }));
      return;
    }

    if (entity.type === EntityType.STORE) return;
    
    // Interactions that just show dialogue
    if (entity.type === EntityType.SWIMMING_POOL) {
        playSfx('click');
        targetRef.current = null;
        setGameState(prev => ({
            ...prev,
            dialogue: { speaker: '旁白', text: '泳池的水很清凉，在这里游泳真是一种放松。' }
        }));
        return;
    }

    // --- STORE INVENTORY INTERACTIONS ---
    if (entity.type === EntityType.SHELF || entity.type === EntityType.FRIDGE) {
        playSfx('furniture');
        targetRef.current = null;
        
        let item: Item | null = null;
        if (entity.name === '零食货架') item = { id: 'chips', name: '薯片', category: 'food', icon: '🥔' };
        else if (entity.name === '面包货架') item = { id: 'bread', name: '面包', category: 'food', icon: '🍞' };
        else if (entity.name === '饮料柜') {
             item = Math.random() > 0.5 
                ? { id: 'cola', name: '可乐', category: 'drink', icon: '🥤' }
                : { id: 'water', name: '矿泉水', category: 'drink', icon: '💧' };
        }

        if (item) {
            setGameState(prev => ({
                ...prev,
                inventory: [...prev.inventory, item!],
                dialogue: { speaker: '旁白', text: `你拿了一份${item!.name}放进书包。` }
            }));
            playSfx('success');
        }
        return;
    }

    if (entity.type === EntityType.BLACKBOARD) {
        playSfx('furniture');
        targetRef.current = null;
        let text = '值日生把黑板擦得很干净。';
        if (gameState.isClassStarted) {
            const lesson = gameState.currentLesson;
            if (lesson === 'Chinese') text = '黑板上写着："春眠不觉晓，处处闻啼鸟。"';
            if (lesson === 'Math') text = '黑板上写着："12 + 34 = 46"';
            if (lesson === 'English') text = '黑板上写着："Apple, Banana, Orange"';
        }
        setGameState(prev => ({ ...prev, dialogue: { speaker: '旁白', text } }));
        return;
    }

    if (entity.type === EntityType.POSTER) {
        playSfx('click');
        targetRef.current = null;
        let text = '';
        
        if (entity.name === '班级公约') {
            text = '班级公约：\n1. 保持安静\n2. 互相帮助\n3. 爱护公物';
        } else {
             const lesson = gameState.currentLesson;
             if (lesson === 'Chinese') text = '知识点：汉字的演变从甲骨文开始。';
             else if (lesson === 'Math') text = '知识点：两点之间，线段最短。';
             else if (lesson === 'English') text = 'Daily Phrase: "Have a nice day!"';
             else if (lesson === 'PE') text = '健康小贴士：剧烈运动后不要立即喝冰水。';
             else text = '好好学习，天天向上！';
        }

        setGameState(prev => ({ ...prev, dialogue: { speaker: '海报', text } }));
        return;
    }

    if (['NPC', 'DOG', 'CAT', 'BIRD'].includes(entity.type)) {
      if (entity.behavior === 'sleep') {
          playSfx('click');
          setGameState(prev => ({ ...prev, dialogue: { speaker: '旁白', text: '她正在睡觉，不要打扰她。' } }));
          return;
      }
      
      playSfx('click');

      // Face the player
      if (Math.abs(entity.pos.x - playerRef.current.x) > Math.abs(entity.pos.y - playerRef.current.y)) {
         facingRef.current = entity.pos.x > playerRef.current.x ? 'right' : 'left';
      } else {
         facingRef.current = entity.pos.y > playerRef.current.y ? 'down' : 'up';
      }

      // Show immediate feedback "..."
      setGameState(prev => ({ ...prev, dialogue: { speaker: entity.name || 'Unknown', text: '...' } }));
      
      let isLecture = false;
      let subject = '';
      if (entity.id.startsWith('teacher_') && gameState.isClassStarted) {
          isLecture = true;
          subject = TEACHERS[gameState.currentLesson]?.subject || '';
      }

      // 1. Generate Text
      const text = await generateDialogue(entity.id, entity.name || 'NPC', mapRef.current.name, entity.type, entity.persona, isLecture, subject);
      
      // 2. Fetch Audio (Wait for both to be ready)
      let audioData: string | null = null;
      if (['NPC', 'DOG', 'CAT', 'BIRD'].includes(entity.type)) {
          // Default to 'Puck' for children if not specified, to avoid adult sounding voices
          const voice = entity.voiceName || (entity.subtype === 'child' ? 'Puck' : 'Kore');
          audioData = await generateSpeech(text, voice);
      }

      // 3. Update UI and Play Audio Together
      setGameState(prev => {
          let newFriends = prev.friends;
          if (entity.subtype === 'child' && entity.name && !prev.friends.find(f => f.name === entity.name)) {
              newFriends = [...prev.friends, { id: entity.id, name: entity.name, color: entity.color }];
          }
          return {
            ...prev,
            friends: newFriends,
            dialogue: { speaker: entity.name || 'Unknown', text }
          };
      });

      if (audioData) {
          playAudio(audioData);
      }

      targetRef.current = null;
      return;
    }

    if (entity.type === EntityType.DESK && !entity.isOccupied) {
      if (entity.id !== gameState.satAtDeskId) {
          playSfx('furniture');
          playerRef.current = { x: entity.pos.x, y: entity.pos.y + 40 };
          setGameState(prev => ({ ...prev, satAtDeskId: entity.id, dialogue: null, facing: 'up' }));
          facingRef.current = 'up'; 
          targetRef.current = null;
      }
      return;
    } else if (entity.type === EntityType.DESK && entity.isOccupied) {
      playSfx('furniture');
      setGameState(prev => ({ ...prev, dialogue: { speaker: '旁白', text: '这个座位已经有人了。' } }));
      targetRef.current = null;
      return;
    }

    if (entity.type === EntityType.BACKPACK) {
       targetRef.current = null;
       const nextState = !gameState.isBackpackOpen;
       playSfx('backpack');
       setGameState(prev => ({ ...prev, isBackpackOpen: nextState }));
       return;
    }

    if (entity.type === EntityType.BED && entity.name === '我的床') {
        playSfx('furniture');
        handleSleep();
        return;
    }
  };

  const handleSleep = () => {
      targetRef.current = null;
      setGameState(prev => ({ 
          ...prev, 
          isNight: true, // Force night overlay for effect
          dialogue: { speaker: '旁白', text: '你躺在床上，闭上了眼睛...' } 
      }));
      setTimeout(() => {
          startNewDay();
      }, 4000);
  };

  const startNewDay = () => {
      spawnRoommates();
      const text = '快起床！楼梯好挤啊，我们要排队走！';
      setGameState(prev => ({
          ...prev,
          gameTime: 420, // Reset to 7:00 AM
          isNight: false,
          currentLesson: 'Chinese',
          isClassStarted: false,
          isSchoolOver: false,
          schoolOverTime: null,
          isLiningUp: false,
          isMorningWakeUp: true,
          isMorningQueue: true,
          dialogue: { speaker: '芳芳', text: text },
          homeworkStatus: 'none',
          isBackpackOpen: false,
          inventory: [...INITIAL_ITEMS] // Reset inventory or keep? Let's reset for fresh day or keep it? Keeping it feels more RPG. Let's keep it.
      }));
      generateSpeech(text, 'Puck').then(audio => audio && playAudio(audio));
  };

  const consumeItem = (item: Item, index: number) => {
      playSfx('success');
      // Remove item at index
      const newInventory = [...gameState.inventory];
      newInventory.splice(index, 1);
      
      const flavorText = item.category === 'food' ? '真好吃！' : '真解渴！';
      setGameState(prev => ({
          ...prev,
          inventory: newInventory,
          dialogue: { speaker: '旁白', text: `你使用了${item.name}。${flavorText}` }
      }));
  };

  const switchLesson = (lesson: 'Chinese' | 'Math' | 'English' | 'PE') => {
      playSfx('click');
      setGameState(prev => ({ 
          ...prev, 
          currentLesson: lesson, 
          isBackpackOpen: false,
          dialogue: { speaker: '旁白', text: `你拿出了${lesson === 'PE' ? '跳绳' : '课本'}，准备上${TEACHERS[lesson].subject}课。` } 
      }));
  };

  const handleStartClass = () => {
      playSfx('success');
      const teacherInfo = TEACHERS[gameState.currentLesson];
      const teacherId = teacherInfo.id;
      const doorPos = { x: 50, y: 400 };
      const podiumPos = { x: 500, y: 130 }; // Adjusted to stay in front of wall

      // Add teacher if not exists
      let teacher = MAPS['classroom'].entities.find(e => e.id === teacherId);
      if (!teacher) {
          teacher = {
            id: teacherId,
            type: EntityType.NPC,
            subtype: 'adult',
            pos: doorPos, 
            size: 25,
            color: teacherInfo.color,
            name: teacherInfo.name,
            facing: 'right',
            visual: teacherInfo.visual,
            persona: teacherInfo.persona,
            voiceName: teacherInfo.voice
        };
        MAPS['classroom'].entities.push(teacher);
      } else {
        teacher.pos = doorPos; 
      }

      npcStateRef.current.set(teacherId, { target: podiumPos, timer: 0, behavior: 'stay' });

      if (gameState.currentLesson === 'PE') {
           const text = '同学们，大家分成两队！一会去操场集合！';
           setGameState(prev => ({ 
               ...prev, 
               isClassStarted: true,
               dialogue: { speaker: '李老师(体)', text: '...' }
           }));
           generateSpeech(text, 'Fenrir').then(a => {
               if(a) playAudio(a);
               setGameState(prev => ({ ...prev, dialogue: { speaker: '李老师(体)', text } }));
           });
      } else {
           setGameState(prev => ({ ...prev, isClassStarted: true }));
      }
  };

  const handleDismissClass = () => {
     playSfx('click');
     const teacherId = TEACHERS[gameState.currentLesson]?.id;
     if (teacherId) {
         setGameState(prev => ({ ...prev, isTeacherTransitioning: true }));
         const doorPos = { x: 50, y: 400 };
         npcStateRef.current.set(teacherId, { target: doorPos, timer: 0, behavior: 'exit' });
     } else {
         advanceLesson();
     }
  };

  const advanceLesson = () => {
    const LESSON_ORDER: ('Chinese' | 'Math' | 'English' | 'PE')[] = ['Chinese', 'Math', 'English', 'PE'];
    const nextIdx = LESSON_ORDER.indexOf(gameState.currentLesson) + 1;
    let nextLesson = gameState.currentLesson;
    let schoolOver = false;
    
    if (nextIdx < LESSON_ORDER.length) {
        nextLesson = LESSON_ORDER[nextIdx];
    } else {
        schoolOver = true;
    }

    setGameState(prev => ({ 
        ...prev, 
        isClassStarted: false, 
        currentLesson: nextLesson,
        isSchoolOver: schoolOver,
        isLiningUp: false,
        isTeacherTransitioning: false
    }));
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // If blocked by dialogue or night, just process click to maybe dismiss dialog (handled in UI)
    // but here we block movement logic
    if (gameState.dialogue || (gameState.isSchoolOver && gameState.isNight)) return;

    initAudio(); // Ensure audio context is started on user gesture

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const map = mapRef.current;
    const camX = Math.max(0, Math.min(map.width - canvas.width, playerRef.current.x - canvas.width / 2));
    const camY = Math.max(0, Math.min(map.height - canvas.height, playerRef.current.y - canvas.height / 2));

    const clickX = screenX + camX;
    const clickY = screenY + camY;

    const clickedEntity = mapRef.current.entities
      .slice()
      .reverse()
      .find(ent => {
         const dx = clickX - ent.pos.x;
         const dy = clickY - ent.pos.y;
         return Math.sqrt(dx*dx + dy*dy) < (ent.size * 1.5); 
      });

    if (clickedEntity) {
       targetRef.current = { x: clickX, y: clickY };
       interact(clickedEntity);
       setGameState(prev => ({ ...prev, targetPos: { x: clickX, y: clickY }, isMoving: true }));
    } else {
       targetRef.current = { x: clickX, y: clickY };
       setGameState(prev => ({ ...prev, targetPos: { x: clickX, y: clickY }, isMoving: true }));
    }
  };

  // --- GAME LOOP ---
  useEffect(() => {
    const loop = () => {
      // Use ref-based state to access latest values inside the animation loop
      const currentState = gameStateRef.current;
      
      if (targetRef.current) {
        const dx = targetRef.current.x - playerRef.current.x;
        const dy = targetRef.current.y - playerRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > PLAYER_SPEED) {
          const moveX = (dx / dist) * PLAYER_SPEED;
          const moveY = (dy / dist) * PLAYER_SPEED;
          const nextPos = { x: playerRef.current.x + moveX, y: playerRef.current.y + moveY };
          
          if (!checkCollision(nextPos, mapRef.current)) {
            playerRef.current = nextPos;
            setGameState(prev => ({ ...prev, playerPos: nextPos }));
            if (Math.abs(moveX) > Math.abs(moveY)) {
                facingRef.current = moveX > 0 ? 'right' : 'left';
            } else {
                facingRef.current = moveY > 0 ? 'down' : 'up';
            }
            
            // Play Step Sound periodically
            if (walkFrameRef.current - lastStepAudioRef.current > 3) { // approx every 15 frames (~250ms)
                playSfx('step');
                lastStepAudioRef.current = walkFrameRef.current;
            }

          } else {
             targetRef.current = null;
             setGameState(prev => ({ ...prev, isMoving: false }));
          }
        } else {
          playerRef.current = targetRef.current;
          setGameState(prev => ({ ...prev, playerPos: targetRef.current!, isMoving: false }));
          targetRef.current = null;
        }
      }

      walkFrameRef.current += 0.2;

      // PE Check: Classroom "Step into Line" logic
      if (currentState.currentLesson === 'PE' && currentState.isClassStarted && currentState.currentMapId === 'classroom') {
          const gapX = 550;
          const gapY = 560; 
          const dx = playerRef.current.x - gapX;
          const dy = playerRef.current.y - gapY;
          if (Math.sqrt(dx*dx + dy*dy) < 60) {
              mapRef.current = MAPS['playground'];
              playerRef.current = { x: 700, y: 700 }; 
              targetRef.current = null;
              setGameState(prev => ({
                 ...prev,
                 currentMapId: 'playground',
                 playerPos: { x: 700, y: 700 },
                 targetPos: null,
                 dialogue: { speaker: '旁白', text: '你加入了队伍，大家一起整齐地走到了操场。' }
              }));
              playSfx('success');
              return; 
          }
      }

      // NPC Movement Logic
      if (currentState.currentMapId === 'playground' || currentState.currentMapId === 'classroom') {
        const npcs = mapRef.current.entities.filter(e => 
            e.type === EntityType.NPC || e.type === EntityType.DOG || e.type === EntityType.BIRD
        );

        // PE Square Formation Logic
        if (currentState.currentLesson === 'PE' && currentState.isClassStarted && currentState.currentMapId === 'playground') {
             const students = mapRef.current.entities.filter(e => e.id.startsWith('student_'));
             students.forEach((s, i) => {
                 const col = i % 5;
                 const row = Math.floor(i / 5);
                 const sx = 550 + col * 70;
                 const sy = 750 + row * 60;
                 s.pos = { x: sx, y: sy };
                 s.facing = 'up'; 
                 if (LEADERS.includes(s.name || '')) s.pos.y = 700;
             });
             const teacher = mapRef.current.entities.find(e => e.id === 'teacher_pe');
             if (teacher) {
                 teacher.pos = { x: 700, y: 600 };
                 teacher.facing = 'down';
             }
        }

        // PE Classroom Formation Logic
        if (currentState.currentLesson === 'PE' && currentState.isClassStarted && currentState.currentMapId === 'classroom') {
            const students = mapRef.current.entities.filter(e => e.id.startsWith('student_'));
            students.forEach((s, i) => {
                if (i >= 18) { s.pos = {x: 0, y: 0}; return; }
                if (i % 2 === 0) {
                    s.pos = { x: 450, y: 200 + i * 20 };
                    s.facing = 'right';
                } else {
                    s.pos = { x: 550, y: 200 + (i-1) * 20 };
                    s.facing = 'left';
                }
            });
        }

        npcs.forEach(npc => {
            if ((currentState.isClassStarted && npc.subtype === 'child')) return;

            let state = npcStateRef.current.get(npc.id) || { target: null, timer: Math.random() * 100, behavior: 'stay' };
            
            if (currentState.isSchoolOver && npc.subtype === 'child' && state.behavior === 'stay') {
                 if (Math.random() < 0.005) {
                     state.behavior = 'exit';
                 }
            }
            if (state.behavior === 'exit' && currentState.currentMapId === 'playground') {
                state.target = { x: 700, y: 1200 };
            }

            if (!state.target && state.timer <= 0 && currentState.currentMapId === 'playground' && !currentState.isNight) {
                 const rX = Math.random() * mapRef.current.width;
                 const rY = Math.random() * mapRef.current.height;
                 if (rX > 50 && rX < 1350 && rY > 50 && rY < 1150 && !checkCollision({x: rX, y:rY}, mapRef.current)) {
                     state.target = { x: rX, y: rY };
                 }
                 state.timer = 100 + Math.random() * 200;
            } else if (state.timer > 0) {
                state.timer--;
            }

            if (state.target) {
                const speed = npc.type === EntityType.DOG ? ANIMAL_SPEED : NPC_SPEED;
                const dx = state.target.x - npc.pos.x;
                const dy = state.target.y - npc.pos.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist > speed) {
                    npc.pos.x += (dx/dist) * speed;
                    npc.pos.y += (dy/dist) * speed;
                    npc.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
                } else {
                    npc.pos = state.target;
                    state.target = null;
                    
                    if (state.behavior === 'stay' && npc.id.startsWith('teacher_')) {
                        npc.facing = 'down'; // Face class when arriving at podium
                        
                        // Automatic Lecture Trigger
                        if (currentState.isClassStarted && !currentState.dialogue) {
                             interact(npc);
                        }
                    }

                    if (state.behavior === 'exit') {
                        if (currentState.currentMapId === 'playground') {
                            mapRef.current.entities = mapRef.current.entities.filter(e => e.id !== npc.id);
                        } else if (currentState.isTeacherTransitioning && npc.id.startsWith('teacher_')) {
                             mapRef.current.entities = mapRef.current.entities.filter(e => e.id !== npc.id);
                             setTimeout(() => advanceLesson(), 0);
                        }
                    }
                }
            }
            npcStateRef.current.set(npc.id, state);
        });
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };
    
    // Start game loop
    animationFrameRef.current = requestAnimationFrame(loop);
    
    // Cleanup game loop
    return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []); // Run once on mount! Dependencies are handled via refs.

  const drawWall = (ctx: CanvasRenderingContext2D, wall: {x:number, y:number, w:number, h:number}, mapId: string) => {
      ctx.fillStyle = mapId === 'classroom' ? '#D1D5DB' : '#6B7280';
      ctx.beginPath();
      ctx.rect(wall.x, wall.y, wall.w, wall.h);
      ctx.fill();
      // Brick Texture
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 1;
      for(let y=wall.y; y<wall.y+wall.h; y+=10) {
          ctx.beginPath(); ctx.moveTo(wall.x, y); ctx.lineTo(wall.x+wall.w, y); ctx.stroke();
      }
      ctx.strokeStyle = '#1F2937';
      ctx.lineWidth = 3;
      ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
  };
  
  const drawSprite = (ctx: CanvasRenderingContext2D, entity: Entity, isPlayer: boolean = false) => {
    const { x, y } = entity.pos;
    const { size, color, facing } = entity;
    const isMoving = isPlayer ? gameStateRef.current.isMoving : (entity.aiState === 'moving' || npcStateRef.current.get(entity.id)?.target);
    const bounce = isMoving ? Math.sin(walkFrameRef.current) * 3 : 0;
    
    ctx.save();
    ctx.translate(x, y + bounce);

    // Style Settings for Hand-Drawn Stick Figure Look
    const strokeColor = '#000';
    const lineWidth = 3;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const currentSt = gameStateRef.current;
    const isDoingGymnastics = currentSt.currentLesson === 'PE' && currentSt.isClassStarted && currentSt.currentMapId === 'playground';
    const isInFormation = x > 200 && x < 1200 && y > 600 && y < 900;
    const shouldAnimateGym = isDoingGymnastics && (isInFormation || !isPlayer);
    let drawColor = color;
    if (shouldAnimateGym) drawColor = '#3B82F6'; // Tracksuit blue

    const legSwing = isMoving ? Math.sin(walkFrameRef.current * 2) * 5 : 0;
    
    // --- LEGS ---
    ctx.beginPath();
    // Left Leg
    ctx.moveTo(-size/4, size/2);
    ctx.lineTo(-size/4, size + legSwing);
    // Right Leg
    ctx.moveTo(size/4, size/2);
    ctx.lineTo(size/4, size - legSwing);
    ctx.stroke();

    // --- ARMS ---
    const armSwing = isMoving ? Math.cos(walkFrameRef.current * 2) * 5 : 0;
    if (shouldAnimateGym) {
        // Gymnastics Arms
        const gymPhase = Math.sin(Date.now() / 200);
        const armAngle = gymPhase > 0 ? Math.PI/4 : -Math.PI/1.5;
        ctx.beginPath(); 
        ctx.moveTo(-size/2, -size/4); 
        ctx.lineTo(-size/2 - Math.cos(armAngle)*15, -size/4 - Math.sin(armAngle)*15); 
        ctx.stroke();
        ctx.beginPath(); 
        ctx.moveTo(size/2, -size/4); 
        ctx.lineTo(size/2 + Math.cos(armAngle)*15, -size/4 - Math.sin(armAngle)*15); 
        ctx.stroke();
    } else {
        // Normal Arms
        ctx.beginPath();
        // Left Arm
        ctx.moveTo(-size/2, -size/4);
        ctx.lineTo(-size/1.5 - armSwing, size/3);
        // Right Arm
        ctx.moveTo(size/2, -size/4);
        ctx.lineTo(size/1.5 + armSwing, size/3);
        ctx.stroke();
    }

    // --- BODY & CLOTHING ---
    ctx.fillStyle = drawColor;
    ctx.beginPath();
    if (entity.visual?.outfit === 'skirt' || (isPlayer && !shouldAnimateGym)) {
        // Skirt (Trapezoid)
        ctx.moveTo(0, -size/2); // Neck
        ctx.lineTo(-size/2, size/2); // Bottom Left
        ctx.lineTo(size/2, size/2); // Bottom Right
        ctx.closePath();
    } else {
        // Shirt/Pants (Rectangle-ish)
        ctx.roundRect(-size/2, -size/2, size, size, 5);
    }
    ctx.fill();
    ctx.stroke();

    // Specific Player Details (Purple Pajamas / Purple Skirt)
    if (isPlayer && !shouldAnimateGym) {
        ctx.fillStyle = '#D8B4FE'; // Light purple top
        ctx.beginPath(); ctx.moveTo(0, -size/2); ctx.lineTo(-size/2, size/4); ctx.lineTo(size/2, size/4); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#7E22CE'; // Dark purple skirt
        ctx.beginPath(); ctx.moveTo(-size/2, size/4); ctx.lineTo(-size/1.5, size/1.2); ctx.lineTo(size/1.5, size/1.2); ctx.lineTo(size/2, size/4); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    
    // Chinese Teacher Apron
    if (entity.visual?.outfit === 'apron') {
        ctx.fillStyle = '#FFF';
        ctx.fillRect(-size/3, -size/3, size/1.5, size/1.2);
        ctx.strokeRect(-size/3, -size/3, size/1.5, size/1.2);
    }

    // --- HEAD ---
    ctx.fillStyle = '#FFE4C4'; // Skin tone
    ctx.beginPath();
    ctx.arc(0, -size/1.2, size/1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // --- FACE ---
    if (facing !== 'up') {
        ctx.fillStyle = '#000';
        // Eyes
        const eyeXOffset = facing === 'right' ? 4 : (facing === 'left' ? -4 : 0);
        ctx.beginPath(); ctx.arc(eyeXOffset - 3, -size/1.2 - 2, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(eyeXOffset + 3, -size/1.2 - 2, 2, 0, Math.PI*2); ctx.fill();
        // Smile
        ctx.beginPath();
        ctx.arc(eyeXOffset, -size/1.2 + 2, 4, 0.2, Math.PI - 0.2);
        ctx.stroke();
    }

    // --- HAIR ---
    ctx.fillStyle = (entity.visual?.hair === 'curly_brown') ? '#8B4513' : '#000';
    if (isPlayer) {
        // Braids
        const braidSwing = isMoving ? Math.sin(walkFrameRef.current)*3 : 0;
        ctx.beginPath(); 
        ctx.moveTo(-size/1.8, -size/1.2); ctx.quadraticCurveTo(-size - braidSwing, 0, -size/2 - braidSwing, size/2);
        ctx.moveTo(size/1.8, -size/1.2); ctx.quadraticCurveTo(size + braidSwing, 0, size/2 + braidSwing, size/2);
        ctx.stroke();
        // Bangs
        ctx.beginPath(); ctx.arc(0, -size/1.2, size/1.8, Math.PI, 0); ctx.fill(); ctx.stroke();
    } else if (entity.visual?.hair === 'curly_brown') {
        // Curly Hair Cloud
        ctx.beginPath();
        ctx.arc(0, -size*1.1, size/1.5, Math.PI, 0); // Top
        ctx.arc(-size/1.5, -size, size/3, 0, Math.PI*2); // Left
        ctx.arc(size/1.5, -size, size/3, 0, Math.PI*2); // Right
        ctx.fill();
    } else if (entity.visual?.hair === 'long_black') {
        ctx.beginPath();
        ctx.moveTo(-size/1.8, -size/1.2); ctx.lineTo(-size/1.2, size/2); ctx.lineTo(size/1.2, size/2); ctx.lineTo(size/1.8, -size/1.2);
        ctx.fill();
        ctx.beginPath(); ctx.arc(0, -size/1.2, size/1.8, Math.PI, 0); ctx.fill(); ctx.stroke();
    } else if (entity.visual?.hair === 'short_black' || entity.visual?.hair === 'short_black_male') {
         ctx.beginPath();
         ctx.arc(0, -size/1.2, size/1.6, Math.PI, 0);
         ctx.fill();
    } else {
        // Generic Hair
        ctx.beginPath(); ctx.arc(0, -size/1.2, size/1.8, Math.PI, 0); ctx.fill(); ctx.stroke();
    }

    ctx.restore();
  };

  const drawBuilding = (ctx: CanvasRenderingContext2D, entity: Entity) => {
    const { x, y } = entity.pos;
    ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(0,0,0,0.3)';
    
    // Main Body
    ctx.fillStyle = '#F3F4F6';
    ctx.beginPath(); ctx.rect(x - 300, y - 100, 600, 100); ctx.fill(); 
    ctx.lineWidth = 2; ctx.strokeStyle = '#9CA3AF'; ctx.stroke();

    // Bricks
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    for(let i=0; i<6; i++) {
        ctx.beginPath(); ctx.moveTo(x-300, y-100 + i*20); ctx.lineTo(x+300, y-100+i*20); ctx.stroke();
    }

    // Roof
    const roofGrad = ctx.createLinearGradient(x, y-180, x, y-100);
    roofGrad.addColorStop(0, '#EF4444'); roofGrad.addColorStop(1, '#B91C1C');
    ctx.fillStyle = roofGrad;
    ctx.beginPath(); ctx.moveTo(x - 320, y - 100); ctx.lineTo(x + 320, y - 100); ctx.lineTo(x, y - 180); ctx.fill();
    
    // Roof Tiles
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    for(let i=0; i<10; i++) {
        ctx.beginPath(); ctx.moveTo(x-320 + i*64, y-100); ctx.lineTo(x, y-180); ctx.stroke();
    }

    // Door
    ctx.fillStyle = '#4B5563';
    ctx.beginPath(); ctx.rect(x - 40, y - 20, 80, 120); ctx.fill();
    ctx.fillStyle = '#1F2937'; ctx.fillRect(x - 35, y - 15, 70, 110); // Inner frame
    
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('阳光小学', x, y - 40);
  };

  const drawStore = (ctx: CanvasRenderingContext2D, entity: Entity) => {
    const { x, y } = entity.pos;
    ctx.shadowBlur = 5; ctx.shadowColor = 'rgba(0,0,0,0.2)';

    ctx.fillStyle = '#FFF7ED';
    ctx.beginPath(); ctx.rect(x - 75, y - 80, 150, 80); ctx.fill(); ctx.stroke();
    
    // Awning
    ctx.shadowBlur = 2;
    for(let i=0; i<8; i++) {
        ctx.fillStyle = i%2===0 ? '#EF4444' : '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(x - 75 + i*18.75, y - 100, 18.75, 20, 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('小卖部', x, y - 40);
  };

  const drawDormitory = (ctx: CanvasRenderingContext2D, entity: Entity) => {
    const { x, y } = entity.pos;
    ctx.shadowBlur = 5; ctx.shadowColor = 'rgba(0,0,0,0.2)';
    
    ctx.fillStyle = '#DBEAFE';
    ctx.beginPath(); ctx.rect(x - 100, y - 50, 200, 100); ctx.fill(); ctx.stroke();
    
    ctx.fillStyle = '#3B82F6';
    ctx.beginPath(); ctx.moveTo(x - 110, y - 50); ctx.lineTo(x + 110, y - 50); ctx.lineTo(x, y - 100); ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('学生宿舍', x, y - 10);
  };

  const drawFurniture = (ctx: CanvasRenderingContext2D, entity: Entity) => {
    const { x, y } = entity.pos;
    const { size, color } = entity;
    
    ctx.shadowBlur = 3; ctx.shadowColor = 'rgba(0,0,0,0.2)';

    if (entity.type === EntityType.BACKPACK) {
        ctx.translate(x, y);
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.roundRect(-size/1.2, -size/1.5, size*1.6, size*1.4, 8); ctx.fill();
        // Flap
        ctx.fillStyle = '#BE185D'; 
        ctx.beginPath(); ctx.roundRect(-size/1.2, -size/1.5, size*1.6, size*0.8, 5); ctx.fill();
        // Straps
        ctx.strokeStyle = '#9D174D'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-size/3, -size/1.5); ctx.lineTo(-size/3, size/2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(size/3, -size/1.5); ctx.lineTo(size/3, size/2); ctx.stroke();
        ctx.translate(-x, -y);
        ctx.shadowBlur = 0;
        return;
    }

    if (entity.type === EntityType.DESK || entity.type === EntityType.TABLE) {
        ctx.fillStyle = '#78350F'; // Dark Wood
        if (entity.type === EntityType.TABLE) ctx.fillStyle = color;
        
        const w = entity.type === EntityType.DESK ? size*2 : size;
        const h = entity.type === EntityType.DESK ? size : size/1.5;
        
        ctx.beginPath(); ctx.roundRect(x - w/2, y - h/2, w, h, 2); ctx.fill();
        
        // Wood Grain
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x-w/2, y); ctx.lineTo(x+w/2, y); ctx.stroke();
        
        ctx.shadowBlur = 0;
        return;
    }

    if (entity.type === EntityType.BED) {
        // Bed Frame
        ctx.fillStyle = '#92400E';
        ctx.fillRect(x - size/2, y - size, size, size*2);
        // Mattress
        ctx.fillStyle = color;
        ctx.fillRect(x - size/2 + 2, y - size + 2, size - 4, size*2 - 4);
        // Pillow
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.roundRect(x - size/2 + 5, y - size + 5, size - 10, 20, 5); ctx.fill();
        // Ladder
        ctx.fillStyle = '#B45309';
        ctx.fillRect(x + size/2 - 10, y - size, 10, size*2);
        for(let i=0; i<5; i++) {
             ctx.fillStyle = 'rgba(0,0,0,0.2)';
             ctx.fillRect(x + size/2 - 10, y - size + i*30 + 20, 10, 2);
        }
        ctx.shadowBlur = 0;
        return;
    }

    if (entity.type === EntityType.BLACKBOARD) {
        const w = size;
        const h = size / 2.5;
        ctx.fillStyle = color;
        ctx.fillRect(x - w/2, y - h/2, w, h);
        
        ctx.strokeStyle = '#4B5563'; // Frame
        ctx.lineWidth = 5;
        ctx.strokeRect(x - w/2, y - h/2, w, h);
        
        ctx.shadowBlur = 0;
        return;
    }
    
    // Generic fallback for others
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.rect(x - size/2, y - size/2, size, size); ctx.fill();
    ctx.shadowBlur = 0;
  };

  const drawPortalHole = (ctx: CanvasRenderingContext2D, entity: Entity) => {
      const { x, y } = entity.pos;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 0.5); 
      // Gradient Hole
      const grad = ctx.createRadialGradient(0,0,0, 0,0,entity.size/2);
      grad.addColorStop(0, '#450A0A');
      grad.addColorStop(1, '#EF4444');
      ctx.fillStyle = grad; 
      ctx.beginPath(); ctx.arc(0, 0, entity.size/2, 0, Math.PI*2); ctx.fill();
      ctx.restore();
  };

  const drawDoor = (ctx: CanvasRenderingContext2D, entity: Entity) => {
      const { pos: { x, y }, size, color, name } = entity;
      ctx.shadowBlur = 3; ctx.shadowColor = 'rgba(0,0,0,0.2)';
      
      // Frame
      ctx.fillStyle = '#374151';
      ctx.fillRect(x - size/2 - 5, y - size, size + 10, size);
      
      // Door Leaf
      ctx.fillStyle = color;
      ctx.fillRect(x - size/2, y - size + 5, size, size - 5);
      
      // Knob
      ctx.fillStyle = '#FCD34D';
      ctx.beginPath(); ctx.arc(x + size/3, y - size/2, 3, 0, Math.PI*2); ctx.fill();

      // Label
      if (name) {
          ctx.fillStyle = '#1F2937';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(name, x, y - size - 10);
      }
      ctx.shadowBlur = 0;
  };

  const drawAnimal = (ctx: CanvasRenderingContext2D, entity: Entity) => {
      const { x, y } = entity.pos;
      const t = Date.now() / 200;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.shadowBlur = 2; ctx.shadowColor = 'rgba(0,0,0,0.2)';
      
      if (entity.type === EntityType.DOG) {
          ctx.fillStyle = entity.color;
          // Body
          ctx.beginPath(); ctx.roundRect(-12, -6, 24, 12, 4); ctx.fill();
          // Head
          ctx.beginPath(); ctx.arc(-12, -10, 8, 0, Math.PI*2); ctx.fill();
          // Tail
          ctx.strokeStyle = entity.color; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(12, -6); ctx.lineTo(12 + Math.sin(t)*5, -12); ctx.stroke();
      } else if (entity.type === EntityType.CAT) {
          ctx.fillStyle = entity.color;
          ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
          // Ears
          ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(-6, -12); ctx.lineTo(0, -8); ctx.fill();
          ctx.beginPath(); ctx.moveTo(3, -6); ctx.lineTo(6, -12); ctx.lineTo(0, -8); ctx.fill();
      } else {
          // Bird
          ctx.fillStyle = entity.color;
          const jump = Math.abs(Math.sin(t*2)) * 5;
          ctx.translate(0, -jump);
          ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#FCD34D'; // Beak
          ctx.beginPath(); ctx.moveTo(4, -2); ctx.lineTo(8, 0); ctx.lineTo(4, 2); ctx.fill();
      }
      ctx.restore();
  };

  const drawPool = (ctx: CanvasRenderingContext2D, entity: Entity) => {
      const { x, y } = entity.pos; 
      const s = entity.size;
      ctx.save();
      ctx.translate(entity.pos.x, entity.pos.y);
      // Water
      ctx.fillStyle = '#60A5FA'; 
      ctx.beginPath(); ctx.roundRect(-s, -s/2, s*2, s, 10); ctx.fill();
      
      // Waves
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      const t = Date.now() / 1000;
      for(let i=0; i<3; i++) {
          const waveY = Math.sin(t + i)*20;
          ctx.beginPath(); 
          ctx.moveTo(-s + 20, -s/4 + i*30 + waveY/2); 
          ctx.quadraticCurveTo(0, -s/4 + i*30 - 20 + waveY, s - 20, -s/4 + i*30 + waveY/2); 
          ctx.stroke();
      }

      ctx.strokeStyle = '#1E40AF';
      ctx.lineWidth = 4;
      ctx.strokeRect(-s, -s/2, s*2, s);
      ctx.restore();
  };

  // --- RENDER LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const render = () => {
      const currentSt = gameStateRef.current;
      const map = mapRef.current;
      
      const camX = Math.max(0, Math.min(map.width - canvas.width, playerRef.current.x - canvas.width / 2));
      const camY = Math.max(0, Math.min(map.height - canvas.height, playerRef.current.y - canvas.height / 2));
      
      ctx.setTransform(1, 0, 0, 1, -camX, -camY);

      // Background
      ctx.fillStyle = map.backgroundColor;
      ctx.fillRect(0, 0, map.width, map.height);

      // Map Patterns
      if (currentSt.currentMapId === 'playground') {
          // Grass Noise
          ctx.fillStyle = '#4D7C0F';
          for(let i=0; i<100; i++) {
              const rx = (i * 1234) % map.width;
              const ry = (i * 5678) % map.height;
              ctx.fillRect(rx, ry, 3, 3);
          }
          // Basketball Court
          ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4;
          ctx.strokeRect(200, 600, 1000, 500); 
          ctx.beginPath(); ctx.moveTo(700, 600); ctx.lineTo(700, 1100); ctx.stroke(); 
          ctx.beginPath(); ctx.arc(700, 850, 80, 0, Math.PI*2); ctx.stroke(); 
      } else if (currentSt.currentMapId === 'classroom' || currentSt.currentMapId === 'dorm_room') {
          // Wood Floor
          ctx.strokeStyle = 'rgba(0,0,0,0.05)';
          ctx.lineWidth = 2;
          for(let y=0; y<map.height; y+=30) {
              ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(map.width, y); ctx.stroke();
          }
      } else if (currentSt.currentMapId === 'store_interior') {
          // Tile Floor
          ctx.fillStyle = 'rgba(0,0,0,0.03)';
          for(let x=0; x<map.width; x+=40) {
              for(let y=0; y<map.height; y+=40) {
                  if ((x+y)%80 === 0) ctx.fillRect(x,y,40,40);
              }
          }
      }

      map.walls.forEach(w => drawWall(ctx, w, currentSt.currentMapId));

      const sortedEntities = [...map.entities].sort((a, b) => a.pos.y - b.pos.y);
      
      let playerDrawn = false;
      sortedEntities.forEach(entity => {
          if (!playerDrawn && playerRef.current.y < entity.pos.y) {
              drawSprite(ctx, { 
                  id: 'player', type: EntityType.PLAYER, pos: playerRef.current, size: 20, color: '#8B5CF6', facing: facingRef.current 
              }, true);
              playerDrawn = true;
          }

          if (entity.type === EntityType.BUILDING) drawBuilding(ctx, entity);
          else if (entity.type === EntityType.STORE) drawStore(ctx, entity);
          else if (entity.type === EntityType.DORMITORY) drawDormitory(ctx, entity);
          else if (entity.type === EntityType.SWIMMING_POOL) drawPool(ctx, entity);
          else if (['BED','TABLE','CHAIR','SHELF','FRIDGE','DESK','BACKPACK','WINDOW','POSTER','PLANT', 'BLACKBOARD'].includes(entity.type)) drawFurniture(ctx, entity);
          else if (['DOG','CAT','BIRD'].includes(entity.type)) drawAnimal(ctx, entity);
          else if (entity.id === 'portal_hallway') drawPortalHole(ctx, entity);
          else if (entity.id === 'door_my_dorm' || (entity.id === 'portal_playground' && currentSt.currentMapId === 'dorm_hallway')) drawDoor(ctx, entity); 
          else if (entity.type === EntityType.PORTAL) {  }
          else if (entity.type === EntityType.HOOP) {
               ctx.fillStyle = '#EEE'; ctx.fillRect(entity.pos.x, entity.pos.y - 100, 10, 100); 
               ctx.strokeStyle = '#F00'; ctx.lineWidth = 2; ctx.strokeRect(entity.pos.x - 20, entity.pos.y - 120, 40, 30); 
               ctx.beginPath(); ctx.arc(entity.pos.x, entity.pos.y - 100, 15, 0, Math.PI); ctx.stroke(); 
          }
          else drawSprite(ctx, entity);
      });

      if (!playerDrawn) {
          drawSprite(ctx, { 
              id: 'player', type: EntityType.PLAYER, pos: playerRef.current, size: 20, color: '#8B5CF6', facing: facingRef.current 
              }, true);
      }

      if (currentSt.isNight) {
          ctx.setTransform(1, 0, 0, 1, 0, 0); 
          ctx.fillStyle = 'rgba(10, 15, 30, 0.7)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      requestRef.current = requestAnimationFrame(render);
    };
    
    requestRef.current = requestAnimationFrame(render);
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Construct Date object for GameClock
  const timeDate = new Date();
  timeDate.setHours(Math.floor(gameState.gameTime / 60));
  timeDate.setMinutes(gameState.gameTime % 60);

  return (
    <div className="w-full h-screen bg-gray-900 relative">
      <canvas ref={canvasRef} onClick={handleCanvasClick} className="block cursor-pointer" />
      
      <GameClock time={timeDate} phase={gameState.isNight ? 'Night' : gameState.isSchoolOver ? 'School Over' : 'School Day'} />
      
      {/* UI Overlay */}
      <div className="absolute top-4 left-32 bg-white/90 p-2 rounded shadow border border-slate-700">
         <div className="text-sm font-bold text-red-600">{TEACHERS[gameState.currentLesson]?.subject || '课间'}</div>
         {gameState.isClassStarted && <div className="text-xs text-green-600">正在上课</div>}
         {gameState.isSchoolOver && <div className="text-xs text-red-600">放学了</div>}
      </div>

      {gameState.isClassStarted && !gameState.isTeacherTransitioning && (
          <button 
             onClick={(e) => { e.stopPropagation(); handleDismissClass(); }}
             className="absolute bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow hover:bg-red-600 font-bold"
          >
             下课
          </button>
      )}

      {/* Backpack Modal */}
      {gameState.isBackpackOpen && (
          <div className="absolute top-20 right-4 bg-white p-4 rounded shadow-lg border border-pink-300 w-56 max-h-[400px] overflow-y-auto">
              <h3 className="font-bold text-pink-600 mb-2 border-b flex justify-between">
                  我的书包
                  <button onClick={() => setGameState(prev => ({...prev, isBackpackOpen: false}))} className="text-gray-500">x</button>
              </h3>
              
              <div className="space-y-4">
                  <div>
                      <h4 className="text-xs font-bold text-gray-500 mb-1">学习 & 运动</h4>
                      <div className="space-y-1">
                        {gameState.inventory.filter(i => ['study', 'sport'].includes(i.category)).map((item, idx) => (
                            <div key={idx} 
                                onClick={() => {
                                    if(item.id === 'jump_rope') switchLesson('PE');
                                    else if(item.id === 'book_chinese') switchLesson('Chinese');
                                    else if(item.id === 'book_math') switchLesson('Math');
                                    else if(item.id === 'book_english') switchLesson('English');
                                }}
                                className="p-2 bg-indigo-50 rounded text-sm cursor-pointer hover:bg-indigo-100 flex items-center gap-2"
                            >
                                <span>{item.icon}</span> {item.name}
                            </div>
                        ))}
                      </div>
                  </div>

                  <div>
                      <h4 className="text-xs font-bold text-gray-500 mb-1">零食 & 饮料</h4>
                      <div className="space-y-1">
                        {gameState.inventory.filter(i => ['food', 'drink'].includes(i.category)).length === 0 && <div className="text-xs text-gray-400 italic">空空如也</div>}
                        {gameState.inventory.map((item, idx) => {
                            if (!['food', 'drink'].includes(item.category)) return null;
                            return (
                                <div key={idx} 
                                    onClick={() => consumeItem(item, idx)}
                                    className="p-2 bg-green-50 rounded text-sm cursor-pointer hover:bg-green-100 flex items-center gap-2"
                                >
                                    <span>{item.icon}</span> {item.name}
                                    <span className="text-[10px] text-gray-400 ml-auto">食用</span>
                                </div>
                            );
                        })}
                      </div>
                  </div>

                  {gameState.currentMapId === 'dorm_room' && (
                      <div 
                         onClick={() => {
                             setGameState(prev => ({ ...prev, isBackpackOpen: false, dialogue: { speaker: '旁白', text: '开始写作业...' } }));
                             playerRef.current = { x: 400, y: 380 };
                             facingRef.current = 'up';
                             playSfx('success');
                         }}
                         className="p-2 bg-purple-100 rounded text-sm cursor-pointer hover:bg-purple-200 font-bold border-t mt-2 text-center"
                      >
                          ✏️ 写作业
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Interaction Buttons */}
      <div className="absolute bottom-4 left-4 flex gap-2">
           {!gameState.isClassStarted && gameState.satAtDeskId && !gameState.isSchoolOver && (
               <button 
                 onClick={(e) => { e.stopPropagation(); handleStartClass(); }}
                 className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 animate-bounce"
               >
                   上课
               </button>
           )}
           <div className="bg-white/80 p-2 rounded text-xs">
               找朋友: {gameState.friends.map(f => f.name).join(', ') || '暂无'}
           </div>
      </div>

      {/* Dialogue Box */}
      {gameState.dialogue && (
          <div 
            onClick={(e) => {
                e.stopPropagation();
                playSfx('click');
                setGameState(prev => ({ ...prev, dialogue: null }));
            }}
            className="absolute bottom-16 left-1/2 -translate-x-1/2 w-3/4 max-w-lg bg-white/95 border-2 border-slate-800 p-4 rounded-lg shadow-xl animate-fade-in-up cursor-pointer hover:bg-white"
          >
              <div className="font-bold text-indigo-700 text-sm mb-1">{gameState.dialogue.speaker}</div>
              <div className="text-slate-800 leading-relaxed">{gameState.dialogue.text}</div>
              <div className="text-[10px] text-gray-400 mt-2 text-right">点击对话框继续</div>
          </div>
      )}
    </div>
  );
}
