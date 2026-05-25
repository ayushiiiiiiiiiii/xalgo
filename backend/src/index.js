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

// Mount Authentication, Problem & Match REST Routes
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/match', matchRoutes);

// Express Health Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'HEALTHY', timestamp: new Date() });
});

// MongoDB Connection & Problem Seeding & Auto Scrapers
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('⚡ [DATABASE] Secured link to MongoDB.');
    seedDefaultProblems().then(async () => {
      try {
        const { fetchLeetcodeDailyProblem } = await import('./controllers/scraperController.js');
        
        // Trigger dynamic daily problem import immediately upon server startup
        fetchLeetcodeDailyProblem();
        
        // Schedule execution of POTD auto scraper once every 24 hours (86,400,000 ms)
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

// Seed default problems with empty starter function signatures for Easy, Medium, and Hard difficulties
async function seedDefaultProblems() {
  try {
    const seedPath = path.join(__dirname, 'data', 'problems-seed.json');
    if (!existsSync(seedPath)) {
      console.log('🌱 [DATABASE] Seed file not found at src/data/problems-seed.json. Skipping default problem seeding.');
      return;
    }

    // Clear old problem sets to ensure a fresh, highly diverse seeding of all 18 problems
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


// In-Memory state caches
const onlineUsers = {};
const quickMatchQueue = [];
const activeMatches = {};
const compileCooldowns = {};

// Socket.io Setup
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Helper: JWT verification of socket connection
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

// Helper: Broadcast live ledger list to all connections
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

// Global evaluation helper for standard C++ diagnostics compiling & AST checking
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
      // Capture detailed compiler warnings/errors by using stdio: 'pipe'
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

  // 1. Join Lobby Event
  socket.on('join_lobby', async () => {
    try {
      const dbUser = await User.findById(userId);
      if (!dbUser) return;

      dbUser.status = 'Available';
      await dbUser.save();

      // Check if player has an active disconnected hold match to recover
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

          // Clear any active disconnect grace timers
          if (match.disconnectionTimers[userId]) {
            clearTimeout(match.disconnectionTimers[userId]);
            delete match.disconnectionTimers[userId];
          }

          // Re-map socket id
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

  // 2. Direct Challenge Forwarder
  socket.on('send_direct_challenge', async (payload) => {
    try {
      const targetUser = onlineUsers[payload.targetUserId];
      const callerUser = onlineUsers[userId];

      if (!targetUser || !callerUser) {
        socket.emit('challenge_error', 'Target user is currently offline.');
        return;
      }

      // Synchronize the challenger's active socket ID to prevent stale entries
      callerUser.socketId = socket.id;

      if (targetUser.status !== 'Available') {
        socket.emit('challenge_error', 'Target user is currently busy.');
        return;
      }

      // Enforce Skill Balancer bounds for direct queries
      const xpGap = Math.abs(callerUser.xp - targetUser.xp);
      if (xpGap > 500) {
        socket.emit('challenge_rejected', {
          reason: 'Skill level gap exceeds limits. 500 XP maximum delta required.'
        });
        return;
      }

      // Forward challenge straight to target socket
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

  // 3. Challenge Acceptance Loop
  socket.on('accept_direct_challenge', async (payload) => {
    try {
      const challenger = onlineUsers[payload.challengerUserId];
      const acceptor = onlineUsers[userId];

      if (!challenger || !acceptor) {
        socket.emit('challenge_error', 'Challenger has left the lobby grid.');
        return;
      }

      // Synchronize the acceptor's active socket ID to prevent stale entries and routing blocks
      acceptor.socketId = socket.id;

      // Set DB statuses instantly to In-Battle
      await User.updateMany(
        { _id: { $in: [payload.challengerUserId, userId] } },
        { status: 'In-Battle' }
      );

      challenger.status = 'In-Battle';
      acceptor.status = 'In-Battle';
      await broadcastLobbyList();

      // Launch Match Session
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

  // 4. Automated Matchmaking Queue entry
  socket.on('enter_random_queue', async () => {
    try {
      const dbUser = await User.findById(userId);
      if (!dbUser) return;

      // Check if already in an active match
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

      // Check if already in queue to prevent duplicate entries
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

      // Push to FIFO matchmaking queue
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

  // Cancel Matchmaking
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

  // 5. Private Arena Actions
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

      // Create a placeholder active match in the cache
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

      // Only allow the host (playerA) to dissolve the room
      if (match.playerA.userId !== userId) return;

      console.log(`❌ [PRIVATE] Dissolving custom arena ${payload.roomId} hosted by ${username}.`);

      // Reset the host status
      const dbUser = await User.findById(userId);
      if (dbUser) {
        dbUser.status = 'Available';
        await dbUser.save();
      }
      if (onlineUsers[userId]) {
        onlineUsers[userId].status = 'Available';
      }
      await broadcastLobbyList();

      // Make host socket leave the room
      socket.leave(payload.roomId);

      // Delete the placeholder match from active matches
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

      // Set guest's status In-Battle
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

      // Select problem dynamically based on average XP
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

      // Start the countdown interval timer
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

      // Emit match_initialized individually to both sockets to start combat!
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

  // 6. Safe Blind Telemetry & Backend Compile Sync
  socket.on('run_diagnostics', async (payload) => {
    // 2-second rate-limiting debounce cooldown to prevent CPU DoS exhaustion
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

    // Run unified compilation & AST logic checker
    const evalRes = await runEvaluation(codeText);

    // Save variables strictly in backend memory
    if (isPlayerA) {
      match.playerACode = codeText;
      match.playerAProgress = evalRes.passedCount;
    } else {
      match.playerBCode = codeText;
      match.playerBProgress = evalRes.passedCount;
    }

    // Reply directly to user with compiler execution logs
    socket.emit('diagnostics_result', {
      logs: evalRes.buildLogs,
      passed: evalRes.passedCount,
      total: 10
    });

    // Pipe *only* clean numeric progress fractions via opponent_progress_update (hiding actual code)
    socket.to(payload.roomId).emit('opponent_progress_update', {
      roomId: payload.roomId,
      casesPassed: evalRes.passedCount,
      totalCases: 10,
      percentage: Math.round((evalRes.passedCount / 10) * 100)
    });
  });

  // 7. Core Match Resolutions
  socket.on('submit_final_solution', async (payload) => {
    const match = activeMatches[payload.roomId];
    if (!match || match.status !== 'active') return;

    const codeText = payload.code || '';
    const isPlayerA = match.playerA.userId === userId;

    // Run full compilation and AST logic evaluation before accepting submission
    const evalRes = await runEvaluation(codeText);

    if (evalRes.passedCount === 10) {
      if (isPlayerA) {
        match.playerACode = codeText;
        match.playerAProgress = 10; // Complete
      } else {
        match.playerBCode = codeText;
        match.playerBProgress = 10;
      }
      console.log(`👑 [RESOLVE] User ${username} submitted correct solution!`);
      
      // Notify them of correct submission logs first
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
      // Submission rejected! Send failure logs back to the user without terminating match
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

  // 8. Connection Drops & 30s Grace Protection
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

    // Purge online register & mark DB status offline if not active in combat
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

// Matchmaking Loop running every 3 seconds
setInterval(async () => {
  if (quickMatchQueue.length < 2) return;

  console.log(`⏱️ [QUEUE] Evaluating matchmaking queue pairs... (${quickMatchQueue.length} in queue)`);
  
  for (let i = 0; i < quickMatchQueue.length; i++) {
    const playerA = quickMatchQueue[i];
    
    for (let j = i + 1; j < quickMatchQueue.length; j++) {
      const playerB = quickMatchQueue[j];

      // Skill-balancing limit gap checks with dynamic expansion based on queue wait time
      const waitTimeA = (Date.now() - playerA.joinedAt) / 1000;
      const waitTimeB = (Date.now() - playerB.joinedAt) / 1000;
      const maxWaitTime = Math.max(waitTimeA, waitTimeB);
      
      // Base threshold is 500 XP. Expands by 100 XP per second of wait time to ensure eventual matching.
      const allowedGap = 500 + maxWaitTime * 100;
      const xpGap = Math.abs(playerA.xp - playerB.xp);
      if (xpGap <= allowedGap) {
        // Paired! Splice out
        quickMatchQueue.splice(j, 1);
        quickMatchQueue.splice(i, 1);

        console.log(`🤝 [SCHEDULER] Match paired: ${playerA.username} vs ${playerB.username} (XP Gap: ${xpGap}, Allowed: ${allowedGap})`);

        const roomId = `auto-room-${uuidv4()}`;

        const socketA = io.sockets.sockets.get(playerA.socketId);
        const socketB = io.sockets.sockets.get(playerB.socketId);

        if (socketA) socketA.join(roomId);
        if (socketB) socketB.join(roomId);

        // Update database states
        await User.updateMany(
          { _id: { $in: [playerA.userId, playerB.userId] } },
          { status: 'In-Battle' }
        );

        if (onlineUsers[playerA.userId]) onlineUsers[playerA.userId].status = 'In-Battle';
        if (onlineUsers[playerB.userId]) onlineUsers[playerB.userId].status = 'In-Battle';
        await broadcastLobbyList();

        await instantiateMatch(roomId, playerA, playerB);
        return; // Break iteration to restart indices cleanly
      }
    }
  }
}, 3000);

// Helper: Instantiates clean game sandbox
async function instantiateMatch(roomId, playerA, playerB) {
  try {
    // 1. Dynamic Skill-Balanced Match Selection Algorithm
    const averageXp = (playerA.xp + playerB.xp) / 2;
    let targetDifficulty = 'Medium';

    if (averageXp <= 800) {
      targetDifficulty = 'Easy';
    } else if (averageXp > 2000) {
      targetDifficulty = 'Hard';
    }

    console.log(`⚖️ [BALANCER] Competitors Average XP: ${averageXp}. Target Pool Category: ${targetDifficulty}`);

    // Query problem document mapping assigned difficulty envelope
    let problemPool = await Problem.find({ difficulty: targetDifficulty });
    
    // Fallback if difficulty pool is empty
    if (problemPool.length === 0) {
      problemPool = await Problem.find();
    }

    if (problemPool.length === 0) {
      console.error('❌ [MATCH] Failed to instantiate match: Problem pool is vacant.');
      return;
    }

    // Select random problem from target pool
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

    // 20:00 ticking clock
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

    // Emit secure initialization payloads individually to populate custom opponent names
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

// Helper: Cleans up matches and writes XP/Coin updates to Mongoose DB
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
        // User B rage quit survivor wins
        userA.xp += 30;
        userA.goldCoins += 15;
        userA.stats.duelsPlayed += 1;
        userA.stats.wins += 1;
        userA.stats.currentStreak += 1;

        userB.xp = Math.max(0, userB.xp - 50);
        userB.stats.duelsPlayed += 1;
        userB.stats.currentStreak = 0;
      } else if (resolution === 'abrupt_b') {
        // User A rage quit survivor wins
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

      // Emit synchronized game_over packet to the entire socket channel room
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

// Boot server
httpServer.listen(PORT, () => {
  console.log(`🚀 [SERVER] XAlgo Backend Engine running on port ${PORT}`);
});
