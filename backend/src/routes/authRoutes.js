import express from 'express';
import { register, login, authenticateJWT, getProfile, getLeaderboard } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticateJWT, getProfile);
router.get('/leaderboard', authenticateJWT, getLeaderboard);

export default router;
