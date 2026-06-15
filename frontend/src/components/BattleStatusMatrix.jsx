import React from 'react';
import { useGame } from '../context/GameContext';

export const BattleStatusMatrix = () => {
  const { currentMatch } = useGame();

  if (!currentMatch) return null;

  const { problem } = currentMatch;

  const renderMarkdown = (text) => {
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-[#F9FAFB] font-bold text-lg font-sans tracking-wide mt-4 mb-2">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('#### ')) {
        return <h4 key={idx} className="text-[#F9FAFB] font-semibold text-sm font-sans tracking-wide mt-3 mb-1">{line.replace('#### ', '')}</h4>;
      }
      if (line.startsWith('* ')) {
        return <li key={idx} className="text-[#6B7280] text-sm ml-4 list-disc font-sans leading-relaxed">{line.replace('* ', '')}</li>;
      }
      if (line.startsWith('`') && line.endsWith('`') && !line.startsWith('```')) {
        return <code key={idx} className="bg-white/[0.05] border border-white/10 text-emerald-400 rounded px-1.5 py-0.5 text-xs font-mono">{line.replace(/`/g, '')}</code>;
      }
      if (line.startsWith('```')) {
        return null; 
      }
      
      if (line.includes('Input:') || line.includes('Output:') || line.includes('Explanation:')) {
        return (
          <pre key={idx} className="bg-white/[0.01] border border-white/10 rounded-xl p-3.5 text-xs text-blue-400 font-mono my-2 overflow-x-auto select-text leading-relaxed">
            {line}
          </pre>
        );
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }
      return <p key={idx} className="text-[#6B7280] text-sm font-sans leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {}
      <div className="relative flex-1 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6 overflow-y-auto max-h-[600px] shadow-[0_8px_30px_rgba(0,0,0,0.5)] select-text">
        {}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/35 to-transparent" />
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-white/10">
          <h2 className="text-[#F9FAFB] font-bold text-xl tracking-wide font-sans uppercase">
            {problem.title}
          </h2>
          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
            problem.difficulty === 'Easy' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
              : problem.difficulty === 'Medium' 
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' 
              : 'bg-red-500/10 border-red-500/30 text-red-500'
          }`}>
            {problem.difficulty}
          </span>
        </div>

        <div className="space-y-3">
          {renderMarkdown(problem.description)}
        </div>
      </div>
    </div>
  );
};

export default BattleStatusMatrix;
