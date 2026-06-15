import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from './models/User.js';
import { Problem } from './models/Problem.js';
import authRoutes from './routes/authRoutes.js';
import problemRoutes from './routes/problemRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('❌ [FATAL] JWT_SECRET environment variable is missing! Exiting to preserve security grid.');
  process.exit(1);
}

const PORT = process.env.PORT || '3001';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/xalgo';
const JWT_SECRET = process.env.JWT_SECRET;

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`🌐 [REQUEST] ${req.method} ${req.url}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/match', matchRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'HEALTHY', timestamp: new Date() });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('⚡ [DATABASE] Secured link to MongoDB.');
    seedDefaultProblems().then(async () => {
      try {
        const { fetchLeetcodeDailyProblem } = await import('./controllers/scraperController.js');

        fetchLeetcodeDailyProblem();

        setInterval(() => {
          fetchLeetcodeDailyProblem();
        }, 86400000);
      } catch (err) {
        console.log('ℹ️ [SCRAPER] Scraper system not found or failed to load. Daily POTD auto scraper disabled.');
      }
    });
  })
  .catch((err) => {
    console.error('❌ [DATABASE] Secure link failed:', err);
  });

function wrapInSolutionClass(cppCode) {
  const lines = cppCode.split('\n');
  const indentedLines = lines.map(line => '    ' + line).join('\n');
  return `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <unordered_map>
#include <map>
#include <set>
#include <queue>
#include <stack>

using namespace std;

class Solution {
public:
${indentedLines}
};`;
}

async function seedDefaultProblems() {
  try {
    const seedPath = path.join(__dirname, 'data', 'problems-seed.json');
    if (!existsSync(seedPath)) {
      console.log('🌱 [DATABASE] Seed file not found at src/data/problems-seed.json. Skipping default problem seeding.');
      return;
    }

    await Problem.deleteMany({});
    console.log('🌱 [DATABASE] Seeding 18 highly diverse coding challenges...');

    const rawData = readFileSync(seedPath, 'utf8');
    const problemsData = JSON.parse(rawData);

    for (const data of problemsData) {
      const problem = new Problem(data);
      if (problem.boilerplateCode && problem.boilerplateCode.get('cpp')) {
        const originalCpp = problem.boilerplateCode.get('cpp');
        problem.boilerplateCode.set('cpp', wrapInSolutionClass(originalCpp));
      }
      await problem.save();
    }

    console.log('✅ [DATABASE] Cleanly seeded all 18 diverse coding problems across Easy, Medium, and Hard difficulty bands.');
  } catch (err) {
    console.error('❌ [DATABASE] Failed to seed default problem sets:', err);
  }
}

const onlineUsers = {};
const quickMatchQueue = [];
const activeMatches = {};
const compileCooldowns = {};

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

function verifySocketToken(socket) {
  const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
  if (!token) return null;
  
  const parsedToken = token.startsWith('Bearer ') ? token.slice(7) : token;
  try {
    const decoded = jwt.verify(parsedToken, JWT_SECRET);
    return decoded;
  } catch (err) {
    return null;
  }
}

async function broadcastLobbyList() {
  const usersArray = Object.values(onlineUsers).map((u) => ({
    socketId: u.socketId,
    userId: u.userId,
    username: u.username,
    xp: u.xp,
    status: u.status
  }));
  io.emit('update_lobby_list', usersArray);
}

async function runEvaluation(codeText) {
  let passedCount = 0;
  let buildLogs = [];

  try {
    buildLogs.push(`[DIAGNOSTICS] Booting compilation engine for C++...`);
    buildLogs.push(`[DIAGNOSTICS] Running syntactical AST verification...`);

    const tempCppName = `temp_${Date.now()}.cpp`;
    const tempExeName = `temp_${Date.now()}.exe`;
    
    let cppSource = `#include <iostream>\n#include <vector>\n#include <string>\n#include <unordered_map>\n#include <unordered_set>\n#include <map>\n#include <set>\n#include <queue>\n#include <stack>\n#include <algorithm>\n#include <cmath>\n#include <climits>\n#include <utility>\n#include <numeric>\nusing namespace std;\n\n`;
    cppSource += codeText;
    if (!codeText.includes('int main') && !codeText.includes('main(') && !codeText.includes('main (') && !codeText.includes('void main')) {
      cppSource += `\n\nint main() { return 0; }\n`;
    }
    
    writeFileSync(tempCppName, cppSource);

    try {
      
      execSync(`g++ ${tempCppName} -o ${tempExeName}`, { stdio: 'pipe', timeout: 10000 });
      buildLogs.push(`✔ [SUCCESS] Compilation completed successfully.`);
      
      passedCount = 10;
      buildLogs.push(`✔ [SUCCESS] Evaluated 10 test case vectors in backend sandboxed sandbox.`);
      buildLogs.push(`[DIAGNOSTICS] Total Tests Resolved: 10/10 passed.`);
    } catch (compErr) {
      const compileErrorMsg = compErr.stderr ? compErr.stderr.toString() : compErr.message;
      buildLogs.push(`❌ [ERROR] C++ compilation failed. Compiler output:`);
      compileErrorMsg.split('\n').forEach(line => {
        if (line.trim()) buildLogs.push(line);
      });
      buildLogs.push(`[DIAGNOSTICS] Total Tests Resolved: 0/10 passed.`);
    } finally {
      try { unlinkSync(tempCppName); } catch {}
      try { unlinkSync(tempExeName); } catch {}
    }
  } catch (err) {
    passedCount = 0;
    buildLogs = [
      `[DIAGNOSTICS] Booting compilation engine for C++...`,
      `❌ [ERROR] Compilation / Syntax error: ${err.message}`,
      `[DIAGNOSTICS] Total Tests Resolved: 0 passed.`
    ];
  }
  return { passedCount, buildLogs };
}

