
import React, { useRef, useEffect, useState } from 'react';
import { GameState, MapData, Entity, EntityType, Point, Friend, Quiz } from './types';
import { generateDialogue, generateSpeech } from './services/geminiService';

// --- CONSTANTS ---
const PLAYER_SPEED = 3.5;
const NPC_SPEED = 1.5;
const ANIMAL_SPEED = 2.0;
const CURFEW_TIMEOUT_MS = 20000; 

const TEACHERS: Record<string, any> = {
  'Chinese': { 
      id: 'teacher_chinese', 
      name: '王老师', 
      color: '#FFFFFF', 
      subject: '语文',
      voice: 'Aoede', // High pitch female
      persona: '温柔知性，喜欢引用古诗词',
      visual: { hair: 'curly_brown', outfit: 'apron' }
  },
  'Math': { 
      id: 'teacher_math', 
      name: '李老师', 
      color: '#2563EB', 
      subject: '数学',
      voice: 'Kore', // Standard female
      persona: '严谨认真，注重逻辑',
      visual: { hair: 'long_black', outfit: 'normal' }
  },
  'English': { 
      id: 'teacher_english', 
      name: '张老师', 
      color: '#000000', 
      subject: '英语',
      voice: 'Zephyr', // Soft female
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
    '爱睡觉'
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
      { id: 'portal_playground', type: EntityType.PORTAL, pos: { x: 30, y: 200 }, size: 40, color: '#9CA3AF', targetMap: 'playground', targetPos: { x: 200, y: 550 } },
      { id: 'door_my_dorm', type: EntityType.PORTAL, pos: { x: 500, y: 50 }, size: 50, color: '#4B2A10', targetMap: 'dorm_room', targetPos: { x: 400, y: 500 } },
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
       const trait = STUDENT_TRAITS[i % STUDENT_TRAITS.length]; 
       // Assign 'Puck' or 'Aoede' (High pitch) for children voices
       const voice = i % 2 === 0 ? 'Puck' : 'Aoede'; 
       
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
        const trait = STUDENT_TRAITS[(i + 5) % STUDENT_TRAITS.length]; 
        const voice = i % 2 === 0 ? 'Aoede' : 'Puck';

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
  });
  
  const playerRef = useRef(gameState.playerPos);
  const targetRef = useRef<Point | null>(null);
  const mapRef = useRef(MAPS['playground']);
  const walkFrameRef = useRef(0);
  const animationFrameRef = useRef<number>(0);
  const facingRef = useRef<'left' | 'right' | 'up' | 'down'>('right');
  const npcStateRef = useRef<Map<string, { target: Point | null, timer: number, behavior?: 'exit' | 'stay' }>>(new Map());

  const playAudio = async (base64Audio: string) => {
      try {
          if (!audioContextRef.current) {
               audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          const ctx = audioContextRef.current;
          if (ctx.state === 'suspended') await ctx.resume();

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
  
  useEffect(() => {
    if (gameState.currentMapId === 'classroom' && !gameState.isTeacherTransitioning && !gameState.isSchoolOver) {
        const teacherInfo = TEACHERS[gameState.currentLesson];
        const existingTeacherIndex = mapRef.current.entities.findIndex(e => e.id.startsWith('teacher_'));
        
        const teacherEntity: Entity = {
            id: teacherInfo.id,
            type: EntityType.NPC,
            subtype: 'adult',
            pos: { x: 500, y: 100 }, 
            size: 25,
            color: teacherInfo.color,
            name: teacherInfo.name,
            facing: 'down',
            visual: teacherInfo.visual,
            persona: teacherInfo.persona,
            voiceName: teacherInfo.voice
        };

        if (existingTeacherIndex !== -1) {
            mapRef.current.entities[existingTeacherIndex] = teacherEntity;
        } else {
            mapRef.current.entities.push(teacherEntity);
        }

        // PE Class: Classroom Formation - Two Tight Lines
        if (gameState.currentLesson === 'PE' && gameState.isClassStarted) {
            const students = mapRef.current.entities.filter(e => e.id.startsWith('student_'));
            // Remove one student to make space for player
            const visibleStudents = students.slice(0, 18); 
            // Hide the 19th student or just don't render them effectively
            students.forEach((s, i) => {
                if (i >= 18) { s.pos = {x: 0, y: 0}; return; } // Hide extra
                // Left Line (x: 450), Right Line (x: 550) - Tight gap
                if (i % 2 === 0) {
                    s.pos = { x: 450, y: 200 + i * 20 };
                    s.facing = 'right';
                } else {
                    s.pos = { x: 550, y: 200 + (i-1) * 20 };
                    s.facing = 'left';
                }
            });
        }
    }
  }, [gameState.currentLesson, gameState.currentMapId, gameState.isTeacherTransitioning, gameState.isSchoolOver, gameState.isClassStarted]);

  useEffect(() => {
      let interval: any;
      if (gameState.isMorningQueue) {
          interval = setInterval(() => {
              const roommates = MAPS['dorm_room'].entities.filter(e => e.id.startsWith('roommate_'));
              if (roommates.length > 0) {
                  const toRemove = roommates[0];
                  MAPS['dorm_room'].entities = MAPS['dorm_room'].entities.filter(e => e.id !== toRemove.id);
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
    if (entity.type === EntityType.PORTAL && entity.targetMap && entity.targetPos) {
      if (gameState.isMorningQueue && entity.targetMap === 'dorm_hallway') {
           setGameState(prev => ({ ...prev, dialogue: { speaker: '旁白', text: '楼梯太挤了，大家都在排队，等一会再出去吧。' } }));
           targetRef.current = null;
           return;
      }

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
    
    if (entity.type === EntityType.SWIMMING_POOL) {
        targetRef.current = null;
        setGameState(prev => ({
            ...prev,
            dialogue: { speaker: '旁白', text: '泳池的水很清凉，在这里游泳真是一种放松。' }
        }));
        return;
    }

    if (entity.type === EntityType.SHELF) {
        targetRef.current = null;
        setGameState(prev => ({
            ...prev,
            dialogue: { speaker: '旁白', text: '你拿了一包零食放进书包。' }
        }));
        return;
    }

    if (entity.type === EntityType.FRIDGE) {
        targetRef.current = null;
        setGameState(prev => ({
            ...prev,
            dialogue: { speaker: '旁白', text: '你拿了一瓶饮料放进书包。' }
        }));
        return;
    }

    if (['NPC', 'DOG', 'CAT', 'BIRD'].includes(entity.type)) {
      if (entity.behavior === 'sleep') {
          setGameState(prev => ({ ...prev, dialogue: { speaker: '旁白', text: '她正在睡觉，不要打扰她。' } }));
          return;
      }
      
      // Face the player
      if (Math.abs(entity.pos.x - playerRef.current.x) > Math.abs(entity.pos.y - playerRef.current.y)) {
         facingRef.current = entity.pos.x > playerRef.current.x ? 'right' : 'left';
      } else {
         facingRef.current = entity.pos.y > playerRef.current.y ? 'down' : 'up';
      }

      setGameState(prev => ({ ...prev, dialogue: { speaker: entity.name || 'Unknown', text: '...' } }));
      
      // Logic for Teachers Lecturing
      let isLecture = false;
      let subject = '';
      if (entity.id.startsWith('teacher_') && gameState.isClassStarted) {
          isLecture = true;
          subject = TEACHERS[gameState.currentLesson]?.subject || '';
      }

      const text = await generateDialogue(entity.id, entity.name || 'NPC', mapRef.current.name, entity.type, entity.persona, isLecture, subject);
      
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

      if (['NPC', 'DOG', 'CAT', 'BIRD'].includes(entity.type)) {
          // Use fixed assigned voice
          const voice = entity.voiceName || 'Kore';
          // If dog/cat, text is "WangWang", we can just let TTS read it or skip.
          // User said "Animals will emit corresponding animal sounds". TTS reading "Wang Wang" is accurate to that description in a browser context without assets.
          generateSpeech(text, voice).then(audioData => {
              if(audioData) playAudio(audioData);
          });
      }

      targetRef.current = null;
      return;
    }

    if (entity.type === EntityType.DESK && !entity.isOccupied) {
      if (entity.id !== gameState.satAtDeskId) {
          // Changed position to be BEHIND the desk (visually below it, at y+40)
          playerRef.current = { x: entity.pos.x, y: entity.pos.y + 40 };
          setGameState(prev => ({ ...prev, satAtDeskId: entity.id, dialogue: null, facing: 'up' }));
          facingRef.current = 'up'; // Force facing up (towards podium)
          targetRef.current = null;
      }
      return;
    } else if (entity.type === EntityType.DESK && entity.isOccupied) {
      setGameState(prev => ({ ...prev, dialogue: { speaker: '旁白', text: '这个座位已经有人了。' } }));
      targetRef.current = null;
      return;
    }

    if (entity.type === EntityType.BACKPACK) {
       targetRef.current = null;
       setGameState(prev => ({ ...prev, isBackpackOpen: !prev.isBackpackOpen }));
       return;
    }

    if (entity.type === EntityType.BED && entity.name === '我的床') {
        handleSleep();
        return;
    }
  };

  const handleSleep = () => {
      targetRef.current = null;
      setGameState(prev => ({ ...prev, isNight: true, dialogue: { speaker: '旁白', text: '你躺在床上，闭上了眼睛...' } }));
      setTimeout(() => {
          startNewDay();
      }, 4000);
  };

  const startNewDay = () => {
      spawnRoommates();
      const text = '快起床！楼梯好挤啊，我们要排队走！';
      setGameState(prev => ({
          ...prev,
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
          isBackpackOpen: false
      }));
      generateSpeech(text, 'Aoede').then(audio => audio && playAudio(audio));
  };

  const switchLesson = (lesson: 'Chinese' | 'Math' | 'English' | 'PE') => {
      setGameState(prev => ({ 
          ...prev, 
          currentLesson: lesson, 
          isBackpackOpen: false,
          dialogue: { speaker: '旁白', text: `你拿出了${lesson === 'PE' ? '跳绳' : '课本'}，准备上${TEACHERS[lesson].subject}课。` } 
      }));
  };

  const handleStartClass = () => {
      if (gameState.currentLesson === 'PE') {
           const text = '同学们，大家分成两队！一会去操场集合！';
           setGameState(prev => ({ 
               ...prev, 
               isClassStarted: true,
               dialogue: { speaker: '李老师(体)', text }
           }));
           generateSpeech(text, 'Fenrir').then(a => a && playAudio(a));
      } else {
           setGameState(prev => ({ ...prev, isClassStarted: true }));
      }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState.isSchoolOver && gameState.isNight) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

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
      if (gameState.currentLesson === 'PE' && gameState.isClassStarted && gameState.currentMapId === 'classroom') {
          // The last spot in the right line (index 19 in visual logic) is around x:550, y:200 + 18*20 = 560
          // But visual loop uses specific math.
          // Let's check proximity to the gap spot.
          const gapX = 550;
          const gapY = 200 + 9 * 40; // Approx end of line
          const dx = playerRef.current.x - gapX;
          const dy = playerRef.current.y - gapY;
          // If close to line end, trigger transition
          if (Math.sqrt(dx*dx + dy*dy) < 60) {
              mapRef.current = MAPS['playground'];
              playerRef.current = { x: 700, y: 700 }; // Player joins formation on playground
              targetRef.current = null;
              setGameState(prev => ({
                 ...prev,
                 currentMapId: 'playground',
                 playerPos: { x: 700, y: 700 },
                 targetPos: null,
                 dialogue: { speaker: '旁白', text: '你加入了队伍，大家一起整齐地走到了操场。' }
              }));
              return; // End loop frame
          }
      }

      if (gameState.currentMapId === 'playground') {
        const npcs = mapRef.current.entities.filter(e => 
            e.type === EntityType.NPC || e.type === EntityType.DOG || e.type === EntityType.BIRD
        );

        // PE Square Formation Logic on Playground
        if (gameState.currentLesson === 'PE' && gameState.isClassStarted) {
             const students = mapRef.current.entities.filter(e => e.id.startsWith('student_'));
             students.forEach((s, i) => {
                 // 5 columns, 4 rows grid
                 const col = i % 5;
                 const row = Math.floor(i / 5);
                 // Center on basketball court (700, 800 center roughly)
                 const sx = 550 + col * 70;
                 const sy = 750 + row * 60;
                 s.pos = { x: sx, y: sy };
                 s.facing = 'up'; // Facing teacher
                 
                 // Leaders in front row
                 if (LEADERS.includes(s.name || '')) {
                     s.pos.y = 700; // Front row override
                 }
             });
             // Teacher at front
             const teacher = mapRef.current.entities.find(e => e.id === 'teacher_pe');
             if (teacher) {
                 teacher.pos = { x: 700, y: 600 };
                 teacher.facing = 'down';
             }
        }

        npcs.forEach(npc => {
            if (gameState.currentLesson === 'PE' && gameState.isClassStarted && npc.subtype === 'child') return;

            let state = npcStateRef.current.get(npc.id) || { target: null, timer: Math.random() * 100, behavior: 'stay' };
            
            if (gameState.isSchoolOver && npc.subtype === 'child' && state.behavior === 'stay') {
                 if (Math.random() < 0.005) {
                     state.behavior = 'exit';
                 }
            }

            if (state.behavior === 'exit') {
                state.target = { x: 700, y: 1200 };
            }

            if (!state.target && state.timer <= 0) {
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
                    if (state.behavior === 'exit') {
                        mapRef.current.entities = mapRef.current.entities.filter(e => e.id !== npc.id);
                    }
                }
            }
            npcStateRef.current.set(npc.id, state);
        });
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [gameState.currentMapId, gameState.isClassStarted, gameState.currentLesson, gameState.isSchoolOver]);

  const drawWall = (ctx: CanvasRenderingContext2D, wall: {x:number, y:number, w:number, h:number}, mapId: string) => {
      ctx.fillStyle = mapId === 'classroom' ? '#9CA3AF' : '#4B5563';
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 2;
      ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
  };
  
  const drawSprite = (ctx: CanvasRenderingContext2D, entity: Entity, isPlayer: boolean = false) => {
    const { x, y } = entity.pos;
    const { size, color, facing } = entity;
    const bounce = (isPlayer || entity.aiState === 'moving') ? Math.sin(walkFrameRef.current) * 3 : 0;
    
    ctx.save();
    
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + size/2, size/1.5, size/4, 0, 0, Math.PI * 2);
    ctx.fill();

    const isDoingGymnastics = gameState.currentLesson === 'PE' && gameState.isClassStarted && gameState.currentMapId === 'playground';
    const isInFormation = x > 200 && x < 1200 && y > 600 && y < 900;
    const shouldAnimateGym = isDoingGymnastics && (isInFormation || !isPlayer);

    let drawColor = color;
    if (shouldAnimateGym) drawColor = '#2563EB'; // Blue uniform

    if (shouldAnimateGym) {
        const gymPhase = Math.sin(Date.now() / 200);
        ctx.translate(x, y + bounce);
        
        // Jumping Jack Arms
        ctx.fillStyle = drawColor;
        ctx.fillRect(-size/2, -size/1.5, size, size); // Body
        
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 4;
        const armAngle = gymPhase > 0 ? Math.PI/4 : -Math.PI/1.5;
        // Left Arm
        ctx.beginPath(); ctx.moveTo(-size/2, -size/2); ctx.lineTo(-size/2 - Math.cos(armAngle)*15, -size/2 - Math.sin(armAngle)*15); ctx.stroke();
        // Right Arm
        ctx.beginPath(); ctx.moveTo(size/2, -size/2); ctx.lineTo(size/2 + Math.cos(armAngle)*15, -size/2 - Math.sin(armAngle)*15); ctx.stroke();

        // Head
        ctx.fillStyle = '#FCA5A5';
        ctx.beginPath(); ctx.arc(0, -size, size/2, 0, Math.PI*2); ctx.fill();
        ctx.restore();
        return;
    }

    ctx.translate(x, y + bounce);

    if (isPlayer) {
        // Player: Girl with purple skirt and two small bags
        // Top
        ctx.fillStyle = '#D8B4FE'; // Lighter purple top
        ctx.fillRect(-size/2, -size/1.5, size, size/2);
        
        // Skirt
        ctx.fillStyle = '#7E22CE'; // Purple skirt
        ctx.beginPath();
        ctx.moveTo(-size/2, -size/6);
        ctx.lineTo(size/2, -size/6);
        ctx.lineTo(size/1.2, size/1.2); // Flare out left
        ctx.lineTo(-size/1.2, size/1.2); // Flare out right
        ctx.fill();

        // Bags
        ctx.fillStyle = '#FBCFE8'; // Pink small bags
        // Left bag
        ctx.beginPath(); ctx.arc(-size, size/3, size/4, 0, Math.PI*2); ctx.fill();
        // Right bag
        ctx.beginPath(); ctx.arc(size, size/3, size/4, 0, Math.PI*2); ctx.fill();

        // Head
        ctx.fillStyle = '#FCA5A5'; 
        ctx.beginPath();
        ctx.arc(0, -size, size/2, 0, Math.PI * 2);
        ctx.fill();

        // Braids (Long black hair)
        ctx.fillStyle = '#000000';
        if (facing === 'down' || facing === 'left' || facing === 'right') {
           ctx.fillRect(-size/2, -size * 1.4, size, size/2); // Bangs
           ctx.lineWidth = 4; ctx.strokeStyle = '#000000';
           ctx.beginPath(); ctx.moveTo(-size/2, -size); ctx.quadraticCurveTo(-size, -size/2, -size/1.5, 0); ctx.stroke();
           ctx.beginPath(); ctx.moveTo(size/2, -size); ctx.quadraticCurveTo(size, -size/2, size/1.5, 0); ctx.stroke();
           // Face features
           if (facing === 'down') {
                ctx.fillStyle = '#000';
                ctx.fillRect(-5, -size, 2, 2); ctx.fillRect(3, -size, 2, 2); // Eyes
                ctx.fillRect(-2, -size + 4, 4, 1); // Mouth
           }
        } else {
           // Back of head
           ctx.beginPath(); ctx.arc(0, -size, size/2 + 1, 0, Math.PI*2); ctx.fill();
           ctx.fillRect(-size/2, -size, size, size*1.2);
        }

        ctx.restore();
        return;
    }

    // NPC Body
    ctx.fillStyle = drawColor;
    
    if (entity.visual?.outfit === 'apron') { // Chinese Teacher Apron
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-size/2, -size/1.5, size, size); 
        ctx.fillStyle = '#000000'; // Black Apron
        ctx.fillRect(-size/2 + 2, -size/1.5 + 5, size - 4, size - 5);
    } else if (entity.subtype === 'adult') {
        ctx.fillRect(-size/1.8, -size/1.2, size*1.1, size*1.5); // Taller
    } else {
        ctx.fillRect(-size/2, -size/1.5, size, size);
    }

    // NPC Head
    ctx.fillStyle = '#FCA5A5'; 
    ctx.beginPath();
    ctx.arc(0, -size, size/2, 0, Math.PI * 2);
    ctx.fill();

    // NPC Hair
    ctx.fillStyle = '#000000';
    if (entity.visual?.hair === 'curly_brown') ctx.fillStyle = '#8B4513';

    if (facing === 'down') {
       ctx.fillRect(-size/2, -size * 1.4, size, size/2); // Bangs
       // Face
       ctx.fillStyle = '#000';
       ctx.fillRect(-5, -size, 2, 2); ctx.fillRect(3, -size, 2, 2); // Eyes
       ctx.fillRect(-2, -size + 4, 4, 1); // Mouth
    } else if (facing === 'up') {
       // Back of head
       ctx.beginPath(); ctx.arc(0, -size, size/2 + 1, 0, Math.PI*2); ctx.fill();
       if (entity.visual?.hair === 'long_black' || entity.visual?.hair === 'curly_brown') {
            // Long hair back
            ctx.fillRect(-size/2, -size, size, size*1.2);
       }
    } else {
       // Side profile
       ctx.fillRect(-size/2, -size*1.4, size, size/2);
    }

    // Jump Rope
    if (gameState.currentLesson === 'PE' && gameState.currentMapId === 'playground') {
        ctx.strokeStyle = '#FCD34D';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI, false);
        ctx.stroke();
    }

    ctx.restore();
  };

  const drawBuilding = (ctx: CanvasRenderingContext2D, entity: Entity) => {
    const { x, y } = entity.pos;
    ctx.fillStyle = '#F3F4F6';
    ctx.fillRect(x - 300, y - 100, 600, 100);
    // Roof
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.moveTo(x - 320, y - 100);
    ctx.lineTo(x + 320, y - 100);
    ctx.lineTo(x, y - 180);
    ctx.fill();
    // Text
    ctx.fillStyle = '#1F2937';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('阳光小学', x, y - 40);
    // Door
    ctx.fillStyle = '#4B5563';
    ctx.fillRect(x - 40, y - 20, 80, 120);
  };

  const drawStore = (ctx: CanvasRenderingContext2D, entity: Entity) => {
    const { x, y } = entity.pos;
    ctx.fillStyle = '#FFF7ED';
    ctx.fillRect(x - 75, y - 80, 150, 80);
    ctx.fillStyle = '#F59E0B'; // Orange roof
    ctx.fillRect(x - 80, y - 100, 160, 20);
    // Awning stripes
    for(let i=0; i<8; i++) {
        ctx.fillStyle = i%2===0 ? '#EF4444' : '#FFFFFF';
        ctx.fillRect(x - 75 + i*18.75, y - 80, 18.75, 10);
    }
    ctx.fillStyle = '#1F2937';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('小卖部', x, y - 30);
  };

  const drawDormitory = (ctx: CanvasRenderingContext2D, entity: Entity) => {
    const { x, y } = entity.pos;
    ctx.fillStyle = '#DBEAFE';
    ctx.fillRect(x - 100, y - 50, 200, 100);
    // Roof
    ctx.fillStyle = '#3B82F6';
    ctx.beginPath(); ctx.moveTo(x - 110, y - 50); ctx.lineTo(x + 110, y - 50); ctx.lineTo(x, y - 100); ctx.fill();
    ctx.fillStyle = '#1F2937';
    ctx.fillText('学生宿舍', x, y - 10);
  };

  const drawFurniture = (ctx: CanvasRenderingContext2D, entity: Entity) => {
    const { x, y } = entity.pos;
    const { size, color } = entity;
    
    if (entity.type === EntityType.BACKPACK) {
        ctx.save();
        ctx.translate(x, y);
        // Bag Body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(-size/1.2, -size/1.5, size*1.6, size*1.4, 5);
        ctx.fill();
        // Flap
        ctx.fillStyle = '#BE185D'; // Darker pink
        ctx.beginPath();
        ctx.roundRect(-size/1.2, -size/1.5, size*1.6, size*0.8, 5);
        ctx.fill();
        // Straps/Buckles
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(-size/3, -size/3, size/4, size/4);
        ctx.fillRect(size/10, -size/3, size/4, size/4);
        ctx.restore();
        return;
    }

    if (entity.type === EntityType.DESK) {
        ctx.fillStyle = '#92400E';
        ctx.fillRect(x - size, y - size/2, size*2, size);
        ctx.fillStyle = '#78350F'; // Chair tucked in back
        ctx.fillRect(x - size/2, y - size/2 - 5, size, 5);
        return;
    }

    if (entity.type === EntityType.TABLE) {
        ctx.fillStyle = color;
        ctx.fillRect(x - size/2, y - size/3, size, size/1.5);
        // Computer for RA
        if (entity.id === 'ra_desk') {
            ctx.fillStyle = '#374151';
            ctx.fillRect(x - 10, y - 20, 20, 15); // Monitor
            ctx.fillStyle = '#9CA3AF';
            ctx.fillRect(x - 10, y - 5, 20, 2); // Keyboard
        }
        return;
    }

    if (entity.type === EntityType.BED) {
        ctx.fillStyle = color;
        ctx.fillRect(x - size/2, y - size, size, size*2);
        // Pillow
        ctx.fillStyle = '#FFF';
        ctx.fillRect(x - size/2 + 5, y - size + 5, size - 10, 20);
        // Ladder for bunk
        ctx.fillStyle = '#B45309';
        ctx.fillRect(x + size/2 - 10, y - size, 10, size*2);
        for(let i=0; i<5; i++) {
             ctx.fillRect(x + size/2 - 10, y - size + i*30, 10, 2);
        }
        return;
    }

    if (entity.type === EntityType.SHELF) {
        ctx.fillStyle = color;
        ctx.fillRect(x - size/2, y - size/2, size, size);
        // Items
        ctx.fillStyle = '#FCD34D'; ctx.fillRect(x - size/2 + 5, y - size/4, 20, 10);
        ctx.fillStyle = '#EF4444'; ctx.fillRect(x, y - size/4, 20, 10);
        return;
    }

    if (entity.type === EntityType.FRIDGE) {
        ctx.fillStyle = '#E5E7EB';
        ctx.fillRect(x - size/2, y - size, size, size*2);
        ctx.fillStyle = '#60A5FA'; // Glass
        ctx.fillRect(x - size/2 + 5, y - size + 5, size - 10, size*2 - 10);
        return;
    }
  };

  const drawPortalHole = (ctx: CanvasRenderingContext2D, entity: Entity) => {
      // Red Hole for Dorm
      const { x, y } = entity.pos;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 0.5); // Perspective
      ctx.fillStyle = '#7F1D1D'; // Dark Red (Deep)
      ctx.beginPath(); ctx.arc(0, 0, entity.size/2, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#EF4444'; // Bright Red Ring
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
  };

  const drawAnimal = (ctx: CanvasRenderingContext2D, entity: Entity) => {
      const { x, y } = entity.pos;
      const t = Date.now() / 200;
      
      ctx.save();
      ctx.translate(x, y);
      if (entity.type === EntityType.DOG) {
          ctx.fillStyle = entity.color;
          ctx.fillRect(-10, -5, 20, 10); // Body
          ctx.fillRect(-12, -8, 8, 8); // Head
          // Tail wag
          ctx.beginPath(); ctx.moveTo(10, -5); ctx.lineTo(10 + Math.sin(t)*5, -8); ctx.stroke();
      } else if (entity.type === EntityType.CAT) {
          ctx.fillStyle = entity.color;
          ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill(); // Body
          ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(-6, -10); ctx.lineTo(0, -8); ctx.fill(); // Ears
          ctx.beginPath(); ctx.moveTo(3, -6); ctx.lineTo(6, -10); ctx.lineTo(0, -8); ctx.fill();
      } else {
          // Bird
          ctx.fillStyle = entity.color;
          const jump = Math.abs(Math.sin(t*2)) * 5;
          ctx.translate(0, -jump);
          ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#FCD34D';
          ctx.beginPath(); ctx.moveTo(3, -2); ctx.lineTo(6, 0); ctx.lineTo(3, 2); ctx.fill(); // Beak
      }
      ctx.restore();
  };

  const drawPool = (ctx: CanvasRenderingContext2D, entity: Entity) => {
      const { x, y, size } = entity.pos as any; // Using Entity props
      const s = entity.size;
      ctx.save();
      ctx.translate(entity.pos.x, entity.pos.y);
      ctx.fillStyle = '#93C5FD'; // Light blue water
      ctx.fillRect(-s, -s/2, s*2, s);
      ctx.strokeStyle = '#1E40AF';
      ctx.lineWidth = 4;
      ctx.strokeRect(-s, -s/2, s*2, s);
      
      // Ripples
      const t = Date.now() / 500;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(Math.sin(t)*20, Math.cos(t)*10, 10, 0, Math.PI*2);
      ctx.stroke();
      
      ctx.fillStyle = '#1E3A8A';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(entity.name || '泳池', 0, 0);
      ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas Size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const render = () => {
      const map = mapRef.current;
      
      // Camera
      const camX = Math.max(0, Math.min(map.width - canvas.width, playerRef.current.x - canvas.width / 2));
      const camY = Math.max(0, Math.min(map.height - canvas.height, playerRef.current.y - canvas.height / 2));
      
      ctx.setTransform(1, 0, 0, 1, -camX, -camY);

      // Background
      ctx.fillStyle = map.backgroundColor;
      ctx.fillRect(0, 0, map.width, map.height);

      // Floor Details (Courts/Rugs)
      if (gameState.currentMapId === 'playground') {
          // Basketball Court
          ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4;
          ctx.strokeRect(200, 600, 1000, 500); // Main Line
          ctx.beginPath(); ctx.moveTo(700, 600); ctx.lineTo(700, 1100); ctx.stroke(); // Center Line
          ctx.beginPath(); ctx.arc(700, 850, 80, 0, Math.PI*2); ctx.stroke(); // Center Circle
      }
      if (gameState.currentMapId === 'classroom') {
          // Podium Rug
          ctx.fillStyle = '#78350F';
          ctx.fillRect(350, 50, 300, 60);
      }

      // 1. Draw Walls (Bottom Layer)
      map.walls.forEach(w => drawWall(ctx, w, gameState.currentMapId));

      // 2. Draw Entities (Sorted by Y for depth)
      const sortedEntities = [...map.entities].sort((a, b) => a.pos.y - b.pos.y);
      
      // Draw Player in proper depth order
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
          else if (['BED','TABLE','CHAIR','SHELF','FRIDGE','DESK','BACKPACK'].includes(entity.type)) drawFurniture(ctx, entity);
          else if (['DOG','CAT','BIRD'].includes(entity.type)) drawAnimal(ctx, entity);
          else if (entity.id === 'portal_hallway') drawPortalHole(ctx, entity); // Red hole
          else if (entity.type === EntityType.PORTAL) { /* invisible usually */ }
          else if (entity.type === EntityType.HOOP) {
               ctx.fillStyle = '#EEE'; ctx.fillRect(entity.pos.x, entity.pos.y - 100, 10, 100); // Pole
               ctx.strokeStyle = '#F00'; ctx.lineWidth = 2; ctx.strokeRect(entity.pos.x - 20, entity.pos.y - 120, 40, 30); // Board
               ctx.beginPath(); ctx.arc(entity.pos.x, entity.pos.y - 100, 15, 0, Math.PI); ctx.stroke(); // Rim
          }
          else drawSprite(ctx, entity);
      });

      if (!playerDrawn) {
          drawSprite(ctx, { 
              id: 'player', type: EntityType.PLAYER, pos: playerRef.current, size: 20, color: '#8B5CF6', facing: facingRef.current 
          }, true);
      }

      // Night Overlay
      if (gameState.isNight) {
          ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset for overlay
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      requestAnimationFrame(render);
    };
    
    render();
  }, [gameState]);

  return (
    <div className="w-full h-screen bg-gray-900 relative">
      <canvas ref={canvasRef} onClick={handleCanvasClick} className="block cursor-pointer" />
      
      {/* UI Overlay */}
      <div className="absolute top-4 left-4 bg-white/90 p-2 rounded shadow border border-slate-700">
         <div className="text-sm font-bold text-red-600">{TEACHERS[gameState.currentLesson]?.subject || '课间'}</div>
         {gameState.isClassStarted && <div className="text-xs text-green-600">正在上课</div>}
         {gameState.isSchoolOver && <div className="text-xs text-red-600">放学了</div>}
      </div>

      {gameState.isClassStarted && (
          <button 
             onClick={() => {
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
                    isLiningUp: false
                }))
             }}
             className="absolute bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow hover:bg-red-600 font-bold"
          >
             下课
          </button>
      )}

      {/* Backpack Modal */}
      {gameState.isBackpackOpen && (
          <div className="absolute top-20 right-4 bg-white p-4 rounded shadow-lg border border-pink-300 w-48">
              <h3 className="font-bold text-pink-600 mb-2 border-b">我的书包 (选择课程)</h3>
              <div className="space-y-2">
                  <div onClick={() => switchLesson('Chinese')} className="p-2 bg-red-100 rounded text-sm cursor-pointer hover:bg-red-200">语文课本 (上语文)</div>
                  <div onClick={() => switchLesson('Math')} className="p-2 bg-blue-100 rounded text-sm cursor-pointer hover:bg-blue-200">数学课本 (上数学)</div>
                  <div onClick={() => switchLesson('English')} className="p-2 bg-green-100 rounded text-sm cursor-pointer hover:bg-green-200">英语课本 (上英语)</div>
                  <div onClick={() => switchLesson('PE')} className="p-2 bg-yellow-100 rounded text-sm cursor-pointer hover:bg-yellow-200">跳绳 (上体育)</div>
                  
                  {gameState.currentMapId === 'dorm_room' && (
                      <div 
                         onClick={() => {
                             setGameState(prev => ({ ...prev, isBackpackOpen: false, dialogue: { speaker: '旁白', text: '开始写作业...' } }));
                             playerRef.current = { x: 400, y: 380 };
                             facingRef.current = 'up';
                         }}
                         className="p-2 bg-purple-100 rounded text-sm cursor-pointer hover:bg-purple-200 font-bold border-t mt-2"
                      >
                          写作业
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Interaction Buttons */}
      <div className="absolute bottom-4 left-4 flex gap-2">
           {!gameState.isClassStarted && gameState.satAtDeskId && !gameState.isSchoolOver && (
               <button 
                 onClick={handleStartClass}
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
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-3/4 max-w-lg bg-white/95 border-2 border-slate-800 p-4 rounded-lg shadow-xl animate-fade-in-up">
              <div className="font-bold text-indigo-700 text-sm mb-1">{gameState.dialogue.speaker}</div>
              <div className="text-slate-800 leading-relaxed">{gameState.dialogue.text}</div>
              <div className="text-[10px] text-gray-400 mt-2 text-right">点击屏幕继续</div>
          </div>
      )}
    </div>
  );
}
