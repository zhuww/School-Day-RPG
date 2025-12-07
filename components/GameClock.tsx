import React from 'react';

interface GameClockProps {
  time: Date;
  phase: string;
}

const GameClock: React.FC<GameClockProps> = ({ time, phase }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="absolute top-4 left-4 z-50 bg-white/90 border-2 border-slate-800 p-3 rounded-lg shadow-lg backdrop-blur-sm">
      <div className="flex flex-col items-center">
        <div className="text-3xl font-bold text-slate-900 pixel-font tracking-widest">
          {formatTime(time)}
        </div>
        <div className="text-xs font-bold text-indigo-600 uppercase mt-1 tracking-wide">
          {phase.replace('_', ' ')}
        </div>
      </div>
    </div>
  );
};

export default GameClock;
