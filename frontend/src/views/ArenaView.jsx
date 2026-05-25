import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import IsolatedEditor from '../components/IsolatedEditor';
import BattleStatusMatrix from '../components/BattleStatusMatrix';
import PostGameModal from '../components/PostGameModal';

export const ArenaView = () => {
  const { currentMatch, forfeitMatch } = useGame();
  const [navWarning, setNavWarning] = useState(false);

  // Traps browser tabs/refresh close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (currentMatch && currentMatch.status === 'active') {
        e.preventDefault();
        e.returnValue = 'Active combat state locked. Leaving results in forfeiture.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentMatch]);

  // Traps browser Back-clicks/navigation to enforce combat trap locks
  useEffect(() => {
    const handlePopState = () => {
      if (currentMatch && currentMatch.status === 'active') {
        // Prevent back routing and push standard location state back
        window.history.pushState(null, '', window.location.pathname);
        setNavWarning(true);
      }
    };

    if (currentMatch && currentMatch.status === 'active') {
      window.history.pushState(null, '', window.location.pathname);
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentMatch]);

  if (!currentMatch) {
    return (
      <div className="min-h-screen bg-[#070A0F] text-[#F9FAFB] flex flex-col items-center justify-center font-mono select-none">
        <div className="text-center p-8 border border-[#1F2937] bg-[#0D111A] rounded-2xl max-w-sm shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="block text-sm font-bold tracking-widest uppercase mb-2">ACCESS FORBIDDEN</span>
          <p className="text-xs text-[#6B7280]">
            Match session not secured. Access is permitted only through active matchmaking gate arrays.
          </p>
        </div>
      </div>
    );
  }

  // Format countdown clock: 20:00 ticking down
  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleForfeitConfirm = () => {
    setNavWarning(false);
    forfeitMatch();
  };

  const opponentName = currentMatch.roomId.includes('duel_') 
    ? currentMatch.roomId.split('duel_')[1].toUpperCase()
    : 'ByteBlazer';

  return (
    <div className="min-h-screen bg-[#070A0F] text-[#F9FAFB] flex flex-col p-4 md:p-6 select-none relative font-mono">
      
      {/* Forfeit warning dialog */}
      {navWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0D111A] border border-[#EF4444]/40 rounded-2xl max-w-sm w-full p-6 shadow-[0_0_30px_rgba(239,68,68,0.25)]">
            <div className="flex items-center gap-3 text-red-500 mb-4 font-mono">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h4 className="text-md font-bold uppercase tracking-wider">⚠️ EXIT MATCH?</h4>
            </div>

            <p className="text-[#6B7280] text-xs mb-5 leading-relaxed font-mono">
              Leaving the game will count as a loss and you will lose 50 XP. Are you sure you want to exit?
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setNavWarning(false)}
                className="bg-[#1F2937] hover:bg-[#2e3b4e] text-[#F9FAFB] font-semibold py-2 px-4 rounded-lg text-xs font-mono tracking-wider cursor-pointer"
              >
                STAY & PLAY
              </button>
              <button
                type="button"
                onClick={handleForfeitConfirm}
                className="bg-red-500 hover:bg-red-400 text-white font-bold py-2 px-4 rounded-lg text-xs text-center font-mono tracking-wider cursor-pointer flex items-center justify-center shadow-md shadow-red-500/20"
              >
                YES, EXIT MATCH
              </button>
            </div>
          </div>
        </div>
      )}

      {/* A. Global Arena Header */}
      <header className="w-full bg-[#0D111A] border border-[#1F2937] p-5 rounded-2xl mb-6 shadow-md flex items-center justify-between">
        
        {/* Left Side Client Info */}
        <div className="flex items-center gap-3 w-1/3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-bold text-blue-500 font-mono text-sm">
              M
            </div>
          </div>
          <div>
            <span className="block text-sm font-bold text-[#F9FAFB] tracking-wide font-mono">ME</span>
            <span className="block text-xs text-blue-400 font-mono">
              Passed: {currentMatch.myProgress}/10
            </span>
          </div>
        </div>

        {/* Centralised Countdown Timer */}
        <div className="text-center w-1/3">
          <span className="block text-[10px] text-[#6B7280] font-mono tracking-widest uppercase mb-0.5">
            COMBAT DURATION REMAINING
          </span>
          <span className="text-2xl md:text-3xl font-extrabold text-blue-500 font-mono tracking-widest bg-[#080B11] border border-[#1F2937]/80 rounded-xl px-5 py-1.5 inline-block shadow-inner">
            {formatTime(currentMatch.timeRemaining)}
          </span>
        </div>

        {/* Right Side Opponent Info */}
        <div className="flex items-center gap-3 w-1/3 justify-end text-right">
          <div>
            <span className="block text-sm font-bold text-[#F9FAFB] tracking-wide font-mono">
              {opponentName}
            </span>
            <span className="block text-xs text-red-500 font-mono">
              Passed: {currentMatch.opponentProgress}/10
            </span>
          </div>
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center font-bold text-red-500 font-mono text-sm">
              O
            </div>
          </div>
        </div>

      </header>

      {/* B. The Split Execution Workspace */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: Monaco editor core panel */}
        <section className="lg:col-span-7 h-full flex flex-col">
          <IsolatedEditor />
        </section>

        {/* Right Side: problem instructions & blind opponent tracker */}
        <section className="lg:col-span-5 h-full flex flex-col">
          <BattleStatusMatrix />
        </section>

      </main>

      {/* Forfeit option footer link */}
      <footer className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setNavWarning(true)}
          className="text-xs text-red-500 hover:text-red-400 font-mono tracking-widest uppercase cursor-pointer bg-transparent border-none"
        >
          [ EXIT MATCH ]
        </button>
      </footer>

      {/* C. Post-Game Metrics Evaluation scorecard Modal */}
      <PostGameModal />

    </div>
  );
};

export default ArenaView;
