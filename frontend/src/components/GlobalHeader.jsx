import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export const GlobalHeader = () => {
  const { user, logoutAction } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const xpInLevel = user.xp % 100;
  const currentLevel = Math.floor(user.xp / 100);
  const remainingXP = 100 - xpInLevel;

  const duelsPlayed = user.battleStats?.duelsPlayed || 0;
  const hotStreak = user.battleStats?.currentStreak || 0;

  const handleLogout = async () => {
    await logoutAction();
    navigate('/login');
  };

  return (
    <header className="w-full bg-white/[0.03] backdrop-blur-xl border-b border-white/10 p-6 rounded-b-2xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.3)]">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
        
        {}
        <div className="flex items-center gap-5 w-full lg:w-auto">
          {}
          <div className="relative group">
            <div className="relative w-16 h-16 rounded-full bg-transparent border border-white/15 flex items-center justify-between overflow-hidden">
              <svg className="w-full h-full text-blue-500 p-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-black" title="Online"></div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-[#F9FAFB] font-bold text-2xl tracking-wide">{user.username}</h2>
            </div>

            {}
            <div className="mt-3 w-64 md:w-80" title={`[${remainingXP}] XP needed to level up`}>
              <div className="flex justify-between items-center text-xs text-[#6B7280] mb-1">
                <span>LVL {currentLevel}</span>
                <span>{xpInLevel}/100 XP</span>
                <span>LVL {currentLevel + 1}</span>
              </div>
              <div className="h-2 w-full bg-white/[0.04] rounded-full overflow-hidden relative border border-white/10 cursor-pointer">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpInLevel}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
          <div className="grid grid-cols-2 gap-4">
            {}
            <div className="bg-white/[0.05] border border-white/10 rounded-xl px-5 py-3 text-center min-w-[100px] md:min-w-[120px] hover:border-blue-500/40 transition-colors duration-300" title="Total Duels Logged">
              <span className="block text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Total Duels</span>
              <span className="text-xl md:text-2xl font-bold text-[#F9FAFB]">{duelsPlayed}</span>
            </div>

            {}
            <div className="bg-white/[0.05] border border-white/10 rounded-xl px-5 py-3 text-center min-w-[100px] md:min-w-[120px] hover:border-red-500/40 transition-colors duration-300 relative overflow-hidden group" title="Current Streak Tracker">
              <span className="block text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Win Streak</span>
              <div className="flex items-center justify-center gap-1">
                <span className="text-xl md:text-2xl font-bold text-red-500 text-center flex items-center justify-center gap-1 drop-shadow-[0_0_8px_rgba(239,68,68,0.3)] animate-pulse">
                  {hotStreak} 🔥
                </span>
              </div>
              {hotStreak >= 3 && (
                <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-bl" />
              )}
            </div>
          </div>

          {}
          <button
            onClick={handleLogout}
            className="bg-[#EF4444]/10 hover:bg-[#EF4444] text-[#EF4444] hover:text-white border border-[#EF4444]/30 font-semibold px-4 py-2.5 rounded-xl text-xs transition duration-300 uppercase tracking-wider cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.05)] hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] shrink-0 self-center lg:ml-4"
          >
            Sign Out
          </button>
        </div>

      </div>
    </header>
  );
};

export default GlobalHeader;
