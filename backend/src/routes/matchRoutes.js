import express from 'express';
import { authenticateJWT } from '../controllers/authController.js';
import {
  createMatch,
  joinMatch,
  getMatchStatus,
  updateProgress,
  submitMatch,
  forfeitMatch
} from '../controllers/matchController.js';

const router = express.Router();

// Apply JWT authentication to all match endpoints
router.post('/create', authenticateJWT, createMatch);
router.put('/join/:roomCode', authenticateJWT, joinMatch);
router.get('/status/:roomCode', authenticateJWT, getMatchStatus);
router.patch('/progress', authenticateJWT, updateProgress);
router.post('/submit', authenticateJWT, submitMatch);
router.post('/forfeit', authenticateJWT, forfeitMatch);

export default router;
