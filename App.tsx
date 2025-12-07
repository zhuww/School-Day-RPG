
import React, { useRef, useEffect, useState } from 'react';
import { GameState, MapData, Entity, EntityType, Point, Friend, Quiz } from './types';
import { generateDialogue } from './services/geminiService';

// --- CONSTANTS ---
const PLAYER_SPEED = 3.5;
const NPC_SPEED = 1.5;
const ANIMAL_SPEED = 2.0;
const TEACHER_SPEED = 2.5;
const CURFEW_TIMEOUT_MS = 20000; // 20 seconds before RA catches you

// Teacher Definitions with Visual Traits
const TEACHERS = {
  'Chinese': { 
      id: 'teacher_chinese', 
      name: '王老师', 
      color: '#FFFFFF', // White shirt base
      subject: '语文',
      visual: { hair: 'curly_brown', outfit: 'apron' }
  },
  'Math': { 
      id: 'teacher_math', 
      name: '李老师', 
      color: '#2563EB', 
      subject: '数学',
      visual: { hair: 'long_black', outfit: 'normal' }
  },
  'English': { 
      id: 'teacher_english', 
      name: '张老师', 
      color: '#000000', // Black hair implied base
      subject: '英语',
      visual: { hair: 'short_black', outfit: 'skirt' }
  },
  'PE': { 
      id: 'teacher_pe', 
      name: '李老师', // Male teacher
      color: '#16A34A', // Green Uniform
      subject: '体育',
      visual: { hair: 'short_black_male', outfit: 'sport_male' }
  },
};

