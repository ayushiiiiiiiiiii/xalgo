import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { motion } from 'framer-motion';

export const Dashboard = () => {
  const { user } = useAuth();

  const {
    hostRoomCode,
    generateHostCode,
    verifyAndJoinRoom,
    errorNotification,
    setErrorNotification,
    leaderboard,
  } = useGame();

  const [generatedCode, setGeneratedCode] = useState('');
  const [difficulty, setDifficulty] = useState('Random');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  if (!user) return null;

  const xpInLevel = user.xp % 100;
  const currentLevel = Math.floor(user.xp / 100);
  const duelsPlayed = user.battleStats?.duelsPlayed || 0;
  const hotStreak = user.battleStats?.currentStreak || 0;

  const handleCreateCustomRoom = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      await generateHostCode(difficulty);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinCustomRoom = async (e) => {
    e.preventDefault();
    if (isJoining) return;

    const sanitizedCode = generatedCode.trim().toUpperCase();
    if (sanitizedCode.length !== 6) {
      if (setErrorNotification) {
        setErrorNotification('Room token must be exactly 6 characters long.');
        setTimeout(() => setErrorNotification(null), 4000);
      }
      return;
    }

    if (!sanitizedCode.startsWith('XA')) {
      if (setErrorNotification) {
        setErrorNotification('Invalid room token. Rooms must begin with XA.');
        setTimeout(() => setErrorNotification(null), 4000);
      }
      return;
    }

    setIsJoining(true);
    try {
      await verifyAndJoinRoom(sanitizedCode);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="flex-1 text-[#F9FAFB] font-sans overflow-y-auto relative">
      {}
      <div className="absolute top-10 left-10 w-[600px] h-[600px] rounded-full bg-blue-600/[0.02] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[600px] h-[600px] rounded-full bg-purple-600/[0.02] blur-[150px] pointer-events-none" />

      <main className="w-full max-w-5xl mx-auto p-6 pb-16 flex flex-col gap-8 relative z-10">

        {}
        <div className="relative bg-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-blue-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all duration-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.03)] overflow-hidden">
          {}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
          {}
          <div className="flex items-center gap-5 flex-1 min-w-0">
            <div className="relative shrink-0">
              <div className="relative w-14 h-14 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center">
                <span className="text-xl font-semibold text-[#F9FAFB] uppercase">
                  {user.username ? user.username.charAt(0) : 'U'}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-3.5 h-3.5 rounded-full border-2 border-black" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[#F9FAFB] font-bold text-xl tracking-wide truncate">{user.username}</span>
              </div>
              {}
              <div className="mt-2 w-56">
                <div className="flex justify-between text-[10px] text-[#6B7280] mb-1">
                  <span>LVL {currentLevel}</span>
                  <span>{xpInLevel}/100 XP</span>
                  <span>LVL {currentLevel + 1}</span>
                </div>
                <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
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
          <div className="flex items-center gap-3 shrink-0 flex-wrap justify-center">
            <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-xl px-5 py-3 text-center min-w-[100px]">
              <span className="block text-[9px] text-[#6B7280] uppercase tracking-wider mb-1">Total Duels</span>
              <span className="text-xl font-bold text-[#F9FAFB]">{duelsPlayed}</span>
            </div>
            <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-xl px-5 py-3 text-center min-w-[100px]">
              <span className="block text-[9px] text-[#6B7280] uppercase tracking-wider mb-1">Win Streak</span>
              <span className="text-xl font-bold text-red-500">{hotStreak} 🔥</span>
            </div>
          </div>
        </div>

        {}
        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-blue-500/20 rounded-3xl p-8 relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all duration-500 hover:shadow-[0_0_40px_rgba(59,130,246,0.03)]">
          {}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
          <div className="relative z-10 flex flex-col items-center mb-8">
            <h1 className="text-[#F9FAFB] font-extrabold text-2xl md:text-3xl tracking-wider uppercase text-center mb-2">
              Private Matches
            </h1>
            <p className="text-[#6B7280] text-xs md:text-sm text-center max-w-md leading-relaxed">
              Create a private room to duel with a friend, or enter a room code to join one.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/10 pt-8">

            {}
            <div className="flex flex-col justify-between p-6 rounded-2xl bg-white/[0.02] backdrop-blur-md border border-white/10">
              <div>
                <div className="flex justify-between items-center mb-4">
                  {hostRoomCode && (
                    <span className="text-[10px] text-[#10B981] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold tracking-widest uppercase animate-pulse">
                      Room Active
                    </span>
                  )}
                </div>
                <h4 className="text-[#F9FAFB] font-bold text-md tracking-wider uppercase mb-3">
                  Create a Private Room
                </h4>
                <p className="text-[#6B7280] text-xs leading-relaxed mb-6">
                  Create a private game. A challenge will be randomly selected based on your difficulty choice.
                </p>
              </div>

              <div>
                {!hostRoomCode && (
                  <div className="mb-5">
                    <span className="block text-[10px] text-[#6B7280] uppercase tracking-widest font-bold mb-2">
                      Select Difficulty
                    </span>
                    <div className="grid grid-cols-4 gap-1.5 bg-white/[0.01] border border-white/10 p-1 rounded-xl">
                      {['Random', 'Easy', 'Medium', 'Hard'].map((level) => {
                        const isSelected = difficulty === level;
                        let sel = '';
                        if (isSelected) {
                          if (level === 'Easy') sel = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                          else if (level === 'Medium') sel = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
                          else if (level === 'Hard') sel = 'bg-red-500/10 text-red-400 border-red-500/30';
                          else sel = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
                        }
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setDifficulty(level)}
                            className={`py-2 px-1 text-[10px] font-bold tracking-wider rounded-lg transition duration-200 uppercase cursor-pointer border ${
                              isSelected
                                ? `border ${sel}`
                                : 'border-transparent text-[#6B7280] hover:text-[#9CA3AF] hover:bg-white/5'
                            }`}
                          >
                            {level}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!hostRoomCode ? (
                  <button
                    type="button"
                    onClick={handleCreateCustomRoom}
                    disabled={isCreating}
                    className="w-full glow-btn bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white border border-white/10 hover:border-blue-500/30 font-bold py-3.5 px-4 rounded-xl text-xs transition duration-300 tracking-wider cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(37,99,235,0.2)]"
                  >
                    {isCreating ? (
                      <>
                        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        Creating Room...
                      </>
                    ) : (
                      'Create Room'
                    )}
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      <div className="flex-1 bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-center font-bold font-mono text-blue-500 tracking-widest text-xl">
                        {hostRoomCode}
                      </div>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(hostRoomCode)}
                        className="bg-[#2563EB]/10 hover:bg-[#2563EB]/25 text-[#2563EB] border border-[#2563EB]/30 hover:border-[#2563EB]/50 font-bold px-4 rounded-xl text-[10px] transition duration-300 tracking-wider cursor-pointer"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-[10px] text-[#6B7280] text-center italic">
                      Share this 6-digit access code with your opponent.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {}
            <form
              onSubmit={handleJoinCustomRoom}
              className="flex flex-col justify-between p-6 rounded-2xl bg-white/[0.02] backdrop-blur-md border border-white/10"
            >
              <div>
                <h4 className="text-[#F9FAFB] font-bold text-md tracking-wider uppercase mb-3">
                  Join a Private Room
                </h4>
                <p className="text-[#6B7280] text-xs leading-relaxed mb-6">
                  Enter the 6-character room code shared by your opponent to join their match.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit room code"
                  value={generatedCode}
                  onChange={(e) => {
                    setGeneratedCode(e.target.value.toUpperCase());
                    if (setErrorNotification) setErrorNotification(null);
                  }}
                  className="w-full bg-white/[0.02] border border-white/10 text-[#F9FAFB] rounded-xl px-4 py-3.5 text-center font-bold font-mono tracking-widest focus:border-blue-500 focus:outline-none transition uppercase text-sm"
                />

                {errorNotification && (
                  <div className="text-xs text-red-500 font-bold text-center animate-pulse">
                    ❌ {errorNotification}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isJoining}
                  className="w-full glow-btn bg-white/[0.05] hover:bg-white/[0.12] disabled:opacity-50 text-white border border-white/10 hover:border-blue-500/30 font-bold py-3.5 px-4 rounded-xl text-xs transition duration-300 tracking-wider cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
                >
                  {isJoining ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      Joining...
                    </span>
                  ) : (
                    'Join Room'
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
