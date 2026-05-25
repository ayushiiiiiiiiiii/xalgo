import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { useNavigate } from 'react-router-dom';

export const ProfileView = () => {
  const { user } = useAuth();
  const { leaderboard } = useGame();
  const navigate = useNavigate();

  if (!user) return null;

  const xpInLevel = user.xp % 100;
  const currentLevel = Math.floor(user.xp / 100);
  const remainingXP = 100 - xpInLevel;

  const duelsPlayed = user.battleStats?.duelsPlayed || 0;
  const hotStreak = user.battleStats?.currentStreak || 0;

  return (
    <div className="min-h-screen bg-[#000000] bg-dot-grid text-[#F9FAFB] flex flex-col items-center justify-center p-6 select-none font-sans relative overflow-hidden">
      
      {/* Subtle ambient light backdrops */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/[0.03] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-purple-600/[0.03] blur-[150px] pointer-events-none" />

      {/* Main Scorecard Box */}
      <div className="w-full max-w-xl bg-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-blue-500/20 rounded-2xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_rgba(59,130,246,0.05)]">
        
        {/* Subtle top light line to give the card a premium finish */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

        {/* Header Block */}
        <div className="text-center pb-8 border-b border-white/10 relative">
          {/* Avatar graphic frame */}
          <div className="relative inline-block mb-4">
            <div className="relative w-20 h-20 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center overflow-hidden">
              <span className="text-3xl font-bold text-[#F9FAFB] uppercase">
                {user.username ? user.username.charAt(0) : 'U'}
              </span>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-[#F9FAFB] uppercase tracking-wider mb-2">
            {user.username}
          </h1>

          <div className="flex flex-col items-center gap-2">
            <div className="text-xs text-[#6B7280] mt-1 uppercase tracking-wider">
              Total Experience: <span className="text-[#F9FAFB] font-bold">{user.xp} XP</span>
            </div>
          </div>

          {/* Level Progress Indicator bar */}
          <div className="mt-6 max-w-sm mx-auto" title={`[${remainingXP}] XP until next level ascension`}>
            <div className="flex justify-between items-center text-[10px] text-[#6B7280] mb-1.5">
              <span>LVL {currentLevel}</span>
              <span>{xpInLevel}/100 XP</span>
              <span>LVL {currentLevel + 1}</span>
            </div>
            <div className="h-2 w-full bg-white/[0.04] rounded-full overflow-hidden border border-white/10 relative">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full" 
                style={{ width: `${xpInLevel}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8">
          {/* Box 1: Total Matches */}
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5 text-center group">
            <span className="block text-[10px] text-[#6B7280] uppercase tracking-wider mb-2 font-bold">
              Total Matches
            </span>
            <span className="text-2xl font-extrabold text-[#F9FAFB] group-hover:scale-105 transition-transform duration-300 block">
              {duelsPlayed}
            </span>
          </div>

          {/* Box 2: Current Win Streak */}
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5 text-center group relative overflow-hidden">
            <span className="block text-[10px] text-[#6B7280] uppercase tracking-wider mb-2 font-bold">
              Current Win Streak 🔥
            </span>
            <span className="text-2xl font-extrabold text-red-500 group-hover:scale-105 transition-transform duration-300 flex items-center justify-center gap-1">
              {hotStreak}
            </span>
          </div>
        </div>

        {/* Navigation Handle: Back to Dashboard */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 glow-btn bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/80 hover:to-indigo-600/80 text-[#F9FAFB] border border-white/10 hover:border-blue-500/30 text-xs font-bold rounded-xl tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-2 uppercase shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.2)]"
          >
            Back to Dashboard
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProfileView;
