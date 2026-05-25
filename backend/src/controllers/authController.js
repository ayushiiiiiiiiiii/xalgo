import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const register = async (req, res) => {
  const { username, email, password } = req.body;
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return res.status(500).json({ error: 'Server configuration error: Authentication key not initialized.' });
  }

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All authentication fields are required.' });
  }

  // Type checks to defend against NoSQL injection vectors
  if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'System requires valid string formats for credential parameters.' });
  }

  // Sanitization: Escape active HTML characters to fully block XSS injection
  const cleanUsername = username.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
  if (cleanUsername.length === 0) {
    return res.status(400).json({ error: 'Username must contain valid non-empty alphanumeric characters.' });
  }

  // Formatting Validation: Strict email verification via standard regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'System requires a valid email coordinate format.' });
  }

  // Length Validation: Minimum password depth bound check
  if (password.length < 6) {
    return res.status(400).json({ error: 'System security requires passwords to be at least 6 characters.' });
  }

  try {
    // Perform database checks for collisions on uniqueness rules using sanitized username
    const existingUser = await User.findOne({ $or: [{ username: cleanUsername }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Credentials already registered on the grid.' });
    }

    const newUser = new User({ username: cleanUsername, email, password });
    await newUser.save();

    const token = jwt.sign(
      { userId: newUser._id, username: newUser.username },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        xp: newUser.xp,
        goldCoins: newUser.goldCoins,
        level: newUser.level,
        battleStats: newUser.stats,
        status: newUser.status
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server allocation failure: ' + err.message });
  }
};

export const login = async (req, res) => {
  const { identifier, password } = req.body;
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return res.status(500).json({ error: 'Server configuration error: Authentication key not initialized.' });
  }

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifier and Password fields are required.' });
  }

  // Type checks to defend against NoSQL injection vectors
  if (typeof identifier !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'System requires valid string formats for login credentials.' });
  }

  try {
    // Query model storage: User.findOne({ $or: [{ email: identifier }, { username: identifier }] })
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid access clearance.' });
    }

    // Execute bcrypt.compare(password, user.password)
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid access clearance.' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        xp: user.xp,
        goldCoins: user.goldCoins,
        level: user.level,
        battleStats: user.stats,
        status: user.status
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server authentication failure: ' + err.message });
  }
};

export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Server authentication configuration issue.' });
    }
    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        console.error('❌ [AUTH] JWT Verification failed:', err.message);
        return res.status(403).json({ error: 'Clearance refused.' });
      }
      req.user = decoded;
      next();
    });
  } else {
    return res.status(401).json({ error: 'Clearance token required.' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    return res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        xp: user.xp,
        goldCoins: user.goldCoins,
        level: user.level,
        battleStats: user.stats,
        status: user.status
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve profile: ' + err.message });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const users = await User.find({}).sort({ xp: -1 }).limit(5);
    const leaderboard = users.map(user => ({
      username: user.username,
      xp: user.xp,
      rank: user.xp < 500 ? 'Script Kiddie' : 'Code Commander'
    }));
    return res.json({ leaderboard });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve leaderboard: ' + err.message });
  }
};
