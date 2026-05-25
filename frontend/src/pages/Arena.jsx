import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import IsolatedEditor from '../components/IsolatedEditor';
import BattleStatusMatrix from '../components/BattleStatusMatrix';

export const Arena = () => {
  const { 
    currentMatch, 
    forfeitMatch, 
    showSummaryModal, 
    setShowSummaryModal,
    matchOutcome, 
    dissolvePrivateRoom,
    closeMatchModal 
  } = useGame();
  const { fetchLatestProfile } = useAuth();
  const navigate = useNavigate();
  const [navWarning, setNavWarning] = useState(false);

  const handleEditorDidMount = (_editor, monaco) => {
    monaco.editor.defineTheme('cyber-obsidian', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'F9FAFB', background: '080B11' },
        { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
        { token: 'keyword', foreground: '2563EB', fontStyle: 'bold' },
        { token: 'number', foreground: '10B981' },
        { token: 'string', foreground: '10B981' },
        { token: 'delimiter', foreground: '6B7280' },
        { token: 'variable', foreground: 'F9FAFB' }
      ],
      colors: {
        'editor.background': '#080B11',
        'editor.foreground': '#F9FAFB',
        'editorLineNumber.foreground': '#1F2937',
        'editorLineNumber.activeForeground': '#2563EB',
        'editor.selectionBackground': '#2563EB33',
        'editor.lineHighlightBackground': '#0D111A'
      }
    });
    monaco.editor.setTheme('cyber-obsidian');
  };

  // Trap browser tab close / refreshes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (currentMatch && currentMatch.status === 'ACTIVE' && !showSummaryModal) {
        e.preventDefault();
        e.returnValue = 'Active combat state locked. Leaving results in forfeiture.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentMatch, showSummaryModal]);

  // Trap browser Back-clicks/navigation to enforce combat trap locks
  useEffect(() => {
    const handlePopState = () => {
      if (currentMatch && currentMatch.status === 'ACTIVE' && !showSummaryModal) {
        window.history.pushState(null, '', window.location.pathname);
        setNavWarning(true);
      }
    };

    if (currentMatch && currentMatch.status === 'ACTIVE' && !showSummaryModal) {
      window.history.pushState(null, '', window.location.pathname);
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentMatch, showSummaryModal]);

  // Trap ESCAPE keystrokes when the End-Match Summary Modal is active
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showSummaryModal && e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    if (showSummaryModal) {
      window.addEventListener('keydown', handleKeyDown, true);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [showSummaryModal]);

  if (!currentMatch) {
    return (
      <div className="min-h-screen bg-[#000000] bg-dot-grid text-[#F9FAFB] flex flex-col items-center justify-center font-sans select-none p-4 relative overflow-hidden">
        
        {/* Subtle ambient light backdrops */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-red-600/[0.02] blur-[150px] pointer-events-none" />

        <div className="relative z-10 text-center p-8 border border-[#EF4444]/25 bg-white/[0.02] backdrop-blur-xl rounded-2xl max-w-sm shadow-[0_8px_30px_rgba(0,0,0,0.5)] overflow-hidden">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="block text-sm font-bold tracking-wider uppercase mb-2 text-red-500">Access Denied</span>
          <p className="text-xs text-[#6B7280]">
            No active match session found. You can only enter this room when in a match.
          </p>
        </div>
      </div>
    );
  }
  if (currentMatch.status === 'OPEN') {
    const code = currentMatch.roomId;
    return (
      <div className="min-h-screen bg-[#000000] bg-dot-grid text-[#F9FAFB] flex flex-col items-center justify-center font-sans select-none p-4 relative overflow-hidden">
        
        {/* Soft elegant background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-500/[0.03] blur-[120px] pointer-events-none" />

        <div className="relative z-10 text-center p-8 md:p-10 border border-white/10 bg-white/[0.02] backdrop-blur-xl rounded-3xl max-w-lg w-full shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all duration-500 hover:shadow-[0_0_40px_rgba(59,130,246,0.03)] overflow-hidden">
          {/* Subtle top light line */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
          <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h3 className="text-xl md:text-2xl font-extrabold tracking-wider text-[#F9FAFB] uppercase mb-3">
            Waiting for Opponent
          </h3>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto mb-8 leading-relaxed">
            The coding match is ready. Give your opponent the 6-digit access code below to start.
          </p>

          {/* Glowing Room Code Box */}
          <div className="bg-white/[0.01] border border-white/10 rounded-2xl p-6 mb-8 flex flex-col gap-4 items-center">
            <span className="text-[10px] text-[#6B7280] tracking-widest uppercase font-bold">Room Code</span>
            <div className="text-3xl md:text-4xl font-bold font-mono text-blue-500 tracking-widest">
              {code}
            </div>
            
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(code);
              }}
              className="mt-2 glow-btn bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/10 hover:border-white/20 font-bold px-4 py-2 rounded-lg text-xs transition tracking-wider cursor-pointer"
            >
              Copy Code
            </button>
          </div>

          {/* Cancel button */}
          <button
            type="button"
            onClick={async () => {
              // Cancel room on backend and exit back to dashboard cleanly
              dissolvePrivateRoom();
              navigate('/dashboard');
            }}
            className="text-xs text-red-500 hover:text-red-400 font-bold tracking-wider uppercase cursor-pointer bg-transparent border-none underline"
          >
            Cancel Match
          </button>
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

  const handleReturnToCommandHub = async () => {
    // 1. Fetch the latest user profile context to update XP pools instantly
    await fetchLatestProfile();
    // 2. Clean routing redirect back to dashboard
    navigate('/dashboard');
    // 3. Clear room/progress context states safely after navigation to prevent "Access Forbidden" flashing
    setTimeout(() => {
      closeMatchModal();
    }, 100);
  };

  const opponentName = (currentMatch.opponentName || 'Opponent').toUpperCase();

  if (currentMatch.status === 'RESOLVED') {
    const iWon = matchOutcome === 'VICTORY' || matchOutcome === 'FORFEIT_BY_OPPONENT';
    const opponentWon = matchOutcome === 'DEFEAT';
    const leftMatch = matchOutcome === 'FORFEIT_BY_ME';
    
    return (
      <div className="min-h-screen bg-[#000000] bg-dot-grid text-[#F9FAFB] flex flex-col p-4 md:p-6 select-text relative font-sans overflow-hidden">
        
        {/* Subtle ambient light backdrops */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/[0.02] blur-[150px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-purple-600/[0.02] blur-[150px] pointer-events-none" />
        
        {/* Header */}
        <header className="relative w-full bg-white/[0.02] backdrop-blur-xl border border-white/10 p-5 rounded-2xl mb-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-4 overflow-hidden">
          {/* Subtle top light line */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
          <div>
            <span className="block text-[10px] text-[#6B7280] tracking-wider uppercase mb-1 font-bold">
              Match Concluded
            </span>
            <h3 className="text-xl md:text-2xl font-extrabold tracking-wide text-[#F9FAFB] uppercase">
              {iWon ? '🏆 Victory' : leftMatch ? '🏳️ Exited' : opponentWon ? '💀 Defeat' : '⚖️ Draw'}
            </h3>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleReturnToCommandHub}
              className="glow-btn bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl text-xs transition duration-300 tracking-wider cursor-pointer shadow-[0_4px_20px_rgba(37,99,235,0.2)]"
            >
              Return to Dashboard
            </button>
          </div>
        </header>

        {/* 50/50 Code Grid */}
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch min-h-[500px]">
          
          {/* Left Panel: My Solution */}
          <div className="flex flex-col bg-white/[0.02] border border-[#223147]/50 rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between px-6 py-4 bg-white/[0.02] border-b border-[#223147]/30">
              <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">
                👤 My Submitted Code {iWon && ' (Winner)'}
              </span>
              <span className="bg-white/[0.01] border border-[#223147]/30 text-[#6B7280] rounded-md text-[10px] px-2 py-1 uppercase font-bold">
                C++ Code
              </span>
            </div>
            <div className="flex-1 min-h-[400px] relative">
              <Editor
                height="100%"
                language="cpp"
                value={currentMatch.myCode || '// No code submitted'}
                onMount={handleEditorDidMount}
                options={{
                  fontSize: 13,
                  fontFamily: "ui-monospace, Consolas, 'SF Mono', monospace",
                  minimap: { enabled: false },
                  readOnly: true,
                  theme: 'cyber-obsidian'
                }}
              />
            </div>
          </div>

          {/* Right Panel: Opponent's Solution */}
          <div className="flex flex-col bg-white/[0.02] border border-[#223147]/50 rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between px-6 py-4 bg-white/[0.02] border-b border-[#223147]/30">
              <span className="text-xs text-red-500 font-bold uppercase tracking-wider">
                ⚔️ {opponentName}'s Submitted Code {opponentWon && ' (Winner)'}
              </span>
              <span className="bg-white/[0.01] border border-[#223147]/30 text-[#6B7280] rounded-md text-[10px] px-2 py-1 uppercase font-bold">
                C++ Code
              </span>
            </div>
            <div className="flex-1 min-h-[400px] relative">
              <Editor
                height="100%"
                language="cpp"
                value={currentMatch.opponentCode || '// No code submitted'}
                onMount={handleEditorDidMount}
                options={{
                  fontSize: 13,
                  fontFamily: "ui-monospace, Consolas, 'SF Mono', monospace",
                  minimap: { enabled: false },
                  readOnly: true,
                  theme: 'cyber-obsidian'
                }}
              />
            </div>
          </div>

        </main>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] bg-dot-grid text-[#F9FAFB] flex flex-col p-4 md:p-6 select-none relative font-sans overflow-hidden">
      
      {/* Subtle ambient light backdrops */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/[0.015] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-purple-600/[0.015] blur-[150px] pointer-events-none" />
      
      {/* Forfeit warning dialog */}
      {navWarning && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-black/95 backdrop-blur-md border border-[#EF4444]/40 rounded-2xl max-w-sm w-full p-6 shadow-[0_0_30px_rgba(239,68,68,0.25)]">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h4 className="text-md font-bold uppercase tracking-wider">⚠️ Leave Match?</h4>
            </div>

            <p className="text-[#6B7280] text-xs mb-5 leading-relaxed">
              Leaving the game will count as a defeat and you will lose 50 XP. Are you sure you want to leave?
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setNavWarning(false)}
                className="bg-[#223147]/40 hover:bg-[#2e3b4e]/40 text-[#F9FAFB] font-semibold py-2 px-4 rounded-lg text-xs tracking-wider cursor-pointer border border-[#223147]/30"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleForfeitConfirm}
                className="bg-red-500 hover:bg-red-400 text-white font-bold py-2 px-4 rounded-lg text-xs text-center tracking-wider cursor-pointer flex items-center justify-center shadow-md shadow-red-500/20"
              >
                Leave Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* A. Global Arena Header */}
      <header className="w-full bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 rounded-2xl mb-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left Side Client Info (Host/Me Progress) */}
        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center font-bold text-[#F9FAFB] text-sm">
              M
            </div>
            <div>
              <span className="block text-sm font-bold text-[#F9FAFB] tracking-wide">ME</span>
              <span className="block text-xs text-blue-400">
                Passed: {(currentMatch.myProgress || 0) * 10}%
              </span>
            </div>
          </div>
          <div className="w-full bg-white/[0.04] rounded-full h-2 overflow-hidden border border-white/10 mt-1">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${(currentMatch.myProgress || 0) * 10}%` }}
            />
          </div>
        </div>

        {/* Centralised Countdown Timer */}
        <div className="text-center w-full md:w-1/3 flex flex-col items-center">
          <span className="block text-[10px] text-[#6B7280] tracking-widest uppercase mb-1">
            Time Remaining
          </span>
          <span className="text-2xl font-extrabold text-blue-500 font-mono tracking-widest bg-white/[0.01] border border-white/10 rounded-xl px-5 py-1.5 inline-block shadow-inner">
            {formatTime(currentMatch.timeRemaining)}
          </span>
        </div>

        {/* Right Side Opponent Info (Guest Progress) */}
        <div className="flex flex-col gap-2 w-full md:w-1/3 text-right">
          <div className="flex items-center gap-3 justify-end">
            <div>
              <span className="block text-sm font-bold text-[#F9FAFB] tracking-wide">
                {opponentName}
              </span>
              <span className="block text-xs text-red-500">
                Passed: {(currentMatch.opponentProgress || 0) * 10}%
              </span>
            </div>
            <div className="w-9 h-9 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center font-bold text-[#F9FAFB] text-sm">
              O
            </div>
          </div>
          <div className="w-full bg-white/[0.04] rounded-full h-2 overflow-hidden border border-white/10 mt-1">
            <div 
              className="bg-red-500 h-2 rounded-full transition-all duration-500 float-right" 
              style={{ width: `${(currentMatch.opponentProgress || 0) * 10}%` }}
            />
          </div>
        </div>

      </header>

      {/* B. The Split Execution Workspace */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Side: problem instructions (Markdown reader) */}
        <section className="h-full flex flex-col">
          <BattleStatusMatrix />
        </section>

        {/* Right Side: Monaco editor core panel */}
        <section className="h-full flex flex-col">
          <IsolatedEditor />
        </section>

      </main>

      {/* Forfeit option footer link */}
      <footer className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setNavWarning(true)}
          className="text-xs text-red-500 hover:text-red-400 tracking-wider uppercase cursor-pointer bg-transparent border-none"
        >
          Leave Match
        </button>
      </footer>

      {/* C. End-Match Summary Modal Overlay */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn select-text">
          
          <div className="relative bg-black/90 backdrop-blur-xl border border-white/10 rounded-3xl max-w-2xl w-full p-8 shadow-[0_8px_30px_rgba(0,0,0,0.5)] overflow-hidden font-sans flex flex-col items-center">

            <div className="text-center mb-8 relative z-10 w-full">
              
              {matchOutcome === 'VICTORY' && (
                <>
                  <div className="inline-block text-3xl md:text-4xl font-extrabold tracking-wider text-emerald-500 uppercase mb-4">
                    🎉 Victory! 🎉
                  </div>
                  <div className="bg-white/[0.01] border border-emerald-500/20 rounded-xl p-4 max-w-sm mx-auto mb-6">
                    <span className="block text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">REWARD CLAIMED</span>
                    <span className="text-xl font-extrabold text-emerald-400 tracking-wider">
                      +30 XP & +25 COINS
                    </span>
                  </div>
                  <div className="text-[#6B7280] text-xs max-w-md mx-auto leading-relaxed border-t border-white/10 pt-4 text-left space-y-1 select-text">
                    <div className="text-emerald-500 font-bold">Your code compiled and passed all test cases first!</div>
                    <div>Your profile has been successfully credited.</div>
                    <div>Excellent job! Keep the winning streak going.</div>
                  </div>
                </>
              )}

              {matchOutcome === 'DEFEAT' && (
                <>
                  <div className="inline-block text-3xl md:text-4xl font-extrabold tracking-wider text-red-500 uppercase mb-4">
                    💀 Defeat! 💀
                  </div>
                  <div className="bg-white/[0.01] border border-red-500/30 rounded-xl p-4 max-w-sm mx-auto mb-6">
                    <span className="block text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">MATCH OUTCOME</span>
                    <span className="text-lg font-extrabold text-red-500 tracking-wider">
                      OPPONENT SOLVED FIRST
                    </span>
                  </div>
                  <div className="text-[#6B7280] text-xs max-w-md mx-auto leading-relaxed border-t border-white/10 pt-4 text-left space-y-1 select-text">
                    <div className="text-red-500 font-bold">The opponent submitted the correct answer before you.</div>
                    <div>Penalty applied: -15 XP deducted.</div>
                    <div>Practice makes perfect! Try again to improve your speed.</div>
                  </div>
                </>
              )}

              {matchOutcome === 'FORFEIT_BY_ME' && (
                <>
                  <div className="inline-block text-3xl md:text-4xl font-extrabold tracking-wider text-red-500 uppercase mb-4">
                    🏳️ You Left the Match 🏳️
                  </div>
                  <div className="bg-white/[0.01] border border-red-500/30 rounded-xl p-4 max-w-sm mx-auto mb-6">
                    <span className="block text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">PENALTY CHARGED</span>
                    <span className="text-lg font-extrabold text-red-500 tracking-wider">
                      -50 XP PENALTY
                    </span>
                  </div>
                  <div className="text-[#6B7280] text-xs max-w-md mx-auto leading-relaxed border-t border-white/10 pt-4 text-left space-y-1 select-text">
                    <div className="text-red-500 font-bold">You exited the match before submitting a solution.</div>
                    <div>A penalty of -50 XP was applied to your profile.</div>
                    <div>Try to finish your matches next time!</div>
                  </div>
                </>
              )}

              {matchOutcome === 'FORFEIT_BY_OPPONENT' && (
                <>
                  <div className="inline-block text-3xl md:text-4xl font-extrabold tracking-wider text-emerald-500 uppercase mb-4">
                    🏆 Opponent Left the Match! 🏆
                  </div>
                  <div className="bg-white/[0.01] border border-emerald-500/30 rounded-xl p-4 max-w-sm mx-auto mb-6">
                    <span className="block text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">SURVIVOR BONUS</span>
                    <span className="text-xl font-extrabold text-emerald-400 tracking-wider">
                      +30 XP & +15 COINS
                    </span>
                  </div>
                  <div className="text-[#6B7280] text-xs max-w-md mx-auto leading-relaxed border-t border-white/10 pt-4 text-left space-y-1 select-text">
                    <div className="text-emerald-500 font-bold">The opponent left the match before submitting a solution.</div>
                    <div>You win by default! Your rewards have been added.</div>
                    <div>Ready for the next battle?</div>
                  </div>
                </>
              )}
            </div>

            {/* Code Comparison Section */}
            {(matchOutcome === 'VICTORY' || matchOutcome === 'DEFEAT' || matchOutcome === 'FORFEIT_BY_OPPONENT') && (
              <div className="w-full mt-6 border-t border-white/10 pt-6 z-10">
                <div className="text-center text-xs text-[#6B7280] uppercase tracking-wider mb-4 font-bold">
                  Code Comparison
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  {/* My Solution */}
                  <div className="flex flex-col bg-white/[0.01] border border-white/10 rounded-xl p-4">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-2">
                      👤 My Solution
                    </span>
                    <pre className="text-xs text-[#9CA3AF] bg-[#030712] p-3 rounded-lg overflow-auto max-h-60 text-left select-text whitespace-pre-wrap font-mono">
                      {currentMatch?.myCode || '// No code submitted'}
                    </pre>
                  </div>
                  {/* Opponent's Solution */}
                  <div className="flex flex-col bg-white/[0.01] border border-white/10 rounded-xl p-4">
                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-2">
                      ⚔️ Opponent's Solution
                    </span>
                    <pre className="text-xs text-[#9CA3AF] bg-[#030712] p-3 rounded-lg overflow-auto max-h-60 text-left select-text whitespace-pre-wrap font-mono">
                      {currentMatch?.opponentCode || '// No code submitted'}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Glowing return button */}
            <div className="relative z-10 w-full flex justify-center mt-6">
              <button
                type="button"
                onClick={handleReturnToCommandHub}
                className="bg-transparent hover:bg-white/5 text-[#F9FAFB] border border-white/10 hover:border-white/20 font-bold py-4 px-8 rounded-xl text-sm tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
              >
                Return to Dashboard
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Arena;
