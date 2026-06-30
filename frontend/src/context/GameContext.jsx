import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getCppCode(boilerplate) {
  if (!boilerplate) return '';
  if (typeof boilerplate.get === 'function') return boilerplate.get('cpp') || '';
  return boilerplate['cpp'] || boilerplate.cpp || '';
}

const GameContext = createContext(undefined);

export const GameProvider = ({ children }) => {
  const { user, token, isAuthenticated, logoutAction } = useAuth();

  const [currentMatch, setCurrentMatch] = useState(null);
  const [hostRoomCode, setHostRoomCode] = useState(null);
  const [errorNotification, setErrorNotification] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [matchOutcome, setMatchOutcome] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);


  const lobbyUsers = [];
  const isQueueing = false;
  const queueTime = 0;
  const incomingChallenge = null;

  const matchTimerRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    let interval = null;
    if (isAuthenticated && token) {
      const fetchLeaderboard = async () => {
        try {
          const res = await fetch(`${API_URL}/auth/leaderboard`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.status === 401 || res.status === 403) {
            logoutAction();
            return;
          }
          const data = await res.json();
          if (res.ok && data.leaderboard) {
            setLeaderboard(data.leaderboard);
          }
        } catch (err) {
          console.error('Failed to fetch leaderboard:', err);
        }
      };
      fetchLeaderboard();
      interval = setInterval(fetchLeaderboard, 15000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (currentMatch && (currentMatch.status === 'OPEN' || currentMatch.status === 'ACTIVE')) {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

      pollingIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/match/status/${currentMatch.roomId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.status === 401 || res.status === 403) {
            logoutAction();
            return;
          }
          const data = await res.json();
          if (res.ok && data.match) {
            const m = data.match;
            const isHost = m.host.userId._id === user?.id || m.host.userId === user?.id;
            const opponent = isHost ? m.guest : m.host;
            const me = isHost ? m.host : m.guest;

            setCurrentMatch((prev) => {
              if (!prev) return null;

              const newLogs = [...prev.logs];

              if (prev.status === 'OPEN' && m.status === 'ACTIVE') {
                newLogs.push('[GAME] Player connected to Battle Arena.');
              }

              const newOpponentProgress = opponent ? opponent.progress : 0;
              if (opponent && prev.opponentProgress !== newOpponentProgress) {
                newLogs.push(`[GAME] Opponent progress: ${newOpponentProgress}/10 completed.`);
              }

              if (m.status === 'RESOLVED') {
                newLogs.push(`🏁 [GAME] Game finished! Result: ${m.winnerId ? (m.winnerId._id === user?.id || m.winnerId === user?.id ? 'Victory!' : 'Defeat!') : 'Draw!'}`);

                if (m.winnerId) {
                  const isIWin = m.winnerId._id === user?.id || m.winnerId === user?.id;

                  const meForfeited = me && me.durationTaken === null && (!me.codeSubmitted || me.codeSubmitted === '');
                  if (meForfeited) {
                    setMatchOutcome("FORFEIT_BY_ME");
                  } else if (opponent && opponent.durationTaken === null && (!opponent.codeSubmitted || opponent.codeSubmitted === '')) {
                    setMatchOutcome("FORFEIT_BY_OPPONENT");
                  } else {
                    setMatchOutcome(isIWin ? "VICTORY" : "DEFEAT");
                  }
                } else {
                  
                  setMatchOutcome("DEFEAT");
                }
                setShowSummaryModal(true);

                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                }
              }

              return {
                ...prev,
                status: m.status,
                timeRemaining: m.timeRemaining !== undefined ? m.timeRemaining : prev.timeRemaining,
                opponentProgress: newOpponentProgress,
                opponentName: opponent && opponent.userId ? opponent.userId.username : 'Opponent',
                myProgress: me ? me.progress : 0,
                opponentCode: opponent ? opponent.codeSubmitted : '',
                myCode: m.status === 'RESOLVED' ? (me?.codeSubmitted || prev.myCode) : prev.myCode,
                hasSubmitted: me ? me.durationTaken !== null : false,
                xpChange: m.status === 'RESOLVED' ? (m.winnerId ? (m.winnerId._id === user?.id || m.winnerId === user?.id ? 30 : -15) : 10) : undefined,
                goldCoinsChange: m.status === 'RESOLVED' ? (m.winnerId ? (m.winnerId._id === user?.id || m.winnerId === user?.id ? 25 : 5) : 10) : undefined,
                logs: newLogs
              };
            });
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 4000);
    } else {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [currentMatch?.roomId, currentMatch?.status, token, user?.id]);

  useEffect(() => {
    if (currentMatch && currentMatch.status === 'ACTIVE') {
      matchTimerRef.current = setInterval(() => {
        setCurrentMatch((prev) => {
          if (!prev) return null;
          if (prev.timeRemaining <= 1) {
            if (matchTimerRef.current) clearInterval(matchTimerRef.current);
            return { ...prev, timeRemaining: 0 };
          }
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        });
      }, 1000);
    } else {
      if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    }
    return () => {
      if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    };
  }, [currentMatch?.status]);

  const startQueue = () => {};
  const stopQueue = () => {};
  const challengePlayer = () => {};
  const acceptChallenge = () => {};
  const declineChallenge = () => {};

  const generateHostCode = async (difficulty) => {
    try {
      const res = await fetch(`${API_URL}/match/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ difficulty })
      });
      if (res.status === 401 || res.status === 403) {
        logoutAction();
        return null;
      }
      const data = await res.json();
      if (res.ok && data.match) {
        const fullMatch = data.match;
        setHostRoomCode(data.roomCode);
        setCurrentMatch({
          roomId: data.roomCode,
          problem: {
            id: fullMatch.problemId._id,
            title: fullMatch.problemId.title,
            difficulty: fullMatch.problemId.difficulty,
            description: fullMatch.problemId.description,
            starterCode: getCppCode(fullMatch.problemId.boilerplateCode),
            boilerplateCode: fullMatch.problemId.boilerplateCode || {}
          },
          timeRemaining: 1800, 
          myProgress: 0,
          opponentProgress: 0,
          myCode: getCppCode(fullMatch.problemId.boilerplateCode),
          opponentCode: '',
          opponentName: 'Opponent',
          status: 'OPEN',
          logs: [
            '[GAME] Game Arena ready!',
            '[GAME] Waiting for player to connect...',
            `[GAME] Challenge Loaded: ${fullMatch.problemId.title}`,
            '[GAME] Safe Play Guard is Active.'
          ],
          opponentDisconnected: false,
          hasSubmitted: false
        });

        navigator.clipboard.writeText(data.roomCode).catch((err) => {
          console.error('Failed to copy room code:', err);
        });

        return data.roomCode;
      } else {
        setErrorNotification(data.error || 'Failed to initiate open duel.');
        setTimeout(() => setErrorNotification(null), 4000);
      }
    } catch (err) {
      setErrorNotification(err.message || 'Network error creating duel.');
      setTimeout(() => setErrorNotification(null), 4000);
    }
    return null;
  };

  const verifyAndJoinRoom = async (code) => {
    try {
      const res = await fetch(`${API_URL}/match/join/${code}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.status === 401 || res.status === 403) {
        logoutAction();
        return false;
      }
      const data = await res.json();
      if (res.ok && data.match) {
        const m = data.match;
        setCurrentMatch({
          roomId: m.roomCode,
          problem: {
            id: m.problemId._id,
            title: m.problemId.title,
            difficulty: m.problemId.difficulty,
            description: m.problemId.description,
            starterCode: getCppCode(m.problemId.boilerplateCode),
            boilerplateCode: m.problemId.boilerplateCode || {}
          },
          timeRemaining: m.timeRemaining !== undefined ? m.timeRemaining : 1800, 
          myProgress: 0,
          opponentProgress: 0,
          myCode: getCppCode(m.problemId.boilerplateCode),
          opponentCode: '',
          opponentName: m.host.userId ? m.host.userId.username : 'Opponent',
          status: 'ACTIVE',
          logs: [
            '[GAME] Game Arena ready!',
            '[GAME] Player connected.',
            `[GAME] Challenge Loaded: ${m.problemId.title}`,
            '[GAME] Safe Play Guard is Active.'
          ],
          opponentDisconnected: false,
          hasSubmitted: false
        });
        return true;
      } else {
        setErrorNotification(data.error || 'Failed to join match room.');
        setTimeout(() => setErrorNotification(null), 4000);
      }
    } catch (err) {
      setErrorNotification(err.message || 'Network error joining room.');
      setTimeout(() => setErrorNotification(null), 4000);
    }
    return false;
  };

  const updateMyCode = (code) => {
    setCurrentMatch((prev) => {
      if (!prev) return null;
      return { ...prev, myCode: code };
    });
  };

  const runDiagnostics = async (code, language = 'cpp') => {
    if (!currentMatch) return;

    setCurrentMatch((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        logs: [
          ...prev.logs,
          `[GAME] Submitting code to secure backend execution engine...`
        ]
      };
    });

    try {
      const res = await fetch(`${API_URL}/match/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roomCode: currentMatch.roomId,
          codeSubmitted: code
        })
      });

      const data = await res.json();
      const compileLogs = [];
      let passed = 0;

      if (res.ok && data.judgeData) {
        if (data.judgeData.status && (data.judgeData.status.id === 3 || data.judgeData.status.description === 'Accepted')) {
          passed = data.progress; 
          compileLogs.push('✔ [SUCCESS] Code execution completed securely on Node.js backend.');
          compileLogs.push(`✔ [SUCCESS] Evaluated ${data.passed} hidden test vectors in native C++.`);
          compileLogs.push(`[GAME] Score: ${passed}/10 test cases passed!`);
        } else {
          passed = 0;
          compileLogs.push('❌ [ERROR] C++ execution failed:');
          const jd = data.judgeData;
          if (jd.compile_output) {
            jd.compile_output.split('\\n').forEach((line) => {
              if (line.trim()) compileLogs.push(line);
            });
          } else if (jd.stderr) {
            jd.stderr.split('\\n').forEach((line) => {
              if (line.trim()) compileLogs.push(line);
            });
          } else {
            compileLogs.push(jd.status?.description || 'Syntax error or runtime failure present.');
          }
          compileLogs.push('[GAME] Score: 0/10 test cases passed.');
        }
      } else {
        compileLogs.push(`❌ [ERROR] Backend execution rejected: ${data.error || 'Unknown Error'}`);
      }

      setCurrentMatch((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          myProgress: passed,
          logs: [...prev.logs, ...compileLogs]
        };
      });

    } catch (err) {
      console.error('Execution error:', err);
      setCurrentMatch((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          logs: [...prev.logs, `❌ [ERROR] Network error contacting backend compilation engine.`]
        };
      });
    }
  };

  const submitSolution = async () => {
    if (!currentMatch) return;
    try {
      const durationTaken = 1800 - currentMatch.timeRemaining;
      const res = await fetch(`${API_URL}/match/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roomCode: currentMatch.roomId,
          codeSubmitted: currentMatch.myCode,
          durationTaken
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentMatch((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            hasSubmitted: true,
            logs: [...prev.logs, `👑 [WINNER] Submission accepted! Waiting for game resolution...`]
          };
        });
      } else {
        setErrorNotification(data.error || 'Failed to submit solution.');
        setTimeout(() => setErrorNotification(null), 4000);
      }
    } catch (err) {
      setErrorNotification(err.message || 'Error submitting solution.');
      setTimeout(() => setErrorNotification(null), 4000);
    }
  };

  const forfeitMatch = async () => {
    if (!currentMatch) return;
    try {
      const res = await fetch(`${API_URL}/match/forfeit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ roomCode: currentMatch.roomId })
      });
      const data = await res.json();
      if (res.ok) {
        setMatchOutcome("FORFEIT_BY_ME");
        setShowSummaryModal(true);
      } else {
        setErrorNotification(data.error || 'Failed to forfeit match.');
        setTimeout(() => setErrorNotification(null), 4000);
      }
    } catch (err) {
      setErrorNotification(err.message || 'Error forfeiting match.');
      setTimeout(() => setErrorNotification(null), 4000);
    }
  };

  const dissolvePrivateRoom = () => {
    setCurrentMatch(null);
    setHostRoomCode(null);
    setShowSummaryModal(false);
    setMatchOutcome(null);
  };

  const closeMatchModal = () => {
    setCurrentMatch(null);
    setHostRoomCode(null);
    setShowSummaryModal(false);
    setMatchOutcome(null);
  };

  return (
    <GameContext.Provider
      value={{

        lobbyUsers,
        isQueueing,
        queueTime,
        currentMatch,
        hostRoomCode,
        incomingChallenge,
        errorNotification,
        setErrorNotification,
        leaderboard,
        showSummaryModal,
        setShowSummaryModal,
        matchOutcome,
        setMatchOutcome,
        startQueue,
        stopQueue,
        generateHostCode,
        verifyAndJoinRoom,
        challengePlayer,
        acceptChallenge,
        declineChallenge,
        updateMyCode,
        runDiagnostics,
        submitSolution,
        forfeitMatch,
        dissolvePrivateRoom,
        closeMatchModal
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};

export default GameContext;
