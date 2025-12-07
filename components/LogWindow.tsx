import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface LogWindowProps {
  logs: LogEntry[];
  isThinking: boolean;
}

const LogWindow: React.FC<LogWindowProps> = ({ logs, isThinking }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, isThinking]);

  return (
    <div className="flex-1 bg-slate-900/80 p-4 overflow-y-auto rounded-lg border border-slate-700 shadow-inner min-h-[200px] max-h-[300px] md:max-h-full">
      <div className="space-y-4">
        {logs.map((log) => (
          <div key={log.id} className={`flex flex-col ${log.speaker === 'Player' ? 'items-end' : 'items-start'}`}>
            <span className={`text-xs mb-1 font-bold ${
              log.speaker === 'Player' ? 'text-indigo-300' : 
              log.speaker === 'Narrator' ? 'text-yellow-500' : 
              log.speaker === 'System' ? 'text-gray-400' : 'text-green-400'
            }`}>
              {log.speaker} <span className="text-gray-600 font-normal text-[10px]">({log.timestamp})</span>
            </span>
            <div className={`p-3 rounded-lg max-w-[90%] text-sm leading-relaxed ${
              log.speaker === 'Player' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : log.speaker === 'System'
                ? 'bg-gray-800 text-gray-300 border border-gray-700 italic'
                : 'bg-white text-slate-900 rounded-tl-none'
            }`}>
              {log.text}
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex flex-col items-start animate-pulse">
            <span className="text-xs mb-1 font-bold text-yellow-500">Narrator</span>
            <div className="bg-white/50 text-slate-900 p-3 rounded-lg rounded-tl-none text-sm">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default LogWindow;