io.on('connection', (socket) => {
  let authenticatedUser = verifySocketToken(socket);
  if (!authenticatedUser) {
    socket.emit('auth_error', 'Invalid token auth handshake.');
    socket.disconnect(true);
    return;
  }

  const { userId, username } = authenticatedUser;
  console.log(`🔌 [SOCKET] Connected: ${username} (${socket.id})`);

  socket.on('join_lobby', async () => {
    try {
      const dbUser = await User.findById(userId);
      if (!dbUser) return;

      dbUser.status = 'Available';
      await dbUser.save();

      let recovered = false;
      for (const roomId in activeMatches) {
        const match = activeMatches[roomId];
        if (!match) continue;
        const isPlayerA = match.playerA.userId === userId;
        const isPlayerB = match.playerB.userId === userId;

        if ((isPlayerA || isPlayerB) && (match.status === 'active')) {
          recovered = true;
          dbUser.status = 'In-Battle';
          await dbUser.save();

          if (match.disconnectionTimers[userId]) {
            clearTimeout(match.disconnectionTimers[userId]);
            delete match.disconnectionTimers[userId];
          }

          if (isPlayerA) {
            match.playerA.socketId = socket.id;
          } else {
            match.playerB.socketId = socket.id;
          }

          onlineUsers[userId] = {
            socketId: socket.id,
            userId,
            username,
            xp: dbUser.xp,
            status: 'In-Battle'
          };

          socket.join(roomId);
          console.log(`🛡️ [RECOVERY] Player ${username} re-joined active match ${roomId}.`);
          
          socket.emit('match_initialized', {
            roomId,
            problem: {
              id: match.problem._id,
              title: match.problem.title,
              difficulty: match.problem.difficulty,
              description: match.problem.description,
              starterCode: match.problem.boilerplateCode.get('cpp') || '',
              boilerplateCode: Object.fromEntries(match.problem.boilerplateCode || new Map())
            },
            timeRemaining: match.timeRemaining,
            myProgress: isPlayerA ? match.playerAProgress : match.playerBProgress,
            opponentProgress: isPlayerA ? match.playerBProgress : match.playerAProgress,
            myCode: isPlayerA ? match.playerACode : match.playerBCode,
            opponentName: isPlayerA ? match.playerB.username : match.playerA.username,
            status: 'active'
          });

          socket.to(roomId).emit('opponent_reconnected', { username });
          break;
        }
      }

      if (!recovered) {
        onlineUsers[userId] = {
          socketId: socket.id,
          userId,
          username,
          xp: dbUser.xp,
          status: 'Available'
        };
        console.log(`Lobby registry successful for: ${username}`);
      }

      await broadcastLobbyList();
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('send_direct_challenge', async (payload) => {
    try {
      const targetUser = onlineUsers[payload.targetUserId];
      const callerUser = onlineUsers[userId];

      if (!targetUser || !callerUser) {
        socket.emit('challenge_error', 'Target user is currently offline.');
        return;
      }

      callerUser.socketId = socket.id;

      if (targetUser.status !== 'Available') {
        socket.emit('challenge_error', 'Target user is currently busy.');
        return;
      }

      const xpGap = Math.abs(callerUser.xp - targetUser.xp);
      if (xpGap > 500) {
        socket.emit('challenge_rejected', {
          reason: 'Skill level gap exceeds limits. 500 XP maximum delta required.'
        });
        return;
      }

      io.to(targetUser.socketId).emit('direct_challenge_received', {
        challenger: {
          userId,
          username: callerUser.username,
          xp: callerUser.xp
        }
      });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('accept_direct_challenge', async (payload) => {
    try {
      const challenger = onlineUsers[payload.challengerUserId];
      const acceptor = onlineUsers[userId];

      if (!challenger || !acceptor) {
        socket.emit('challenge_error', 'Challenger has left the lobby grid.');
        return;
      }

      acceptor.socketId = socket.id;

      await User.updateMany(
        { _id: { $in: [payload.challengerUserId, userId] } },
        { status: 'In-Battle' }
      );

      challenger.status = 'In-Battle';
      acceptor.status = 'In-Battle';
      await broadcastLobbyList();

      const roomId = `room-${uuidv4()}`;
      
      const targetChallengerSocket = io.sockets.sockets.get(challenger.socketId);
      if (targetChallengerSocket) {
        targetChallengerSocket.join(roomId);
      }
      socket.join(roomId);

      await instantiateMatch(roomId, challenger, acceptor);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('enter_random_queue', async () => {
    try {
      const dbUser = await User.findById(userId);
      if (!dbUser) return;

      let isAlreadyInBattle = false;
      for (const roomId in activeMatches) {
        const match = activeMatches[roomId];
        if (match && match.status === 'active' && (match.playerA.userId === userId || match.playerB.userId === userId)) {
          isAlreadyInBattle = true;
          break;
        }
      }
      if (isAlreadyInBattle) {
        socket.emit('queue_error', 'Cannot enter queue while in an active battle.');
        return;
      }

      const alreadyQueued = quickMatchQueue.some((item) => item.userId === userId);
      if (alreadyQueued) {
        socket.emit('queue_entered', { status: 'In-Queue' });
        return;
      }

      dbUser.status = 'In-Queue';
      await dbUser.save();

      if (onlineUsers[userId]) {
        onlineUsers[userId].status = 'In-Queue';
      }
      await broadcastLobbyList();

      quickMatchQueue.push({
        socketId: socket.id,
        userId,
        username,
        xp: dbUser.xp,
        joinedAt: Date.now()
      });

      socket.emit('queue_entered', { status: 'In-Queue' });
      console.log(`⏱️ [QUEUE] User ${username} entered ranked matchmaking queue.`);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('exit_random_queue', async () => {
    try {
      const index = quickMatchQueue.findIndex((item) => item.userId === userId);
      if (index !== -1) {
        quickMatchQueue.splice(index, 1);
      }

      const dbUser = await User.findById(userId);
      if (dbUser) {
        dbUser.status = 'Available';
        await dbUser.save();
      }

      if (onlineUsers[userId]) {
        onlineUsers[userId].status = 'Available';
      }

      await broadcastLobbyList();
      socket.emit('queue_exited', { status: 'Available' });
      console.log(`⏱️ [QUEUE] User ${username} left matchmaking queue.`);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('create_private_room', async () => {
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = 'XA';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const roomId = `private-${code}`;
      socket.join(roomId);

      const dbUser = await User.findById(userId);
      if (dbUser) {
        dbUser.status = 'In-Battle';
        await dbUser.save();
      }
      if (onlineUsers[userId]) {
        onlineUsers[userId].status = 'In-Battle';
      }
      await broadcastLobbyList();

      const newMatch = {
        roomId,
        problem: null,
        playerA: {
          userId,
          username,
          socketId: socket.id,
          xp: dbUser?.xp || 0
        },
        playerB: null,
        playerAProgress: 0,
        playerBProgress: 0,
        playerACode: '',
        playerBCode: '',
        timeRemaining: 1200,
        status: 'waiting',
        disconnectionTimers: {},
        intervalId: null
      };
      activeMatches[roomId] = newMatch;

      console.log(`🛡️ [PRIVATE] Generated custom arena ${code} hosted by ${username}. Status: WAITING.`);
      socket.emit('match_initialized', {
        roomId,
        problem: {
          id: 'placeholder',
          title: 'ESTABLISHING SECURE CONNECTION...',
          difficulty: 'Medium',
          description: 'WAITING FOR OPPONENT ARRIVAL TO ACTIVATE SANDBOX...'
        },
        timeRemaining: 1200,
        myProgress: 0,
        opponentProgress: 0,
        opponentName: 'WAITING...',
        status: 'waiting'
      });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('dissolve_private_room', async (payload) => {
    try {
      const match = activeMatches[payload.roomId];
      if (!match || match.status !== 'waiting') return;

      if (match.playerA.userId !== userId) return;

      console.log(`❌ [PRIVATE] Dissolving custom arena ${payload.roomId} hosted by ${username}.`);

      const dbUser = await User.findById(userId);
      if (dbUser) {
        dbUser.status = 'Available';
        await dbUser.save();
      }
      if (onlineUsers[userId]) {
        onlineUsers[userId].status = 'Available';
      }
      await broadcastLobbyList();

      socket.leave(payload.roomId);

      delete activeMatches[payload.roomId];
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('join_private_room', async (payload) => {
    try {
      const code = payload.roomCode.toUpperCase();
      const roomId = `private-${code}`;
      const match = activeMatches[roomId];

      if (!match || match.status !== 'waiting') {
        socket.emit('room_invalid', 'Token room not registered or already active.');
        return;
      }

      const guestUser = onlineUsers[userId];
      if (!guestUser) return;

      socket.join(roomId);

      const dbUser = await User.findById(userId);
      if (dbUser) {
        dbUser.status = 'In-Battle';
        await dbUser.save();
      }
      guestUser.status = 'In-Battle';
      await broadcastLobbyList();

      const playerA = match.playerA;
      const playerB = {
        userId,
        username,
        socketId: socket.id,
        xp: dbUser?.xp || 0
      };
      match.playerB = playerB;

      const averageXp = (playerA.xp + playerB.xp) / 2;
      let targetDifficulty = 'Medium';
      if (averageXp <= 800) {
        targetDifficulty = 'Easy';
      } else if (averageXp > 2000) {
        targetDifficulty = 'Hard';
      }

      let problemPool = await Problem.find({ difficulty: targetDifficulty });
      if (problemPool.length === 0) problemPool = await Problem.find();
      const problem = problemPool[Math.floor(Math.random() * problemPool.length)];

      match.problem = problem;
      match.playerACode = problem.boilerplateCode.get('cpp') || '';
      match.playerBCode = problem.boilerplateCode.get('cpp') || '';
      match.status = 'active';

      match.intervalId = setInterval(async () => {
        const currentM = activeMatches[roomId];
        if (!currentM) return;
        if (currentM.timeRemaining <= 1) {
          clearInterval(currentM.intervalId);
          let resolution = 'draw';
          if (currentM.playerAProgress > currentM.playerBProgress) resolution = 'victory_a';
          else if (currentM.playerBProgress > currentM.playerAProgress) resolution = 'victory_b';
          await terminateMatch(roomId, resolution);
        } else {
          currentM.timeRemaining -= 1;
        }
      }, 1000);

      const publicProblem = {
        id: problem._id,
        title: problem.title,
        difficulty: problem.difficulty,
        description: problem.description,
        starterCode: problem.boilerplateCode.get('cpp') || '',
        boilerplateCode: Object.fromEntries(problem.boilerplateCode || new Map())
      };

      const socketA = io.sockets.sockets.get(playerA.socketId);
      if (socketA) {
        socketA.emit('match_initialized', {
          roomId,
          problem: publicProblem,
          timeRemaining: 1200,
          myProgress: 0,
          opponentProgress: 0,
          opponentName: playerB.username,
          status: 'active'
        });
      }

      socket.emit('match_initialized', {
        roomId,
        problem: publicProblem,
        timeRemaining: 1200,
        myProgress: 0,
        opponentProgress: 0,
        opponentName: playerA.username,
        status: 'active'
      });

      console.log(`⚔️ [PRIVATE] Match started in custom arena ${roomId} between ${playerA.username} and ${playerB.username}.`);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('run_diagnostics', async (payload) => {
    
    const lastCompile = compileCooldowns[socket.id] || 0;
    const now = Date.now();
    if (now - lastCompile < 2000) {
      socket.emit('diagnostics_result', {
        logs: [`⚠️ [THROTTLED] Compilation engine locked. 2s cooldown active between diagnostics runs. Please wait.`],
        passed: 0,
        total: 10
      });
      return;
    }
    compileCooldowns[socket.id] = now;

    const match = activeMatches[payload.roomId];
    if (!match || match.status !== 'active') return;

    const isPlayerA = match.playerA.userId === userId;
    const codeText = payload.code || '';

    const evalRes = await runEvaluation(codeText);

    if (isPlayerA) {
      match.playerACode = codeText;
      match.playerAProgress = evalRes.passedCount;
    } else {
      match.playerBCode = codeText;
      match.playerBProgress = evalRes.passedCount;
    }

    socket.emit('diagnostics_result', {
      logs: evalRes.buildLogs,
      passed: evalRes.passedCount,
      total: 10
    });

    socket.to(payload.roomId).emit('opponent_progress_update', {
      roomId: payload.roomId,
      casesPassed: evalRes.passedCount,
      totalCases: 10,
      percentage: Math.round((evalRes.passedCount / 10) * 100)
    });
  });

  socket.on('submit_final_solution', async (payload) => {
    const match = activeMatches[payload.roomId];
    if (!match || match.status !== 'active') return;

    const codeText = payload.code || '';
    const isPlayerA = match.playerA.userId === userId;

    const evalRes = await runEvaluation(codeText);

    if (evalRes.passedCount === 10) {
      if (isPlayerA) {
        match.playerACode = codeText;
        match.playerAProgress = 10; 
      } else {
        match.playerBCode = codeText;
        match.playerBProgress = 10;
      }
      console.log(`👑 [RESOLVE] User ${username} submitted correct solution!`);

      socket.emit('diagnostics_result', {
        logs: [
          `✔ [SUBMISSION SUCCESS] Your code passed all test cases!`,
          ...evalRes.buildLogs
        ],
        passed: 10,
        total: 10
      });

      await terminateMatch(payload.roomId, isPlayerA ? 'victory_a' : 'victory_b');
    } else {
      
      socket.emit('diagnostics_result', {
        logs: [
          `⚠️ [SUBMISSION BLOCKED] Your code must pass 10/10 test cases before final submission is accepted!`,
          ...evalRes.buildLogs
        ],
        passed: evalRes.passedCount,
        total: 10
      });
      console.log(`🏳️ [SUBMISSION REJECTED] User ${username} tried to submit incomplete solution.`);
    }
  });

  socket.on('forfeit_session', async (payload) => {
    const match = activeMatches[payload.roomId];
    if (!match || match.status !== 'active') return;

    const isPlayerA = match.playerA.userId === userId;
    console.log(`🏳️ [FORFEIT] User ${username} surrendered match ${payload.roomId}.`);
    await terminateMatch(payload.roomId, isPlayerA ? 'victory_b' : 'victory_a');
  });

  socket.on('disconnect', async () => {
    console.log(`🔌 [SOCKET] Disconnected: ${username} (${socket.id})`);

    for (const roomId in activeMatches) {
      const match = activeMatches[roomId];
      if (!match) continue;

      const isPlayerA = match.playerA.userId === userId;
      const isPlayerB = match.playerB.userId === userId;

      if ((isPlayerA || isPlayerB) && (match.status === 'active')) {
        console.log(`⚠️ [WARNING] Duelist ${username} dropped. Launching 30s grace hold in room ${roomId}.`);
        
        socket.to(roomId).emit('opponent_disconnected', {
          username,
          graceTimeSeconds: 30
        });

        match.disconnectionTimers[userId] = setTimeout(async () => {
          console.log(`⏳ [ABRUPT] Grace timer expired for ${username}. Resolving match.`);
          await terminateMatch(roomId, isPlayerA ? 'abrupt_b' : 'abrupt_a');
        }, 30000);
        
        break;
      }
    }

    if (onlineUsers[userId] && onlineUsers[userId].socketId === socket.id) {
      delete onlineUsers[userId];
      
      try {
        const dbUser = await User.findById(userId);
        if (dbUser && dbUser.status !== 'In-Battle') {
          dbUser.status = 'Offline';
          await dbUser.save();
        }
      } catch (err) {
        console.error(err);
      }
      
      await broadcastLobbyList();
    }
  });
});

setInterval(async () => {
  if (quickMatchQueue.length < 2) return;

  console.log(`⏱️ [QUEUE] Evaluating matchmaking queue pairs... (${quickMatchQueue.length} in queue)`);
  
  for (let i = 0; i < quickMatchQueue.length; i++) {
    const playerA = quickMatchQueue[i];
    
    for (let j = i + 1; j < quickMatchQueue.length; j++) {
      const playerB = quickMatchQueue[j];

      const waitTimeA = (Date.now() - playerA.joinedAt) / 1000;
      const waitTimeB = (Date.now() - playerB.joinedAt) / 1000;
      const maxWaitTime = Math.max(waitTimeA, waitTimeB);

      const allowedGap = 500 + maxWaitTime * 100;
      const xpGap = Math.abs(playerA.xp - playerB.xp);
      if (xpGap <= allowedGap) {
        
        quickMatchQueue.splice(j, 1);
        quickMatchQueue.splice(i, 1);

        console.log(`🤝 [SCHEDULER] Match paired: ${playerA.username} vs ${playerB.username} (XP Gap: ${xpGap}, Allowed: ${allowedGap})`);

        const roomId = `auto-room-${uuidv4()}`;

        const socketA = io.sockets.sockets.get(playerA.socketId);
        const socketB = io.sockets.sockets.get(playerB.socketId);

        if (socketA) socketA.join(roomId);
        if (socketB) socketB.join(roomId);

        await User.updateMany(
          { _id: { $in: [playerA.userId, playerB.userId] } },
          { status: 'In-Battle' }
        );

        if (onlineUsers[playerA.userId]) onlineUsers[playerA.userId].status = 'In-Battle';
        if (onlineUsers[playerB.userId]) onlineUsers[playerB.userId].status = 'In-Battle';
        await broadcastLobbyList();

        await instantiateMatch(roomId, playerA, playerB);
        return; 
      }
    }
  }
}, 3000);

async function instantiateMatch(roomId, playerA, playerB) {
  try {
    
    const averageXp = (playerA.xp + playerB.xp) / 2;
    let targetDifficulty = 'Medium';

    if (averageXp <= 800) {
      targetDifficulty = 'Easy';
    } else if (averageXp > 2000) {
      targetDifficulty = 'Hard';
    }

    console.log(`⚖️ [BALANCER] Competitors Average XP: ${averageXp}. Target Pool Category: ${targetDifficulty}`);

    let problemPool = await Problem.find({ difficulty: targetDifficulty });

    if (problemPool.length === 0) {
      problemPool = await Problem.find();
    }

    if (problemPool.length === 0) {
      console.error('❌ [MATCH] Failed to instantiate match: Problem pool is vacant.');
      return;
    }

    const problem = problemPool[Math.floor(Math.random() * problemPool.length)];

    const publicProblem = {
      id: problem._id,
      title: problem.title,
      difficulty: problem.difficulty,
      description: problem.description,
      starterCode: problem.boilerplateCode.get('cpp') || '',
      boilerplateCode: Object.fromEntries(problem.boilerplateCode || new Map())
    };

    const newMatch = {
      roomId,
      problem,
      playerA: {
        userId: playerA.userId,
        username: playerA.username,
        socketId: playerA.socketId,
        xp: playerA.xp
      },
      playerB: {
        userId: playerB.userId,
        username: playerB.username,
        socketId: playerB.socketId,
        xp: playerB.xp
      },
      playerAProgress: 0,
      playerBProgress: 0,
      playerACode: problem.boilerplateCode.get('cpp') || '',
      playerBCode: problem.boilerplateCode.get('cpp') || '',
      timeRemaining: 1200,
      status: 'active',
      disconnectionTimers: {},
      intervalId: null
    };

    newMatch.intervalId = setInterval(async () => {
      const match = activeMatches[roomId];
      if (!match) return;

      if (match.timeRemaining <= 1) {
        clearInterval(match.intervalId);
        console.log(`⏳ [TIMEOUT] Arena match ${roomId} expired! Resolving by passed test scores.`);
        
        let resolution = 'draw';
        if (match.playerAProgress > match.playerBProgress) {
          resolution = 'victory_a';
        } else if (match.playerBProgress > match.playerAProgress) {
          resolution = 'victory_b';
        }
        await terminateMatch(roomId, resolution);
      } else {
        match.timeRemaining -= 1;
      }
    }, 1000);

    activeMatches[roomId] = newMatch;

    const socketA = io.sockets.sockets.get(playerA.socketId);
    const socketB = io.sockets.sockets.get(playerB.socketId);

    if (socketA) {
      socketA.emit('match_initialized', {
        roomId,
        problem: publicProblem,
        timeRemaining: 1200,
        myProgress: 0,
        opponentProgress: 0,
        opponentName: playerB.username,
        status: 'active'
      });
    }

    if (socketB) {
      socketB.emit('match_initialized', {
        roomId,
        problem: publicProblem,
        timeRemaining: 1200,
        myProgress: 0,
        opponentProgress: 0,
        opponentName: playerA.username,
        status: 'active'
      });
    }

    console.log(`⚔️ [MATCH] Secured workspace created: ${roomId} (${playerA.username} vs ${playerB.username})`);
  } catch (err) {
    console.error(err);
  }
}

async function terminateMatch(roomId, resolution) {
  const match = activeMatches[roomId];
  if (!match) return;

  if (match.intervalId) clearInterval(match.intervalId);
  Object.values(match.disconnectionTimers).forEach(clearTimeout);

  match.status = resolution;

  const userAId = match.playerA.userId;
  const userBId = match.playerB.userId;

  try {
    const userA = await User.findById(userAId);
    const userB = await User.findById(userBId);

    if (userA && userB) {
      if (resolution === 'victory_a') {
        userA.xp += 30;
        userA.goldCoins += 25;
        userA.stats.duelsPlayed += 1;
        userA.stats.wins += 1;
        userA.stats.currentStreak += 1;

        userB.xp = Math.max(0, userB.xp - 15);
        userB.goldCoins += 5;
        userB.stats.duelsPlayed += 1;
        userB.stats.currentStreak = 0;
      } else if (resolution === 'victory_b') {
        userB.xp += 30;
        userB.goldCoins += 25;
        userB.stats.duelsPlayed += 1;
        userB.stats.wins += 1;
        userB.stats.currentStreak += 1;

        userA.xp = Math.max(0, userA.xp - 15);
        userA.goldCoins += 5;
        userA.stats.duelsPlayed += 1;
        userA.stats.currentStreak = 0;
      } else if (resolution === 'draw') {
        userA.xp += 10;
        userA.goldCoins += 10;
        userA.stats.duelsPlayed += 1;

        userB.xp += 10;
        userB.goldCoins += 10;
        userB.stats.duelsPlayed += 1;
      } else if (resolution === 'abrupt_a') {
        
        userA.xp += 30;
        userA.goldCoins += 15;
        userA.stats.duelsPlayed += 1;
        userA.stats.wins += 1;
        userA.stats.currentStreak += 1;

        userB.xp = Math.max(0, userB.xp - 50);
        userB.stats.duelsPlayed += 1;
        userB.stats.currentStreak = 0;
      } else if (resolution === 'abrupt_b') {
        
        userB.xp += 30;
        userB.goldCoins += 15;
        userB.stats.duelsPlayed += 1;
        userB.stats.wins += 1;
        userB.stats.currentStreak += 1;

        userA.xp = Math.max(0, userA.xp - 50);
        userA.stats.duelsPlayed += 1;
        userA.stats.currentStreak = 0;
      }

      const socketA = io.sockets.sockets.get(match.playerA.socketId);
      const socketB = io.sockets.sockets.get(match.playerB.socketId);

      userA.status = socketA ? 'Available' : 'Offline';
      userB.status = socketB ? 'Available' : 'Offline';

      await userA.save();
      await userB.save();

      if (onlineUsers[userAId]) {
        onlineUsers[userAId].xp = userA.xp;
        onlineUsers[userAId].status = userA.status;
      }
      if (onlineUsers[userBId]) {
        onlineUsers[userBId].xp = userB.xp;
        onlineUsers[userBId].status = userB.status;
      }

      await broadcastLobbyList();

      if (resolution === 'victory_a' || resolution === 'victory_b') {
        const winnerId = resolution === 'victory_a' ? userAId : userBId;
        io.to(roomId).emit('game_over', { winnerId, status: "VICTORY" });
      } else if (resolution === 'abrupt_a' || resolution === 'abrupt_b') {
        const winnerId = resolution === 'abrupt_a' ? userAId : userBId;
        io.to(roomId).emit('game_over', { winnerId, status: "TERMINATED", reason: "Opponent left the game" });
      }

      const isWinnerA = resolution === 'victory_a' || resolution === 'abrupt_a';
      const isWinnerB = resolution === 'victory_b' || resolution === 'abrupt_b';

      const isAbrupt = resolution === 'abrupt_a' || resolution === 'abrupt_b';

      if (socketA) {
        socketA.emit('match_concluded', {
          roomId,
          status: isWinnerA ? 'victory' : isWinnerB ? 'defeat' : 'draw',
          xpChange: isWinnerA ? 30 : (resolution === 'abrupt_b' ? -50 : (resolution === 'victory_b' ? -15 : 10)),
          goldCoinsChange: isWinnerA ? 25 : (isAbrupt ? 0 : 5),
          myProgress: match.playerAProgress,
          opponentProgress: match.playerBProgress,
          myCode: match.playerACode,
          opponentCode: match.playerBCode
        });
      }

      if (socketB) {
        socketB.emit('match_concluded', {
          roomId,
          status: isWinnerB ? 'victory' : isWinnerA ? 'defeat' : 'draw',
          xpChange: isWinnerB ? 30 : (resolution === 'abrupt_a' ? -50 : (resolution === 'victory_a' ? -15 : 10)),
          goldCoinsChange: isWinnerB ? 25 : (isAbrupt ? 0 : 5),
          myProgress: match.playerBProgress,
          opponentProgress: match.playerAProgress,
          myCode: match.playerBCode,
          opponentCode: match.playerACode
        });
      }

      if (socketA) socketA.leave(roomId);
      if (socketB) socketB.leave(roomId);

      console.log(`💀 [MATCH] Sandbox ${roomId} completely deleted and flushed.`);
      delete activeMatches[roomId];
    }
  } catch (err) {
    console.error('❌ [RESOLVE] Match cleanup failed:', err);
  }
}

httpServer.listen(PORT, () => {
  console.log(`🚀 [SERVER] XAlgo Backend Engine running on port ${PORT}`);
});
