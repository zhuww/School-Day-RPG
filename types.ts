
export type Point = {
  x: number;
  y: number;
};

export enum EntityType {
  PLAYER = 'PLAYER',
  NPC = 'NPC',
  PORTAL = 'PORTAL',
  DESK = 'DESK',
  WALL = 'WALL',
  HOOP = 'HOOP',
  BUILDING = 'BUILDING',
  DORMITORY = 'DORMITORY',
  STORE = 'STORE',
  BACKPACK = 'BACKPACK',
  CAT = 'CAT',
  DOG = 'DOG',
  BIRD = 'BIRD',
  BED = 'BED',
  TABLE = 'TABLE',
  CHAIR = 'CHAIR',
  WINDOW = 'WINDOW',
  SHELF = 'SHELF',
  FRIDGE = 'FRIDGE',
  SWIMMING_POOL = 'SWIMMING_POOL',
  POSTER = 'POSTER',
  PLANT = 'PLANT'
}

export interface Entity {
  id: string;
  type: EntityType;
  subtype?: 'adult' | 'child'; // To differentiate height/scale
  pos: Point;
  size: number;
  color: string;
  name?: string;
  persona?: string; // New: Fixed personality trait
  voiceName?: string; // New: Fixed voice for audio
  targetMap?: string; // For portals
  targetPos?: Point;  // For portals
  isOccupied?: boolean; // For desks/chairs
  facing?: 'left' | 'right' | 'up' | 'down'; // For sprite direction
  
  // NPC AI
  aiState?: 'idle' | 'moving' | 'exiting';
  aiTarget?: Point;
  aiTimer?: number;
  behavior?: 'exit' | 'stay' | 'sleep' | 'study'; // New behaviors for dorm

  visual?: {
    hair?: string;
    outfit?: string;
  };
}

export interface MapData {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  walls: { x: number; y: number; w: number; h: number }[];
  entities: Entity[];
  spawnPoint: Point;
}

export interface LogEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: string;
}

export interface Friend {
  id: string;
  name: string;
  color: string;
}

export interface Quiz {
  question: string;
  options: string[];
  correctAnswer: number; // Index 0-3
  userAnswer?: number;
  isCompleted: boolean;
}

export interface GameState {
  currentMapId: string;
  playerPos: Point;
  targetPos: Point | null; // Where the player is moving to
  isMoving: boolean;
  facing: 'left' | 'right' | 'up' | 'down';
  dialogue: { speaker: string; text: string } | null;
  satAtDeskId: string | null;
  currentLesson: 'Chinese' | 'Math' | 'English' | 'PE';
  selectedBook: string | null;
  isBackpackOpen: boolean;
  friends: Friend[];
  isFriendListOpen: boolean;
  isClassStarted: boolean;
  quiz: Quiz | null;
  isTeacherTransitioning: boolean;
  isLiningUp: boolean; // For PE class
  isSchoolOver: boolean;
  
  // Dorm / Night Cycle
  schoolOverTime: number | null; // Timestamp when school ended
  homeworkStatus: 'none' | 'doing' | 'done';
  isNight: boolean;
  isMorningWakeUp: boolean;
  isMorningQueue: boolean; // Morning queue for crowded stairs
}