import React from 'react';
import { useGame } from '../context/GameContext';
import { motion } from 'framer-motion';

export const PostGameModal = () => {
  const { currentMatch, closeMatchModal } = useGame();

  if (!currentMatch) return null;
  if (currentMatch.status !== 'victory' && currentMatch.status !== 'defeat') return null;

  const isVictory = currentMatch.status === 'victory';

  const particles = Array.from({ length: 24 });

  const xpShift = currentMatch.xpChange !== undefined 
    ? (currentMatch.xpChange >= 0 ? `+${currentMatch.xpChange}` : `${currentMatch.xpChange}`)
    : (isVictory ? '+35' : '-15');
  const goldShift = currentMatch.goldCoinsChange !== undefined
    ? `+${currentMatch.goldCoinsChange}`
    : (isVictory ? '+25' : '+5');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      
      {}
      {isVictory && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((_, i) => {
            const angle = (i * 360) / particles.length;
            const distance = 100 + Math.random() * 200;
            const x = Math.cos((angle * Math.PI) / 180) * distance;
            const y = Math.sin((angle * Math.PI) / 180) * distance;

            return (
              <motion.div
                key={i}
                className="absolute left-1/2 top-1/2 w-2.5 h-2.5 rounded-full"
                style={{
                  background: i % 2 === 0 ? '#10B981' : '#2563EB',
                  boxShadow: '0 0 10px currentColor'
                }}
                initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                animate={{
                  x,
                  y,
                  scale: [1, 1.5, 0],
                  opacity: [1, 0.8, 0]
                }}
                transition={{
                  duration: 1.5,
                  ease: 'easeOut',
                  delay: Math.random() * 0.2
                }}
              />
            );
          })}
        </div>
      )}

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="relative bg-black/90 backdrop-blur-xl border border-white/10 rounded-3xl max-w-5xl w-full p-8 shadow-[0_8px_30px_rgba(0,0,0,0.5)] overflow-hidden"
      >
        {}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

        <div className="text-center mb-8 relative z-10">
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className={`inline-block font-sans text-4xl md:text-5xl font-extrabold tracking-wider uppercase mb-3 ${
              isVictory 
                ? 'text-[#10B981]' 
                : 'text-[#EF4444]'
            }`}
          >
            {isVictory ? '🎉 Victory! 🎉' : '💀 Defeat! 💀'}
          </motion.div>
          
          <p className="text-[#6B7280] text-sm max-w-md mx-auto leading-relaxed">
            Game finished! You can compare both solutions below:
          </p>
        </div>

        {}
        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-8 relative z-10">
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-center">
            <span className="block text-[10px] text-[#6B7280] uppercase tracking-wider">XP Gained</span>
            <span className={`text-xl font-bold ${isVictory ? 'text-emerald-500' : 'text-red-500'}`}>
              {xpShift} XP
            </span>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-center">
            <span className="block text-[10px] text-[#6B7280] uppercase tracking-wider">Coins Gained</span>
            <span className="text-xl font-bold text-yellow-500">
              {goldShift} Coins
            </span>
          </div>
        </div>

        {}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 relative z-10">
          
          {}
          <div className="flex flex-col border border-white/10 rounded-2xl overflow-hidden bg-white/[0.01]">
            <div className="px-5 py-3.5 bg-white/[0.02] border-b border-white/10 flex items-center justify-between">
              <span className="text-xs text-[#F9FAFB] tracking-wider font-bold">
                👤 My Solution
              </span>
              <span className="text-[10px] text-[#2563EB] bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 font-bold">
                {currentMatch.myProgress}/10 Passed
              </span>
            </div>
            
            <pre className="p-4 overflow-auto max-h-60 text-[11px] text-blue-400 font-mono select-text leading-relaxed text-left whitespace-pre scrollbar-thin scrollbar-thumb-[#223147]/30">
              {currentMatch.myCode}
            </pre>
          </div>

          {}
          <div className="flex flex-col border border-white/10 rounded-2xl overflow-hidden bg-white/[0.01]">
            <div className="px-5 py-3.5 bg-white/[0.02] border-b border-white/10 flex items-center justify-between">
              <span className="text-xs text-[#F9FAFB] tracking-wider font-bold">
                ⚔️ Opponent's Solution
              </span>
              <span className="text-[10px] text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 font-bold">
                {currentMatch.opponentProgress}/10 Passed
              </span>
            </div>
            
            <pre className="p-4 overflow-auto max-h-60 text-[11px] text-red-400 font-mono select-text leading-relaxed text-left whitespace-pre scrollbar-thin scrollbar-thumb-[#223147]/30">
              {currentMatch.opponentCode}
            </pre>
          </div>

        </div>

        {}
        <div className="text-center relative z-10">
          <button
            type="button"
            onClick={closeMatchModal}
            className="glow-btn bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-10 rounded-xl text-xs tracking-wider transition duration-300 cursor-pointer shadow-[0_4px_20px_rgba(37,99,235,0.2)]"
          >
            Return to Dashboard
          </button>
        </div>

      </motion.div>
    </div>
  );
};

export default PostGameModal;
