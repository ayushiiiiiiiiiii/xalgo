import express from 'express';
import { createServer } from 'http';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { Problem } from './models/Problem.js';
import authRoutes from './routes/authRoutes.js';
import problemRoutes from './routes/problemRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.JWT_SECRET) {
  console.error('❌ [FATAL] JWT_SECRET environment variable is missing! Exiting to preserve security grid.');
  process.exit(1);
}

const PORT = process.env.PORT || '3001';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/xalgo';
const JWT_SECRET = process.env.JWT_SECRET;

const app = express();
const httpServer = createServer(app);

let isConnected = false;
async function ensureDB() {
  if (isConnected && mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGODB_URI);
  isConnected = true;
}

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());

app.use(async (req, res, next) => {
  try {
    await ensureDB();
    next();
  } catch (err) {
    console.error('❌ [DATABASE] Connection failed on request:', err.message);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

app.use((req, res, next) => {
  console.log(`🌐 [REQUEST] ${req.method} ${req.url}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/match', matchRoutes);

app.get('/api/health', (req, res) => {
  const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'HEALTHY',
    timestamp: new Date(),
    db: dbState[mongoose.connection.readyState] || 'unknown',
    hasMongoUri: !!process.env.MONGODB_URI,
    hasJwtSecret: !!process.env.JWT_SECRET
  });
});

ensureDB()
  .then(() => {
    console.log('⚡ [DATABASE] Secured link to MongoDB.');
    seedDefaultProblems();
  })
  .catch((err) => {
    console.error('❌ [DATABASE] Initial connection failed:', err.message);
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

httpServer.listen(PORT, () => {
  console.log(`🚀 [SERVER] XAlgo Backend Engine running on port ${PORT}`);
});

export default app;