// --- MAP DATA ---
const MAPS: Record<string, MapData> = {
  'playground': {
    id: 'playground',
    name: '校门口',
    width: 1400,
    height: 1200,
    backgroundColor: '#65A30D', // Lush Green
    spawnPoint: { x: 700, y: 1100 },
    walls: [
      { x: 0, y: 0, w: 1400, h: 50 }, // Top fence
      { x: 0, y: 0, w: 50, h: 1200 }, // Left fence
      { x: 1350, y: 0, w: 50, h: 1200 }, // Right fence
      { x: 0, y: 1150, w: 600, h: 50 }, // Bottom fence L
      { x: 800, y: 1150, w: 600, h: 50 }, // Bottom fence R
      // Building Footprint (Collision) - Matches the visual building base
      { x: 400, y: 200, w: 600, h: 100 }, 
      // Dormitory Footprint
      { x: 100, y: 400, w: 200, h: 100 },
      // Store Footprint
      { x: 1100, y: 200, w: 150, h: 80 },
    ],
    entities: [
      // Direct link to classroom via the building
      { id: 'school_bldg', type: EntityType.BUILDING, pos: { x: 700, y: 300 }, size: 0, color: 'transparent' }, // Visual Anchor
      { id: 'portal_class', type: EntityType.PORTAL, pos: { x: 700, y: 320 }, size: 60, color: 'rgba(0,0,0,0)', targetMap: 'classroom', targetPos: { x: 100, y: 300 } },
      
      // Dormitory Building Anchor & Portal
      { id: 'dorm_bldg', type: EntityType.DORMITORY, pos: { x: 200, y: 450 }, size: 0, color: 'transparent' },
      { id: 'portal_dorm_hall', type: EntityType.PORTAL, pos: { x: 200, y: 450 }, size: 60, color: 'rgba(0,0,0,0)', targetMap: 'dorm_hallway', targetPos: { x: 50, y: 150 } },

      // School Store
      { id: 'store_bldg', type: EntityType.STORE, pos: { x: 1175, y: 280 }, size: 0, color: 'transparent' },

      { id: 'guard', type: EntityType.NPC, subtype: 'adult', pos: { x: 650, y: 1120 }, size: 25, color: '#1F2937', name: '保安叔叔', facing: 'right' },
      
      // Basketball Court Props
      { id: 'hoop_1', type: EntityType.HOOP, pos: { x: 200, y: 600 }, size: 40, color: '#eee' },
      { id: 'hoop_2', type: EntityType.HOOP, pos: { x: 1200, y: 600 }, size: 40, color: '#eee' },

      // Animals
      { id: 'dog_1', type: EntityType.DOG, pos: { x: 300, y: 1000 }, size: 20, color: '#92400E', name: '大黄' },
      { id: 'cat_1', type: EntityType.CAT, pos: { x: 1100, y: 900 }, size: 15, color: '#E5E7EB', name: '小白' },
      { id: 'bird_1', type: EntityType.BIRD, pos: { x: 400, y: 400 }, size: 10, color: '#60A5FA', name: '小鸟' },
      { id: 'bird_2', type: EntityType.BIRD, pos: { x: 450, y: 420 }, size: 10, color: '#60A5FA', name: '小鸟' },

      // Classmates on playground (Initial random ones)
      { id: 'c1', type: EntityType.NPC, subtype: 'child', pos: { x: 300, y: 800 }, size: 18, color: '#F59E0B', name: '跑步的男生', facing: 'left' },
      { id: 'c2', type: EntityType.NPC, subtype: 'child', pos: { x: 900, y: 700 }, size: 18, color: '#EC4899', name: '聊天的女生', facing: 'left' },
      { id: 'c3', type: EntityType.NPC, subtype: 'child', pos: { x: 500, y: 900 }, size: 18, color: '#3B82F6', name: '同学', facing: 'right' },
      { id: 'c4', type: EntityType.NPC, subtype: 'child', pos: { x: 1000, y: 850 }, size: 18, color: '#10B981', name: '同学', facing: 'left' },
    ]
  },
  'classroom': {
    id: 'classroom',
    name: '一年级(2)班',
    width: 1000,
    height: 800,
    backgroundColor: '#FEF3C7', // Wood floor
    spawnPoint: { x: 80, y: 300 }, // Start in the "passageway" (aisle) on the left
    walls: [
      { x: 0, y: 0, w: 1000, h: 50 },
      { x: 0, y: 750, w: 1000, h: 50 },
      { x: 0, y: 0, w: 50, h: 800 },
      { x: 950, y: 0, w: 50, h: 800 },
      { x: 350, y: 50, w: 300, h: 60 }, // Podium
    ],
    entities: [
      // Exit back to playground
      { id: 'portal_out', type: EntityType.PORTAL, pos: { x: 50, y: 300 }, size: 40, color: '#E5E7EB', targetMap: 'playground', targetPos: { x: 700, y: 380 } },
      
      ...Array.from({ length: 20 }).map((_, i) => {
        const row = Math.floor(i / 4); // 0 to 4
        const col = i % 4; // 0 to 3
        
        // Layout: [Desk] [Desk] ---AISLE--- [Desk] [Desk]
        // Cols 0,1 are left. Cols 2,3 are right.
        const xBase = col < 2 ? 250 + col * 130 : 600 + (col-2) * 130;
        const yBase = 220 + row * 110;
        
        // Target Empty Seat: Row 0 (First Row), Col 1 (Inner Left)
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
      
      // Backpack next to the empty seat (Row 0, Col 1 => x=380, y=220)
      { id: 'my_backpack', type: EntityType.BACKPACK, pos: { x: 430, y: 230 }, size: 15, color: '#DB2777', name: '我的书包' }
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
      // Door to My Dorm
      { id: 'door_my_dorm', type: EntityType.PORTAL, pos: { x: 500, y: 50 }, size: 50, color: '#4B2A10', targetMap: 'dorm_room', targetPos: { x: 400, y: 500 } },
      
      // Front Desk / Reception
      { id: 'ra_desk', type: EntityType.TABLE, pos: { x: 300, y: 250 }, size: 100, color: '#D97706', name: '值班前台' },
      { id: 'ra_chair', type: EntityType.CHAIR, pos: { x: 300, y: 200 }, size: 25, color: '#1F2937', name: '椅子', facing: 'down' },
      { id: 'ra_npc', type: EntityType.NPC, subtype: 'adult', pos: { x: 300, y: 200 }, size: 25, color: '#BE123C', name: '宿管老师', facing: 'down' }
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
      // Exit to hallway
      { id: 'portal_hallway', type: EntityType.PORTAL, pos: { x: 400, y: 550 }, size: 50, color: '#E5E7EB', targetMap: 'dorm_hallway', targetPos: { x: 300, y: 100 } },
      
      // Windows
      { id: 'win1', type: EntityType.WINDOW, pos: { x: 150, y: 10 }, size: 60, color: '#fff' },
      { id: 'win2', type: EntityType.WINDOW, pos: { x: 650, y: 10 }, size: 60, color: '#fff' },

      // Bunk Beds (3 bunks = 6 beds). Along left and right walls.
      // Left Wall
      { id: 'bed_1', type: EntityType.BED, pos: { x: 100, y: 150 }, size: 80, color: '#60A5FA', name: '室友的床' },
      { id: 'bed_2', type: EntityType.BED, pos: { x: 100, y: 350 }, size: 80, color: '#F472B6', name: '室友的床' },
      // Right Wall
      { id: 'bed_my', type: EntityType.BED, pos: { x: 700, y: 150 }, size: 80, color: '#DB2777', name: '我的床' },
      { id: 'bed_4', type: EntityType.BED, pos: { x: 700, y: 350 }, size: 80, color: '#34D399', name: '室友的床' },

      // Table & Chairs
      { id: 'table', type: EntityType.TABLE, pos: { x: 400, y: 300 }, size: 120, color: '#78350F', name: '写字桌' },
      
      // Chairs
      { id: 'chair_my', type: EntityType.CHAIR, pos: { x: 400, y: 380 }, size: 25, color: '#92400E', name: '我的椅子', facing: 'up' },
      { id: 'chair_2', type: EntityType.CHAIR, pos: { x: 300, y: 300 }, size: 25, color: '#92400E', name: '椅子', facing: 'right' },
      { id: 'chair_3', type: EntityType.CHAIR, pos: { x: 500, y: 300 }, size: 25, color: '#92400E', name: '椅子', facing: 'left' },
      { id: 'chair_4', type: EntityType.CHAIR, pos: { x: 400, y: 220 }, size: 25, color: '#92400E', name: '椅子', facing: 'down' },

      // Backpack (Initially on chair)
      { id: 'dorm_backpack', type: EntityType.BACKPACK, pos: { x: 430, y: 380 }, size: 15, color: '#DB2777', name: '我的书包' }
    ]
  }
};

// Generate random colors/names for classmates in classroom
const CLASSROOM_ENTITIES = MAPS['classroom'].entities;
const COLORS = ['#F87171', '#60A5FA', '#34D399', '#A78BFA', '#FBBF24', '#F472B6'];
const NAMES = ['小明', '小红', '刚子', '丽丽', '强子', '芳芳', '小军', '娜娜', '涛涛', '静静'];

CLASSROOM_ENTITIES.forEach((e, i) => {
   if (e.type === EntityType.DESK && e.isOccupied) {
       const npcId = `student_${i}`;
       MAPS['classroom'].entities.push({
           id: npcId,
           type: EntityType.NPC,
           subtype: 'child',
           pos: { x: e.pos.x, y: e.pos.y + 20 }, // Shifted DOWN (South)
           size: 18,
           color: COLORS[i % COLORS.length],
           name: NAMES[i % NAMES.length],
           facing: 'up' // Facing the teacher (North)
       });
   }
});

// Add Roommates to Dorm Room
const DORM_NAMES = ['芳芳', '娜娜', '静静', '小兰', '小美'];
DORM_NAMES.forEach((name, i) => {
    const isSleeping = Math.random() > 0.5;
    const targets = [
        { x: 100, y: 150 }, // bed 1
        { x: 100, y: 350 }, // bed 2
        { x: 700, y: 350 }, // bed 4
        { x: 300, y: 300 }, // chair 2
        { x: 500, y: 300 }, // chair 3
    ];
    
    // Pick unique spot roughly
    const spot = targets[i];
    
    MAPS['dorm_room'].entities.push({
        id: `roommate_${i}`,
        type: EntityType.NPC,
        subtype: 'child',
        pos: { x: spot.x, y: spot.y + (isSleeping ? 0 : 0) },
        size: 18,
        color: COLORS[i % COLORS.length],
        name: name,
        facing: isSleeping ? 'down' : 'up', // Simplified
        behavior: isSleeping ? 'sleep' : 'study'
    });
});


export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  });
  
  const playerRef = useRef(gameState.playerPos);
  const targetRef = useRef<Point | null>(null);
  const mapRef = useRef(MAPS['playground']);
  const walkFrameRef = useRef(0);
  const animationFrameRef = useRef<number>(0);
  const facingRef = useRef<'left' | 'right' | 'up' | 'down'>('right');
  const npcStateRef = useRef<Map<string, { target: Point | null, timer: number, behavior?: 'exit' | 'stay' }>>(new Map());

  // --- TEACHER MANAGEMENT ---
  
  useEffect(() => {
    if (gameState.currentMapId === 'classroom' && !gameState.isTeacherTransitioning && !gameState.isSchoolOver) {
        const teacherInfo = TEACHERS[gameState.currentLesson];
        const existingTeacherIndex = mapRef.current.entities.findIndex(e => e.id.startsWith('teacher_'));
        
        const teacherEntity: Entity = {
            id: teacherInfo.id,
            type: EntityType.NPC,
            subtype: 'adult',
            pos: { x: 500, y: 100 }, // Podium position
            size: 25,
            color: teacherInfo.color,
            name: teacherInfo.name,
            facing: 'down'
        };

        if (existingTeacherIndex !== -1) {
            mapRef.current.entities[existingTeacherIndex] = teacherEntity;
        } else {
            mapRef.current.entities.push(teacherEntity);
        }
    }
  }, [gameState.currentLesson, gameState.currentMapId, gameState.isTeacherTransitioning, gameState.isSchoolOver]);

  // --- CURFEW / RA CHECK ---
  useEffect(() => {
      const interval = setInterval(() => {
          if (gameState.isSchoolOver && gameState.schoolOverTime) {
              const elapsed = Date.now() - gameState.schoolOverTime;
              // If school is over for > 20s AND player is not in dorm area
              if (elapsed > CURFEW_TIMEOUT_MS && !['dorm_room', 'dorm_hallway'].includes(gameState.currentMapId)) {
                  handleRAEscort();
              }
          }
      }, 1000);
      return () => clearInterval(interval);
  }, [gameState.isSchoolOver, gameState.schoolOverTime, gameState.currentMapId]);

  const handleRAEscort = () => {
      // 1. Teleport to Dorm Hallway Front Desk
      mapRef.current = MAPS['dorm_hallway'];
      // Place player in front of desk
      const deskPos = { x: 300, y: 320 };
      playerRef.current = { ...deskPos };
      facingRef.current = 'up';
      targetRef.current = null;

      // 2. Update State
      setGameState(prev => ({
          ...prev,
          currentMapId: 'dorm_hallway',
          playerPos: deskPos,
          targetPos: null,
          dialogue: { speaker: '宿管老师', text: '同学，这么晚了还在外面很不安全！快回宿舍登记休息。' },
          schoolOverTime: null // Reset timer to prevent loop
      }));
  };

  // --- ENGINE HELPERS ---

  const checkCollision = (nextPos: Point, map: MapData): boolean => {
    // Wall collisions
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
      // Transition
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

    if (entity.type === EntityType.STORE) {
        targetRef.current = null;
        setGameState(prev => ({
            ...prev,
            dialogue: { speaker: '收银员', text: '你好，买瓶水吗？一共三元。 (你支付了三元现金)' }
        }));
        return;
    }

    if (['NPC', 'DOG', 'CAT', 'BIRD'].includes(entity.type)) {
      if (entity.behavior === 'sleep') {
          setGameState(prev => ({ ...prev, dialogue: { speaker: '旁白', text: '她正在睡觉，不要打扰她。' } }));
          return;
      }
      if (entity.behavior === 'study') {
          setGameState(prev => ({ ...prev, dialogue: { speaker: entity.name || '室友', text: '我在写作业呢，今天的作业好难啊。' } }));
          return;
      }

      // Face the Entity
      if (Math.abs(entity.pos.x - playerRef.current.x) > Math.abs(entity.pos.y - playerRef.current.y)) {
         facingRef.current = entity.pos.x > playerRef.current.x ? 'right' : 'left';
      } else {
         facingRef.current = entity.pos.y > playerRef.current.y ? 'down' : 'up';
      }

      setGameState(prev => ({ ...prev, dialogue: { speaker: entity.name || 'Unknown', text: '...' } }));
      
      const text = await generateDialogue(entity.name || 'NPC', mapRef.current.name, entity.type);
      
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
      targetRef.current = null; 
      return;
    }

    if (entity.type === EntityType.DESK || entity.type === EntityType.CHAIR) {
        if (entity.isOccupied) {
            setGameState(prev => ({ ...prev, dialogue: { speaker: '旁白', text: '这个座位已经有同学坐了。' } }));
            targetRef.current = null;
        } else {
             targetRef.current = null; 
             const seatPos = { x: entity.pos.x, y: entity.pos.y + 20 };
             playerRef.current = { ...seatPos }; 
             facingRef.current = 'up'; 
             setGameState(prev => ({ 
                 ...prev, 
                 satAtDeskId: entity.id,
                 dialogue: null 
             }));
        }
    }

    if (entity.type === EntityType.BACKPACK) {
        targetRef.current = null;
        setGameState(prev => ({ ...prev, isBackpackOpen: !prev.isBackpackOpen }));
    }

    if (entity.type === EntityType.BED && entity.id === 'bed_my') {
        targetRef.current = null;
        if (gameState.homeworkStatus !== 'done') {
            setGameState(prev => ({ ...prev, dialogue: { speaker: '旁白', text: '还没写完作业呢，先去写作业吧。' } }));
        } else {
            handleSleep();
        }
    } else if (entity.type === EntityType.BED) {
        setGameState(prev => ({ ...prev, dialogue: { speaker: '旁白', text: '这是室友的床。' } }));
    }
  };

  const handleBookSelect = (item: 'Chinese' | 'Math' | 'English' | 'PE' | 'Homework') => {
      if (item === 'Homework') {
          // Immediately trigger homework if in dorm
          if (gameState.currentMapId === 'dorm_room') {
               handleStartHomework();
          } else {
              setGameState(prev => ({
                  ...prev,
                  isBackpackOpen: false,
                  dialogue: { speaker: '旁白', text: '回宿舍再写作业吧。' }
              }));
          }
          return;
      }

      let bookName = '';
      if (item === 'Chinese') bookName = '语文书';
      if (item === 'Math') bookName = '数学书';
      if (item === 'English') bookName = '英语书';
      if (item === 'PE') bookName = '跳绳';

      setGameState(prev => ({
          ...prev,
          currentLesson: item as any,
          selectedBook: bookName,
          isBackpackOpen: false,
          dialogue: null
      }));
  };

  const handleStartHomework = () => {
      // Move Player to My Chair
      const myChair = MAPS['dorm_room'].entities.find(e => e.id === 'chair_my');
      if (myChair) {
          playerRef.current = { x: myChair.pos.x, y: myChair.pos.y + 20 };
          facingRef.current = 'up';
          targetRef.current = null;
          
          setGameState(prev => ({
              ...prev,
              satAtDeskId: 'chair_my',
              isBackpackOpen: false,
              homeworkStatus: 'doing',
              dialogue: { speaker: '旁白', text: '正在认真写作业...' }
          }));

          // Finish after 3 seconds
          setTimeout(() => {
              setGameState(prev => ({
                  ...prev,
                  homeworkStatus: 'done',
                  dialogue: { speaker: '旁白', text: '呼，终于写完了！现在可以去睡觉了。' }
              }));
          }, 3000);
      }
  };

  const handleSleep = () => {
      // 1. Move to Bed
      const myBed = MAPS['dorm_room'].entities.find(e => e.id === 'bed_my');
      if (myBed) {
          playerRef.current = { x: myBed.pos.x + 30, y: myBed.pos.y + 40 };
          facingRef.current = 'left'; // Face wall?
          targetRef.current = null;
          setGameState(prev => ({ ...prev, satAtDeskId: 'bed', isNight: true, dialogue: null }));
          
          // 2. Day Transition
          setTimeout(() => {
              startNewDay();
          }, 3000);
      }
  };

  const startNewDay = () => {
      setGameState(prev => ({
          ...prev,
          isNight: false,
          isMorningWakeUp: true,
          // Reset Day Flags
          currentLesson: 'Chinese',
          isSchoolOver: false,
          schoolOverTime: null,
          isClassStarted: false,
          homeworkStatus: 'none',
          satAtDeskId: null, // Stand up
          isLiningUp: false
      }));
      // Reset position slightly
      playerRef.current = { x: 730, y: 200 }; // Next to bed
      facingRef.current = 'down';

      // Reset Playground NPCs
      const playground = MAPS['playground'];
      const classStudents = MAPS['classroom'].entities.filter(e => e.id.startsWith('student_'));
      // Remove class students from playground, restore random logic
      playground.entities = playground.entities.filter(e => !e.id.startsWith('student_') && e.id !== 'teacher_pe');
      // Add back random kids (simplified logic: just rely on render loop to respawn them next frame or keep them if they exist)
  };

  const handleWakeUpDismiss = () => {
      setGameState(prev => ({ ...prev, isMorningWakeUp: false, dialogue: { speaker: '旁白', text: '新的一天开始了，去教室上课吧！' } }));
  };

  const handleStartClass = async () => {
      const teacherName = TEACHERS[gameState.currentLesson].name;
      const lessonName = TEACHERS[gameState.currentLesson].subject;
      
      let text = `同学们好，现在开始上${lessonName}课。请认真听讲。`;
      if (gameState.currentLesson === 'PE') {
          text = "大家跟着我一起做运动！一二三四，二二三四...";
      }

      setGameState(prev => ({
          ...prev,
          isClassStarted: true,
          dialogue: { speaker: teacherName, text }
      }));
  };

  const startLineUp = () => {
      setGameState(prev => ({
          ...prev,
          isLiningUp: true,
          satAtDeskId: null, // Force stand up
          dialogue: { speaker: '李老师', text: '现在全班在走道排成两队！找到空位站好，我们去操场。' }
      }));

      const students = mapRef.current.entities.filter(e => e.id.startsWith('student_'));
      let leftColCount = 0;
      let rightColCount = 0;
      
      students.forEach((student, i) => {
          let isLeft = i % 2 === 0;
          let row = isLeft ? leftColCount : rightColCount;
          if (isLeft && leftColCount === 2) { leftColCount++; row++; }
          const tx = isLeft ? 460 : 540;
          const ty = 200 + row * 40;
          if (isLeft) leftColCount++; else rightColCount++;
          npcStateRef.current.set(student.id, { target: { x: tx, y: ty }, timer: 0 });
      });
  };

  const handleEndClass = () => {
      if (gameState.currentLesson === 'PE') {
          setGameState(prev => ({
              ...prev,
              isClassStarted: false,
              isSchoolOver: true,
              schoolOverTime: Date.now(), // Start Curfew Timer
              dialogue: { speaker: '旁白', text: '体育课结束了，放学啦！大家可以去小卖部买点东西，然后回宿舍。' }
          }));
          
          const students = mapRef.current.entities.filter(e => e.id.startsWith('student_'));
          students.forEach((st, i) => {
             const behavior = Math.random() > 0.5 ? 'exit' : 'stay';
             npcStateRef.current.set(st.id, { target: null, timer: 0, behavior });
          });
          return;
      }

      setGameState(prev => ({ ...prev, quiz: null, dialogue: null, isTeacherTransitioning: true }));
      const currentTeacherId = TEACHERS[gameState.currentLesson].id;
      const doorPos = { x: 50, y: 300 };
      const teacherEnt = mapRef.current.entities.find(e => e.id === currentTeacherId);
      if (teacherEnt) npcStateRef.current.set(currentTeacherId, { target: doorPos, timer: 0 });

      setTimeout(() => {
          mapRef.current.entities = mapRef.current.entities.filter(e => e.id !== currentTeacherId);
          let nextLesson: any = 'Chinese';
          if (gameState.currentLesson === 'Chinese') nextLesson = 'Math';
          else if (gameState.currentLesson === 'Math') nextLesson = 'English';
          else if (gameState.currentLesson === 'English') nextLesson = 'PE';
          
          const nextTeacherInfo = TEACHERS[nextLesson as keyof typeof TEACHERS];
          const newTeacher: Entity = {
              id: nextTeacherInfo.id,
              type: EntityType.NPC,
              subtype: 'adult',
              pos: { x: 50, y: 300 },
              size: 25,
              color: nextTeacherInfo.color,
              name: nextTeacherInfo.name,
              facing: 'right'
          };
          mapRef.current.entities.push(newTeacher);

          setGameState(prev => ({
              ...prev,
              currentLesson: nextLesson,
              isClassStarted: false,
              isTeacherTransitioning: false,
              dialogue: nextLesson === 'PE' 
                ? { speaker: '旁白', text: '李老师拿着跳绳走进来了。' }
                : { speaker: '旁白', text: '下课休息一会，下一节课马上开始...' }
          }));

          npcStateRef.current.set(nextTeacherInfo.id, { target: { x: 500, y: 100 }, timer: 0 });
          if (nextLesson === 'PE') setTimeout(() => startLineUp(), 3000);
      }, 4000);
  };

  // --- DRAWING HELPERS ---

  const drawBuilding = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
      // Use existing draw code...
      const w = 600; const h = 300; const baseX = x - w/2; const baseY = y - h + 20;
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(baseX + 10, baseY + h - 10, w, 20);
      ctx.fillStyle = '#E5E5E5'; ctx.fillRect(baseX, baseY, w, h);
      ctx.fillStyle = '#B91C1C'; ctx.beginPath(); ctx.moveTo(baseX - 20, baseY); ctx.lineTo(baseX + w + 20, baseY); ctx.lineTo(baseX + w/2, baseY - 60); ctx.fill();
      ctx.fillStyle = '#60A5FA'; 
      for(let row=0; row<2; row++) { for(let col=0; col<5; col++) { if (col === 2 && row === 1) continue; ctx.fillRect(baseX + 40 + col * 110, baseY + 50 + row * 100, 80, 60); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.strokeRect(baseX + 40 + col * 110, baseY + 50 + row * 100, 80, 60); } }
      const doorW = 80; const doorH = 100; const doorX = baseX + w/2 - doorW/2; const doorY = baseY + h - doorH;
      ctx.fillStyle = '#4B2A10'; ctx.fillRect(doorX, doorY, doorW, doorH);
      ctx.fillStyle = '#374151'; ctx.fillRect(baseX + w/2 - 100, baseY + 20, 200, 30);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 16px "Microsoft YaHei", sans-serif'; ctx.fillText('阳光小学', baseX + w/2, baseY + 42);
  };

  const drawDormitory = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
      // Use existing draw code...
      const w = 200; const h = 250; const baseX = x - w/2; const baseY = y - h + 20;
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(baseX + 10, baseY + h - 10, w, 20);
      ctx.fillStyle = '#FDE68A'; ctx.fillRect(baseX, baseY, w, h);
      ctx.fillStyle = '#1E40AF'; ctx.beginPath(); ctx.moveTo(baseX - 10, baseY); ctx.lineTo(baseX + w + 10, baseY); ctx.lineTo(baseX + w/2, baseY - 40); ctx.fill();
      ctx.fillStyle = '#93C5FD'; for(let i=0; i<3; i++) { ctx.fillRect(baseX + 20, baseY + 30 + i*70, w-40, 40); ctx.strokeStyle = '#60A5FA'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(baseX+20, baseY+50+i*70); ctx.lineTo(baseX+w-20, baseY+50+i*70); ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 12px "Microsoft YaHei", sans-serif'; ctx.fillText('学生宿舍', baseX + w/2, baseY - 10);
  };

  const drawStore = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
      const w = 150; const h = 120;
      const baseX = x - w/2; const baseY = y - h + 20;
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(baseX + 10, baseY + h - 10, w, 20);
      ctx.fillStyle = '#FEF2F2'; ctx.fillRect(baseX, baseY, w, h);
      const awningH = 30;
      ctx.fillStyle = '#EF4444';
      ctx.beginPath(); ctx.moveTo(baseX - 10, baseY); ctx.lineTo(baseX + w + 10, baseY); ctx.lineTo(baseX + w + 10, baseY + awningH); ctx.lineTo(baseX - 10, baseY + awningH); ctx.fill();
      ctx.fillStyle = '#fff';
      for(let i=0; i<7; i++) { ctx.fillRect(baseX - 10 + i * 25, baseY, 12, awningH); }
      ctx.fillStyle = '#9CA3AF'; ctx.fillRect(baseX + 20, baseY + 40, w - 40, h - 50);
      ctx.fillStyle = '#374151'; ctx.fillRect(baseX + 25, baseY + 45, w - 50, h - 60);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Microsoft YaHei"'; ctx.textAlign = 'center';
      ctx.fillText('小卖部', baseX + w/2, baseY - 5);
      ctx.fillText('收银台', baseX + w/2, baseY + 80);
  };

  const drawBunkBed = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
      const w = 60; const h = 100;
      ctx.fillStyle = color;
      // Base Bed
      ctx.fillRect(x - w/2, y - h/2 + 20, w, h-20);
      // Top Bed posts
      ctx.fillStyle = '#475569';
      ctx.fillRect(x - w/2, y - h/2 - 40, 5, h + 40);
      ctx.fillRect(x + w/2 - 5, y - h/2 - 40, 5, h + 40);
      // Top Bunk Frame
      ctx.fillStyle = color;
      ctx.fillRect(x - w/2, y - h/2 - 40, w, 30);
      // Ladder
      ctx.fillStyle = '#94A3B8';
      const lx = x + w/2 + 2;
      ctx.fillRect(lx, y - h/2 - 40, 5, h + 40);
      for(let i=0; i<5; i++) {
          ctx.fillRect(lx - 10, y - h/2 - 30 + i*20, 15, 3);
      }
      // Pillow details
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - w/2 + 5, y - h/2 + 25, 40, 15); // Bottom
      ctx.fillRect(x - w/2 + 5, y - h/2 - 35, 40, 15); // Top
  };

  const drawTable = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, isDesk?: boolean) => {
      // Big rectangle table
      ctx.fillStyle = color;
      const w = isDesk ? 100 : 120;
      ctx.fillRect(x - w/2, y - 40, w, 80);
      // Wood texture
      ctx.strokeStyle = '#451a03'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x-w/2, y); ctx.lineTo(x+w/2, y); ctx.stroke();
      if (!isDesk) {
          // Homework books on table
          ctx.fillStyle = '#fff'; ctx.fillRect(x - 40, y - 20, 20, 15);
          ctx.fillStyle = '#eee'; ctx.fillRect(x + 20, y + 10, 20, 15);
      } else {
          // Computer Monitor for RA Desk
          ctx.fillStyle = '#111'; ctx.fillRect(x - 30, y - 30, 40, 25);
          ctx.fillStyle = '#333'; ctx.fillRect(x - 20, y - 5, 20, 5); ctx.fillRect(x - 30, y, 40, 5); // Stand
      }
  };

  const drawWindow = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
      ctx.fillStyle = '#93C5FD';
      ctx.fillRect(x, y, 60, 60);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.strokeRect(x, y, 60, 60);
      ctx.beginPath(); ctx.moveTo(x + 30, y); ctx.lineTo(x + 30, y + 60); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + 30); ctx.lineTo(x + 60, y + 30); ctx.stroke();
      // Light ray
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath(); ctx.moveTo(x, y+60); ctx.lineTo(x+60, y+60); ctx.lineTo(x+80, y+150); ctx.lineTo(x-20, y+150); ctx.fill();
  };

  const drawWallBlock = (ctx: CanvasRenderingContext2D, wall: {x: number, y: number, w: number, h: number}) => {
      const h3d = 40; 
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(wall.x, wall.y + wall.h - 10, wall.w, 20);
      ctx.fillStyle = '#4B5563'; ctx.fillRect(wall.x, wall.y - h3d + wall.h, wall.w, h3d);
      ctx.fillStyle = '#6B7280'; ctx.fillRect(wall.x, wall.y - h3d, wall.w, wall.h);
      ctx.strokeStyle = '#374151'; ctx.lineWidth = 1; ctx.strokeRect(wall.x, wall.y - h3d, wall.w, wall.h); ctx.strokeRect(wall.x, wall.y - h3d + wall.h, wall.w, h3d);
  };

  const drawHoop = (ctx: CanvasRenderingContext2D, x: number, y: number, facingLeft: boolean) => {
      ctx.fillStyle = '#9CA3AF'; ctx.fillRect(x - 2, y - 80, 4, 80);
      ctx.fillStyle = '#fff'; ctx.fillRect(facingLeft ? x - 30 : x, y - 90, 30, 20);
      ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2; ctx.strokeRect(facingLeft ? x - 30 : x, y - 90, 30, 20);
      ctx.strokeStyle = '#F97316'; ctx.beginPath(); ctx.moveTo(facingLeft ? x - 25 : x + 5, y - 75); ctx.lineTo(facingLeft ? x - 5 : x + 25, y - 75); ctx.stroke();
  };

  const drawBackpack = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
      ctx.fillStyle = '#BE185D'; ctx.beginPath(); ctx.roundRect(x - 10, y - 10, 20, 20, 5); ctx.fill();
      ctx.fillStyle = '#9D174D'; ctx.beginPath(); ctx.roundRect(x - 10, y - 10, 20, 8, 2); ctx.fill();
      ctx.fillStyle = '#FCD34D'; ctx.fillRect(x - 2, y - 2, 4, 4);
  };

  // ... (Keep existing drawAnimal, drawCourt, drawSprite) ...
  const drawAnimal = (ctx: CanvasRenderingContext2D, type: EntityType, x: number, y: number, color: string, isMoving: boolean, frame: number, facing: 'left' | 'right' | 'up' | 'down') => {
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(0, 5, 8, 4, 0, 0, Math.PI*2); ctx.fill();
      if (type === EntityType.DOG) {
          ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI*2); ctx.fill();
          const hx = facing === 'left' ? -8 : (facing === 'right' ? 8 : 0); const hy = facing === 'up' ? -5 : (facing === 'down' ? 5 : -4);
          ctx.beginPath(); ctx.arc(hx, hy, 7, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#78350F'; ctx.beginPath(); ctx.arc(hx-3, hy-4, 3, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(hx+3, hy-4, 3, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(facing==='left'?8:-8, -2); ctx.lineTo(facing==='left'?15:-15, -8 + Math.sin(frame*0.5)*5); ctx.stroke();
      } else if (type === EntityType.CAT) {
          ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(0, -8, 6, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.moveTo(-4,-12); ctx.lineTo(-2,-16); ctx.lineTo(0,-12); ctx.fill(); ctx.beginPath(); ctx.moveTo(4,-12); ctx.lineTo(2,-16); ctx.lineTo(0,-12); ctx.fill();
          ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 5); ctx.quadraticCurveTo(8, 5, 8, -5); ctx.stroke();
      } else if (type === EntityType.BIRD) {
          const jump = isMoving ? Math.abs(Math.sin(frame))*10 : 0; ctx.translate(0, -jump);
          ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, 6, 4, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#F59E0B'; const bx = facing === 'left' ? -6 : 6; ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(facing==='left'?bx-3:bx+3, 1); ctx.lineTo(bx, 2); ctx.fill();
          if (isMoving) { ctx.fillStyle = '#93C5FD'; ctx.beginPath(); ctx.ellipse(0, -4, 6, 2, 0, 0, Math.PI*2); ctx.fill(); }
      }
      ctx.restore();
  };

  const drawCourt = (ctx: CanvasRenderingContext2D) => {
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 4;
      const cx = 700; const cy = 700; const w = 1000; const h = 500;
      ctx.strokeRect(cx - w/2, cy - h/2, w, h); ctx.beginPath(); ctx.arc(cx, cy, 60, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - h/2); ctx.lineTo(cx, cy + h/2); ctx.stroke();
      ctx.strokeRect(cx - w/2, cy - 60, 150, 120); ctx.strokeRect(cx + w/2 - 150, cy - 60, 150, 120);
  };

  const drawSprite = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, subtype: 'adult' | 'child' | 'player', isMoving: boolean, frame: number, facing: 'left' | 'right' | 'up' | 'down', isPlayer: boolean = false, entityId: string = '', behavior?: string, forceGymnastics: boolean = false) => {
      ctx.save(); ctx.translate(x, y);
      const scale = subtype === 'adult' ? 1.3 : 1.0; ctx.scale(scale, scale);
      let bounce = isMoving ? Math.sin(frame) * 3 : 0;
      
      const isGymnastics = (gameState.currentLesson === 'PE' && gameState.isClassStarted && gameState.currentMapId === 'playground' && (subtype === 'child' || isPlayer)) || forceGymnastics;
      
      // Override uniforms if doing gymnastics
      let drawColor = color;
      if (isGymnastics) {
          drawColor = '#2563EB'; // Blue Uniform
          bounce = Math.abs(Math.sin(Date.now() / 150)) * 15; // Global sync
          ctx.translate(0, -bounce);
      } else { 
          ctx.translate(0, -25 + bounce); 
      }
      
      // Sleeping Rotation
      if (behavior === 'sleep' || (isPlayer && gameState.isNight)) {
          ctx.rotate(Math.PI / 2);
          ctx.translate(10, -10);
      }

      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(0, 25, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
      let teacherVisual = null;
      if (subtype === 'adult') { const t = Object.values(TEACHERS).find(t => t.id === entityId); if (t) teacherVisual = t.visual; }

      ctx.strokeStyle = drawColor; 
      if (teacherVisual?.outfit === 'sport' || teacherVisual?.outfit === 'sport_male') ctx.strokeStyle = '#16A34A'; else if (teacherVisual?.outfit === 'skirt') ctx.strokeStyle = '#FDE68A';
      
      // Uniform Override check
      if (isGymnastics) ctx.strokeStyle = '#2563EB';

      ctx.lineWidth = 5; ctx.lineCap = 'round';
      if (teacherVisual?.outfit === 'sport_male') { ctx.fillStyle = '#16A34A'; ctx.fillRect(-6, 8, 5, 8); ctx.fillRect(1, 8, 5, 8); ctx.strokeStyle = '#FDE68A'; }
      
      ctx.beginPath();
      if (isGymnastics && bounce > 5) { ctx.moveTo(-4, 10); ctx.lineTo(-10, 25); ctx.moveTo(4, 10); ctx.lineTo(10, 25); } 
      else if (behavior === 'study' || (isPlayer && gameState.homeworkStatus === 'doing')) { ctx.moveTo(-4, 10); ctx.lineTo(-4, 20); ctx.moveTo(4, 10); ctx.lineTo(4, 20); } // Sitting
      else { ctx.moveTo(-4, 10); ctx.lineTo(-4 + Math.sin(frame) * 5, 25); ctx.moveTo(4, 10); ctx.lineTo(4 - Math.sin(frame) * 5, 25); }
      ctx.stroke();

      ctx.fillStyle = drawColor;
      if (isGymnastics) { 
           // Uniform Shirt
           ctx.fillStyle = '#2563EB'; 
           ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(10, -5); ctx.lineTo(12, 15); ctx.lineTo(-12, 15); ctx.fill();
           // White stripe
           ctx.fillStyle = '#FFF'; ctx.fillRect(-8, 0, 16, 4);
      } else {
          if (teacherVisual?.outfit === 'skirt') { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(-10, 10); ctx.lineTo(10, 10); ctx.lineTo(15, 20); ctx.lineTo(-15, 20); ctx.fill(); ctx.fillStyle = '#fff'; }
          ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(10, -5); ctx.lineTo(12, 15); ctx.lineTo(-12, 15); ctx.fill();
          if (teacherVisual?.outfit === 'apron') { ctx.fillStyle = '#111'; ctx.fillRect(-8, -2, 16, 18); ctx.strokeStyle = '#111'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(-8,0); ctx.lineTo(-10,-5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(10,-5); ctx.stroke(); }
      }

      const skinColor = '#FDE68A'; ctx.fillStyle = skinColor; ctx.beginPath(); ctx.arc(0, -12, 10, 0, Math.PI * 2); ctx.fill();
      const hairColor = teacherVisual?.hair === 'curly_brown' ? '#8B4513' : (isPlayer ? '#2D2D2D' : '#111'); 

      if (facing === 'up') {
          ctx.fillStyle = hairColor;
          if (teacherVisual?.hair === 'curly_brown') { ctx.beginPath(); ctx.arc(0, -12, 12, 0, Math.PI*2); ctx.fill(); for(let i=0; i<6; i++) { ctx.beginPath(); ctx.arc(-10+i*4, -8, 5, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(-10+i*4, -14, 5, 0, Math.PI*2); ctx.fill(); } } 
          else if (teacherVisual?.hair === 'short_black' || teacherVisual?.hair === 'short_black_male') { ctx.beginPath(); ctx.arc(0, -14, 11, Math.PI, 0); ctx.fill(); ctx.fillRect(-11, -14, 22, 12); } 
          else if (isPlayer) { ctx.beginPath(); ctx.arc(0, -12, 11, 0, Math.PI*2); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#2D2D2D'; const sway = Math.sin(frame) * 5; ctx.beginPath(); ctx.moveTo(-6, -5); ctx.quadraticCurveTo(-12, 10, -8 + sway, 30); ctx.stroke(); ctx.beginPath(); ctx.moveTo(6, -5); ctx.quadraticCurveTo(12, 10, 8 + sway, 30); ctx.stroke(); } 
          else { ctx.beginPath(); ctx.moveTo(-10, -12); ctx.lineTo(-12, 20); ctx.lineTo(12, 20); ctx.lineTo(10, -12); ctx.fill(); ctx.beginPath(); ctx.arc(0, -12, 10, Math.PI, 0); ctx.fill(); }
      } else {
          const eyeOff = facing === 'down' ? 3 : (facing === 'right' ? 4 : -4);
          if (facing === 'down') { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-3, -14, 1.5, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(3, -14, 1.5, 0, Math.PI*2); ctx.fill(); } 
          else { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(eyeOff, -14, 1.5, 0, Math.PI*2); ctx.fill(); }
          ctx.fillStyle = hairColor;
          if (teacherVisual?.hair === 'curly_brown') { ctx.beginPath(); ctx.arc(0, -15, 12, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.arc(-10, -12, 4, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(10, -12, 4, 0, Math.PI*2); ctx.fill(); } 
          else if (teacherVisual?.hair === 'short_black_male') { ctx.beginPath(); ctx.arc(0, -16, 11, Math.PI, 0); ctx.fill(); ctx.fillRect(-11, -16, 22, 6); } 
          else { ctx.beginPath(); ctx.arc(0, -15, 11, Math.PI, 0); ctx.lineTo(10, -10); ctx.lineTo(-10, -10); ctx.fill(); }
          if (isPlayer && facing !== 'down') { ctx.lineWidth = 4; ctx.strokeStyle = '#2D2D2D'; const side = facing === 'right' ? 1 : -1; const sway = Math.sin(frame) * 5; ctx.beginPath(); ctx.moveTo(9*side, -10); ctx.quadraticCurveTo(16*side, 0, 14*side + sway, 25); ctx.stroke(); ctx.fillStyle = '#EC4899'; ctx.beginPath(); ctx.arc(14*side + sway, 26, 3, 0, Math.PI*2); ctx.fill(); } 
          else if (isPlayer && facing === 'down') { ctx.lineWidth = 4; ctx.strokeStyle = '#2D2D2D'; const sway = Math.sin(frame) * 3; ctx.beginPath(); ctx.moveTo(-9, -10); ctx.quadraticCurveTo(-14, 5, -12 + sway, 25); ctx.stroke(); ctx.beginPath(); ctx.moveTo(9, -10); ctx.quadraticCurveTo(14, 5, 12 - sway, 25); ctx.stroke(); ctx.fillStyle = '#EC4899'; ctx.beginPath(); ctx.arc(-12 + sway, 26, 3, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#EC4899'; ctx.beginPath(); ctx.arc(12 - sway, 26, 3, 0, Math.PI*2); ctx.fill(); }
      }

      if (isGymnastics) { ctx.strokeStyle = '#2563EB'; ctx.lineWidth = 3; const armAngle = Math.sin(Date.now() / 100) * 1.5; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-20, -10 + armAngle * 10); ctx.stroke(); ctx.moveTo(10, 0); ctx.lineTo(20, -10 + armAngle * 10); ctx.stroke(); } 
      else if (gameState.currentLesson === 'PE' && (isPlayer || subtype === 'child')) { ctx.strokeStyle = '#F0ABFC'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, 5); ctx.quadraticCurveTo(0, 30, 10, 5); ctx.stroke(); }
      ctx.restore();
  }

  const render = () => {
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return;
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; ctx.imageSmoothingEnabled = false; }
    const map = mapRef.current; const player = playerRef.current;

    map.entities.forEach(ent => {
        // ... (Keep existing Movement Logic) ...
        if (ent.id.startsWith('teacher_') && npcStateRef.current.has(ent.id)) {
            let state = npcStateRef.current.get(ent.id)!;
            if (state.target) {
                const dx = state.target.x - ent.pos.x; const dy = state.target.y - ent.pos.y; const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 5) state.target = null; else { const speed = TEACHER_SPEED; if (Math.abs(dx) > Math.abs(dy)) ent.facing = dx > 0 ? 'right' : 'left'; else ent.facing = dy > 0 ? 'down' : 'up'; ent.pos.x += (dx/dist) * speed; ent.pos.y += (dy/dist) * speed; }
            }
            return;
        }
        if (gameState.isLiningUp && ent.id.startsWith('student_') && npcStateRef.current.has(ent.id)) {
             let state = npcStateRef.current.get(ent.id)!;
             if (state.target) {
                const dx = state.target.x - ent.pos.x; const dy = state.target.y - ent.pos.y; const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist > 2) { ent.facing = dy > 0 ? 'down' : (dy < 0 ? 'up' : (dx>0?'right':'left')); ent.pos.x += (dx/dist) * 2; ent.pos.y += (dy/dist) * 2; } else ent.facing = 'down';
             }
             return;
        }
        if (gameState.isSchoolOver && ent.id.startsWith('student_') && npcStateRef.current.has(ent.id) && map.id === 'playground') {
            let state = npcStateRef.current.get(ent.id)!;
            if (state.behavior === 'exit') {
                const tx = 700; const ty = 1250; const dx = tx - ent.pos.x; const dy = ty - ent.pos.y; const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist > 5) { ent.facing = dy > 0 ? 'down' : (dy < 0 ? 'up' : (dx>0?'right':'left')); ent.pos.x += (dx/dist) * NPC_SPEED; ent.pos.y += (dy/dist) * NPC_SPEED; } else ent.pos.x = -9999;
                return;
            }
        }
        if (['NPC', 'DOG', 'CAT', 'BIRD'].includes(ent.type) && map.id === 'playground') {
             if (ent.id === 'guard' || ent.id.startsWith('teacher_') || (ent.id.startsWith('student_') && !gameState.isSchoolOver)) return;
             let state = npcStateRef.current.get(ent.id) || { target: null, timer: 0 };
             const chance = ent.type === 'BIRD' ? 0.05 : 0.01;
             if (!state.target && Math.random() < chance) state.target = { x: 200 + Math.random() * 1000, y: 600 + Math.random() * 400 };
             if (state.target) {
                 const dx = state.target.x - ent.pos.x; const dy = state.target.y - ent.pos.y; const dist = Math.sqrt(dx*dx + dy*dy);
                 if (dist < 5) state.target = null; else { const speed = ['DOG', 'CAT'].includes(ent.type) ? ANIMAL_SPEED : NPC_SPEED; if (Math.abs(dx) > Math.abs(dy)) ent.facing = dx > 0 ? 'right' : 'left'; else ent.facing = dy > 0 ? 'down' : 'up'; ent.pos.x += (dx/dist) * speed; ent.pos.y += (dy/dist) * speed; }
             }
             npcStateRef.current.set(ent.id, state);
        }
    });

    let isMoving = false;
    if (targetRef.current && !gameState.satAtDeskId && !gameState.quiz && !gameState.isNight) {
        const dx = targetRef.current.x - player.x; const dy = targetRef.current.y - player.y; const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > PLAYER_SPEED) {
            isMoving = true; walkFrameRef.current += 0.2; 
            if (Math.abs(dx) > Math.abs(dy)) facingRef.current = dx > 0 ? 'right' : 'left'; else facingRef.current = dy > 0 ? 'down' : 'up';
            const nextX = player.x + (dx / dist) * PLAYER_SPEED; const nextY = player.y + (dy / dist) * PLAYER_SPEED;
            if (!checkCollision({x: nextX, y: player.y}, map)) player.x = nextX; if (!checkCollision({x: player.x, y: nextY}, map)) player.y = nextY;
            for (const ent of map.entities) { if (ent.type === EntityType.PORTAL) { const edx = ent.pos.x - player.x; const edy = ent.pos.y - player.y; if (Math.sqrt(edx*edx + edy*edy) < (ent.size + 15)) { interact(ent); return; } } }
            if (gameState.isLiningUp) { 
                const spotX = 460; const spotY = 280; 
                if (Math.abs(player.x - spotX) < 20 && Math.abs(player.y - spotY) < 20) { 
                    setGameState(prev => ({ ...prev, isLiningUp: false, dialogue: { speaker: '李老师', text: '好，大家排得很好！我们现在去操场。' } })); 
                    targetRef.current = null; 
                    setTimeout(() => { 
                        const baseEnts = MAPS['playground'].entities.filter(e => !e.id.startsWith('c') && !e.id.startsWith('student_')); 
                        const classroomStudents = MAPS['classroom'].entities.filter(e => e.id.startsWith('student_')); 
                        
                        // Separate Leaders (Fangfang, Lili, Nana, Jingjing)
                        const leaderNames = ['芳芳', '丽丽', '娜娜', '静静'];
                        const leaders = classroomStudents.filter(st => leaderNames.includes(st.name || ''));
                        const others = classroomStudents.filter(st => !leaderNames.includes(st.name || ''));

                        // Place Leaders (Front Row, facing students/down)
                        leaders.forEach((st, i) => {
                             const newSt = { ...st, pos: { x: 550 + i * 100, y: 520 }, facing: 'down' as const };
                             baseEnts.push(newSt);
                        });

                        // Place Others (Grid behind leaders, facing Teacher/Up)
                        others.forEach((st, i) => { 
                            const row = Math.floor(i / 6); const col = i % 6; 
                            const newSt = { ...st, pos: { x: 450 + col * 80, y: 600 + row * 80 }, facing: 'up' as const }; 
                            baseEnts.push(newSt); 
                        }); 

                        const peTeacher = TEACHERS['PE']; 
                        baseEnts.push({ id: peTeacher.id, type: EntityType.NPC, subtype: 'adult', pos: { x: 700, y: 450 }, size: 25, color: peTeacher.color, name: peTeacher.name, facing: 'down' }); 
                        
                        MAPS['playground'].entities = baseEnts; 
                        mapRef.current = MAPS['playground']; 
                        playerRef.current = { x: 700, y: 900 }; 
                        setGameState(prev => ({ ...prev, currentMapId: 'playground', playerPos: { x: 700, y: 900 }, targetPos: null, dialogue: { speaker: '李老师', text: '大家拿好跳绳，准备开始运动！' } })); 
                    }, 2000); 
                } 
            }
        } else targetRef.current = null;
    }

    const camX = Math.max(0, Math.min(map.width - canvas.width, player.x - canvas.width / 2)); const camY = Math.max(0, Math.min(map.height - canvas.height, player.y - canvas.height / 2)); const finalCamX = map.width < canvas.width ? -(canvas.width - map.width)/2 : camX; const finalCamY = map.height < canvas.height ? -(canvas.height - map.height)/2 : camY;

    ctx.fillStyle = '#111827'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.translate(-finalCamX, -finalCamY);
    ctx.fillStyle = map.backgroundColor; ctx.fillRect(0, 0, map.width, map.height);
    if (map.id === 'playground') drawCourt(ctx);
    if (gameState.isLiningUp) { ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; ctx.beginPath(); ctx.arc(460, 280, 20, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = '#FCD34D'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(460, 280, 20, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]); }
    ctx.strokeStyle = 'rgba(0,0,0,0.05)'; ctx.beginPath(); for(let i=0; i<map.width; i+=40) { ctx.moveTo(i,0); ctx.lineTo(i, map.height); } for(let j=0; j<map.height; j+=40) { ctx.moveTo(0,j); ctx.lineTo(map.width, j); } ctx.stroke();

    const renderList: any[] = [...map.entities];
    map.walls.forEach((w, i) => { if (w.w === 600 && w.h === 100) return; if (w.w === 200 && w.h === 100) return; if (w.w === 150 && w.h === 80) return; renderList.push({ id: `wall_${i}`, type: EntityType.WALL, pos: { x: w.x, y: w.y + w.h }, data: w }); });
    const playerEntity: any = { id: 'player', type: EntityType.PLAYER, subtype: 'child', pos: player, size: 20, color: '#8B5CF6', facing: facingRef.current };
    renderList.push(playerEntity);
    renderList.sort((a, b) => a.pos.y - b.pos.y);

    // Calculate if player is in the formation area on the playground
    const isPlayerInFormation = map.id === 'playground' && gameState.currentLesson === 'PE' && gameState.isClassStarted && 
                               player.x > 400 && player.x < 1000 && player.y > 400 && player.y < 950;

    renderList.forEach(ent => {
        if (ent.type === EntityType.WALL) drawWallBlock(ctx, ent.data);
        else if (ent.type === EntityType.PORTAL) { if (ent.targetMap === 'classroom' && map.id === 'playground') return; if (ent.targetMap === 'dorm_hallway' && map.id === 'playground') return; ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(ent.pos.x, ent.pos.y, ent.size, ent.size/2, 0, 0, Math.PI*2); ctx.fill(); }
        else if (ent.type === EntityType.BUILDING) drawBuilding(ctx, ent.pos.x, ent.pos.y);
        else if (ent.type === EntityType.DORMITORY) drawDormitory(ctx, ent.pos.x, ent.pos.y);
        else if (ent.type === EntityType.STORE) drawStore(ctx, ent.pos.x, ent.pos.y);
        else if (ent.type === EntityType.HOOP) drawHoop(ctx, ent.pos.x, ent.pos.y, ent.pos.x < 700);
        else if (ent.type === EntityType.BACKPACK) drawBackpack(ctx, ent.pos.x, ent.pos.y);
        else if (ent.type === EntityType.BED) drawBunkBed(ctx, ent.pos.x, ent.pos.y, ent.color);
        else if (ent.type === EntityType.TABLE) drawTable(ctx, ent.pos.x, ent.pos.y, ent.color, ent.id === 'ra_desk');
        else if (ent.type === EntityType.WINDOW) drawWindow(ctx, ent.pos.x, ent.pos.y);
        else if (ent.type === EntityType.CHAIR || ent.type === EntityType.DESK) {
            ctx.fillStyle = ent.color; ctx.fillRect(ent.pos.x - 20, ent.pos.y - 10, 40, 25);
            ctx.fillStyle = '#78350F'; ctx.fillRect(ent.pos.x - 18, ent.pos.y + 15, 4, 10); ctx.fillRect(ent.pos.x + 14, ent.pos.y + 15, 4, 10);
            ctx.fillStyle = '#555'; ctx.fillRect(ent.pos.x - 10, ent.pos.y + 20, 20, 5); ctx.fillStyle = '#777'; ctx.fillRect(ent.pos.x - 12, ent.pos.y + 15, 24, 5);
        } else if (ent.type === EntityType.PLAYER) {
             const isSitting = !!gameState.satAtDeskId;
             // Force gymnastics if in formation area
             drawSprite(ctx, ent.pos.x, ent.pos.y, ent.color, 'player', isMoving, walkFrameRef.current, facingRef.current, true, '', '', isPlayerInFormation);
        } else if (ent.type === EntityType.NPC) {
            drawSprite(ctx, ent.pos.x, ent.pos.y, ent.color, ent.subtype || 'child', ent.type === EntityType.NPC && ent.subtype === 'child' && map.id === 'playground', walkFrameRef.current + parseInt(ent.id, 36) || 0, ent.facing || 'down', false, ent.id, ent.behavior);
            if (!ent.subtype || ent.subtype !== 'adult') { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(ent.pos.x - 30, ent.pos.y - 65, 60, 16, 4); ctx.fill(); ctx.fillStyle = '#FFF'; ctx.font = '10px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(ent.name || '', ent.pos.x, ent.pos.y - 53); }
        } else if (['DOG','CAT','BIRD'].includes(ent.type)) {
             drawAnimal(ctx, ent.type, ent.pos.x, ent.pos.y, ent.color, npcStateRef.current.get(ent.id)?.target != null, walkFrameRef.current * 2, ent.facing || 'right');
        }
    });

    ctx.restore();
    animationFrameRef.current = requestAnimationFrame(render);
  };

  useEffect(() => { animationFrameRef.current = requestAnimationFrame(render); return () => cancelAnimationFrame(animationFrameRef.current); }, [gameState.satAtDeskId, gameState.isBackpackOpen, gameState.isFriendListOpen, gameState.friends, gameState.quiz, gameState.isLiningUp, gameState.isClassStarted, gameState.isSchoolOver, gameState.homeworkStatus, gameState.isNight, gameState.currentMapId, gameState.currentLesson]); 

  // --- CONTROLS ---

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (gameState.isBackpackOpen || gameState.isFriendListOpen || gameState.isMorningWakeUp) return;
    if (gameState.isNight) return; // Disable clicks during night transition

    if (gameState.satAtDeskId) {
        if (!gameState.isClassStarted && gameState.homeworkStatus !== 'doing') {
             setGameState(prev => ({...prev, satAtDeskId: null, dialogue: null }));
        }
        return; 
    }

    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect(); const clickX = e.clientX - rect.left; const clickY = e.clientY - rect.top;
    const map = mapRef.current; const player = playerRef.current;
    const camX = Math.max(0, Math.min(map.width - canvas.width, player.x - canvas.width / 2)); const camY = Math.max(0, Math.min(map.height - canvas.height, player.y - canvas.height / 2)); const finalCamX = map.width < canvas.width ? -(canvas.width - map.width)/2 : camX; const finalCamY = map.height < canvas.height ? -(canvas.height - map.height)/2 : camY;
    const worldX = clickX + finalCamX; const worldY = clickY + finalCamY;

    let clickedEntity = null;
    for (const ent of map.entities) {
        if (ent.type === EntityType.BUILDING) { const dx = worldX - ent.pos.x; const dy = worldY - (ent.pos.y + 100); if (Math.abs(dx) < 100 && Math.abs(dy) < 100) clickedEntity = map.entities.find(e => e.type === EntityType.PORTAL); continue; }
        if (ent.type === EntityType.DORMITORY) { const dx = worldX - ent.pos.x; const dy = worldY - (ent.pos.y + 100); if (Math.abs(dx) < 80 && Math.abs(dy) < 80) clickedEntity = map.entities.find(e => e.id === 'portal_dorm_hall'); continue; }
        if (ent.type === EntityType.STORE) { const dx = worldX - ent.pos.x; const dy = worldY - (ent.pos.y + 40); if (Math.abs(dx) < 70 && Math.abs(dy) < 60) clickedEntity = ent; continue; }

        const dist = Math.sqrt(Math.pow(worldX - ent.pos.x, 2) + Math.pow(worldY - ent.pos.y, 2));
        const hitbox = ent.type === EntityType.BED ? 60 : 40;
        if (dist < hitbox) { clickedEntity = ent; break; }
    }

    if (clickedEntity) {
        const offsetY = clickedEntity.type === EntityType.DESK || clickedEntity.type === EntityType.CHAIR ? 0 : 35;
        targetRef.current = { x: clickedEntity.pos.x, y: clickedEntity.pos.y + offsetY };
        if (['NPC','DESK','CHAIR','BACKPACK','PORTAL','DOG','CAT','BIRD','BED','TABLE','STORE'].includes(clickedEntity.type)) { interact(clickedEntity); }
    } else {
        targetRef.current = { x: worldX, y: worldY }; setGameState(prev => ({ ...prev, dialogue: null })); 
    }
  };

  const getLessonColor = (lesson: string) => { switch(lesson) { case 'Chinese': return 'bg-red-600'; case 'Math': return 'bg-blue-600'; case 'English': return 'bg-black'; case 'PE': return 'bg-green-600'; default: return 'bg-gray-600'; } };
  const getLessonName = (lesson: string) => { switch(lesson) { case 'Chinese': return '语文'; case 'Math': return '数学'; case 'English': return '英语'; case 'PE': return '体育'; default: return lesson; } };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900 font-[Microsoft YaHei]">
      <canvas ref={canvasRef} onClick={handleCanvasClick} className="cursor-crosshair block" />
      
      {/* NIGHT OVERLAY */}
      <div className={`absolute inset-0 bg-black pointer-events-none transition-opacity duration-[3000ms] ${gameState.isNight ? 'opacity-100' : 'opacity-0'} z-50`}></div>

      {/* WAKE UP MODAL */}
      {gameState.isMorningWakeUp && (
          <div className="absolute inset-0 flex items-center justify-center z-[60] animate-fade-in-up">
              <button onClick={handleWakeUpDismiss} className="bg-yellow-400 text-yellow-900 p-8 rounded-2xl shadow-2xl border-b-8 border-yellow-600 active:border-b-0 active:translate-y-2 transform transition hover:scale-105">
                  <div className="text-6xl mb-4">☀️</div>
                  <h1 className="text-3xl font-bold mb-2">上课了！该起床了！</h1>
                  <p className="font-bold opacity-75">点击开始新的一天</p>
              </button>
          </div>
      )}

      {/* ... (Existing Modals: Friend List) ... */}
      {gameState.isFriendListOpen && (
          <div className="absolute bottom-20 left-6 z-50 animate-fade-in-up">
              <div className="bg-white/95 p-4 rounded-xl border-4 border-yellow-400 shadow-2xl min-w-[250px]">
                  <div className="flex justify-between items-center mb-3">
                      <h3 className="text-yellow-700 font-bold text-lg uppercase tracking-wider">我的好友</h3>
                      <button onClick={() => setGameState(prev => ({ ...prev, isFriendListOpen: false }))} className="text-gray-400 hover:text-red-500">✖</button>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                      {gameState.friends.length === 0 ? <div className="text-gray-400 italic text-sm text-center py-4">还没交到朋友呢。<br/>点击同学开始聊天吧！</div> : gameState.friends.map(f => <div key={f.id} className="flex items-center gap-3 bg-yellow-50 p-2 rounded-lg border border-yellow-100"><div className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[10px]" style={{backgroundColor: f.color}}>^_^</div><span className="font-bold text-slate-700">{f.name}</span></div>)}
                  </div>
              </div>
          </div>
      )}

      <div className="absolute bottom-6 left-6 z-40">
          <button onClick={() => setGameState(prev => ({ ...prev, isFriendListOpen: !prev.isFriendListOpen }))} className="group relative bg-yellow-400 text-yellow-900 px-6 py-4 rounded-2xl border-b-4 border-yellow-600 active:border-b-0 active:translate-y-1 shadow-xl hover:bg-yellow-300 transition-all">
              <div className="flex items-center gap-2"><span className="text-2xl">👥</span><div className="flex flex-col items-start"><span className="text-xs font-bold uppercase tracking-widest opacity-80">同学</span><span className="font-bold text-lg">找朋友</span></div></div>
              <div className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border-2 border-white">{gameState.friends.length}</div>
          </button>
      </div>

      {gameState.isBackpackOpen && (
          <div className="absolute top-20 right-6 z-50 flex flex-col gap-2 animate-fade-in-up">
              <div className="bg-white/90 p-4 rounded-xl border-2 border-pink-500 shadow-xl">
                  <h3 className="text-pink-600 font-bold mb-3 text-center uppercase text-sm tracking-wider">我的课本</h3>
                  <div className="flex flex-col gap-2">
                      <button onClick={() => handleBookSelect('Chinese')} className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 font-medium border border-red-200">语文书</button>
                      <button onClick={() => handleBookSelect('Math')} className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 font-medium border border-blue-200">数学书</button>
                      <button onClick={() => handleBookSelect('English')} className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 font-medium border border-green-200">英语书</button>
                      <button onClick={() => handleBookSelect('PE')} className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200 font-medium border border-emerald-200">跳绳</button>
                      {gameState.currentMapId === 'dorm_room' && (
                          <button onClick={() => handleBookSelect('Homework')} className="px-4 py-2 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 font-medium border border-purple-200 mt-2">📖 写作业</button>
                      )}
                  </div>
              </div>
          </div>
      )}
      
      {/* WRITE HOMEWORK ACTION BUTTON */}
      {gameState.dialogue?.text === '去书桌那里写作业吧。' && gameState.homeworkStatus === 'none' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-bounce">
              <button onClick={handleStartHomework} className="bg-purple-600 text-white text-xl font-bold px-8 py-4 rounded-xl shadow-2xl border-4 border-white hover:bg-purple-500">
                  ✍️ 开始写作业
              </button>
          </div>
      )}

      {/* Start Class Button (Classroom Only) */}
      {gameState.satAtDeskId && !gameState.isClassStarted && !gameState.isTeacherTransitioning && !gameState.isLiningUp && gameState.currentMapId === 'classroom' && (
           <div className="absolute bottom-40 right-6 z-50 animate-fade-in-up"><button onClick={handleStartClass} className="bg-indigo-600 text-white text-lg font-bold px-6 py-3 rounded-xl shadow-2xl border-b-4 border-indigo-800 hover:bg-indigo-500 active:border-b-0 active:translate-y-1 transition-all animate-bounce">🔔 开始上课</button></div>
      )}
      
      {/* End Class Button (Classroom AND Playground for PE) */}
      {gameState.isClassStarted && (gameState.currentMapId === 'classroom' || (gameState.currentMapId === 'playground' && gameState.currentLesson === 'PE')) && (
           <div className="absolute bottom-40 right-6 z-50 animate-fade-in-up"><button onClick={handleEndClass} className="bg-red-600 text-white text-lg font-bold px-6 py-3 rounded-xl shadow-2xl border-b-4 border-red-800 hover:bg-red-500 active:border-b-0 active:translate-y-1 transition-all">🏁 下课</button></div>
      )}

      {gameState.dialogue && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-50 pointer-events-none">
          <div className="bg-white/95 border-4 border-slate-800 rounded-xl p-6 shadow-2xl animate-fade-in-up pointer-events-auto">
             <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></div><div className="text-indigo-900 font-bold uppercase text-xs tracking-wider">{gameState.dialogue.speaker}</div></div>
             <div className="text-slate-900 text-xl font-medium font-serif leading-relaxed">"{gameState.dialogue.text}"</div>
             <div className="mt-4 text-right text-xs text-gray-500 font-bold tracking-widest uppercase">点击其他地方关闭</div>
          </div>
        </div>
      )}

      <div className="absolute top-6 left-6 z-40 pointer-events-none">
         <div className="bg-slate-900/90 text-white px-6 py-3 rounded-full border-2 border-slate-700 shadow-lg backdrop-blur flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-green-500"></span><h1 className="font-bold text-sm tracking-widest uppercase">{MAPS[gameState.currentMapId].name}</h1></div>
      </div>

      {(gameState.currentMapId === 'classroom' || (gameState.currentMapId === 'playground' && gameState.currentLesson === 'PE')) && (
          <div className="absolute bottom-6 right-6 z-40 pointer-events-none">
               <div className={`text-white px-6 py-3 rounded-xl border-2 border-white/20 shadow-lg backdrop-blur flex flex-col items-center ${getLessonColor(gameState.currentLesson)}`}>
                  <span className="text-[10px] uppercase font-bold opacity-80 mb-1">当前课程</span><h2 className="font-bold text-xl">{getLessonName(gameState.currentLesson)}</h2>
                  {gameState.selectedBook && <span className="text-xs bg-black/20 px-2 py-1 rounded mt-2">📖 {gameState.selectedBook}</span>}
                  {gameState.isClassStarted && <div className="mt-2 text-xs font-bold animate-pulse text-yellow-300">上课中</div>}
                  {gameState.isLiningUp && <div className="mt-2 text-xs font-bold animate-pulse text-red-200 border border-white px-2 rounded">请排队!</div>}
               </div>
          </div>
      )}
      
      {gameState.isSchoolOver && !gameState.isNight && (
          <div className="absolute top-6 right-6 z-40 pointer-events-none">
              <div className="bg-orange-500 text-white px-8 py-4 rounded-xl border-4 border-orange-700 shadow-2xl animate-pulse"><h1 className="font-bold text-2xl tracking-widest uppercase">放学时间</h1></div>
          </div>
      )}
    </div>
  );
}