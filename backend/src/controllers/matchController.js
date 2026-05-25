import { Match } from '../models/Match.js';
import { Problem } from '../models/Problem.js';
import { User } from '../models/User.js';

// Create a new match room (Host trigger)
export const createMatch = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { difficulty } = req.body;

    let query = {};
    if (difficulty && ['Easy', 'Medium', 'Hard'].includes(difficulty)) {
      query.difficulty = difficulty;
    }

    // Select a random problem from the seeded database matching the query
    const problemCount = await Problem.countDocuments(query);
    if (problemCount === 0) {
      return res.status(504).json({ error: `No problems found matching difficulty: ${difficulty}` });
    }

    const randomIndex = Math.floor(Math.random() * problemCount);
    const problem = await Problem.findOne(query).skip(randomIndex);

    if (!problem) {
      return res.status(500).json({ error: 'Failed to retrieve a challenge problem matching selection.' });
    }

    // Generate a unique 6-character room code starting with XA
    let roomCode = '';
    let isUnique = false;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    while (!isUnique) {
      roomCode = 'XA';
      for (let i = 0; i < 4; i++) {
        roomCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existingMatch = await Match.findOne({ roomCode });
      if (!existingMatch) {
        isUnique = true;
      }
    }

    // Create the OPEN match document
    const match = new Match({
      roomCode,
      problemId: problem._id,
      host: {
        userId,
        durationTaken: null,
        progress: 0,
        codeSubmitted: ''
      },
      guest: null,
      status: 'OPEN',
      winnerId: null
    });

    await match.save();

    const populatedMatch = await Match.findById(match._id)
      .populate('problemId')
      .populate('host.userId', 'username xp stats');

    return res.status(201).json({
      message: 'Match duel room initiated successfully.',
      roomCode,
      match: populatedMatch
    });
  } catch (err) {
    console.error('Create match error:', err);
    return res.status(500).json({ error: 'Failed to create match: ' + err.message });
  }
};

// Join an open match room (Guest trigger)
export const joinMatch = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { roomCode } = req.params;

    if (!roomCode) {
      return res.status(400).json({ error: 'Valid 6-digit Room Code is required.' });
    }

    // Find the match to check pre-conditions and return informative error messages
    const matchExists = await Match.findOne({ roomCode });
    if (!matchExists) {
      return res.status(404).json({ error: 'Room code not found.' });
    }

    if (matchExists.status !== 'OPEN') {
      return res.status(400).json({ error: 'Match duel already started or concluded.' });
    }

    if (matchExists.host.userId.toString() === userId) {
      return res.status(400).json({ error: 'You cannot join your own hosted duel.' });
    }

    // Atomically join the match room to prevent concurrent join race conditions
    const match = await Match.findOneAndUpdate(
      {
        roomCode,
        status: 'OPEN',
        'host.userId': { $ne: userId }
      },
      {
        $set: {
          guest: {
            userId,
            durationTaken: null,
            progress: 0,
            codeSubmitted: ''
          },
          status: 'ACTIVE',
          startedAt: new Date()
        }
      },
      { new: true }
    )
      .populate('problemId')
      .populate('host.userId', 'username xp stats')
      .populate('guest.userId', 'username xp stats');

    if (!match) {
      return res.status(400).json({ error: 'Failed to join match. Room might have been filled by another player.' });
    }

    return res.json({
      message: 'Joined battle arena successfully.',
      match
    });
  } catch (err) {
    console.error('Join match error:', err);
    return res.status(500).json({ error: 'Failed to join match: ' + err.message });
  }
};

// Get match status and telemetry progress (Short-polling endpoint)
export const getMatchStatus = async (req, res) => {
  try {
    const { roomCode } = req.params;

    if (!roomCode) {
      return res.status(400).json({ error: 'Room Code parameter required.' });
    }

    let match = await Match.findOne({ roomCode })
      .populate('problemId')
      .populate('host.userId', 'username xp stats')
      .populate('guest.userId', 'username xp stats')
      .populate('winnerId', 'username');

    if (!match) {
      return res.status(404).json({ error: 'Active match room not found.' });
    }

    let timeRemaining = 1800; // 30 minutes match duration limit

    if (match.status === 'ACTIVE' && match.startedAt) {
      const elapsedSeconds = Math.floor((Date.now() - match.startedAt.getTime()) / 1000);
      timeRemaining = Math.max(0, 1800 - elapsedSeconds);

      if (timeRemaining === 0) {
        // Atomic dynamic resolution on timeout
        match.status = 'RESOLVED';

        const hostSubmitted = match.host.durationTaken !== null;
        const guestSubmitted = match.guest && match.guest.durationTaken !== null;

        const userHost = await User.findById(match.host.userId);
        const userGuest = match.guest ? await User.findById(match.guest.userId) : null;

        if (userHost && userGuest) {
          userHost.stats.duelsPlayed += 1;
          userGuest.stats.duelsPlayed += 1;

          if (hostSubmitted && !guestSubmitted) {
            match.winnerId = userHost._id;
            userHost.xp += 30;
            userHost.stats.wins += 1;
            userHost.stats.currentStreak += 1;

            userGuest.xp = Math.max(0, userGuest.xp - 15);
            userGuest.stats.currentStreak = 0;
          } else if (guestSubmitted && !hostSubmitted) {
            match.winnerId = userGuest._id;
            userGuest.xp += 30;
            userGuest.stats.wins += 1;
            userGuest.stats.currentStreak += 1;

            userHost.xp = Math.max(0, userHost.xp - 15);
            userHost.stats.currentStreak = 0;
          } else {
            // Draw: neither submitted
            userHost.xp += 10;
            userGuest.xp += 10;
          }

          await userHost.save();
          await userGuest.save();
        }

        await match.save();

        // Re-fetch populated match to return correct resolved state
        match = await Match.findOne({ roomCode })
          .populate('problemId')
          .populate('host.userId', 'username xp stats')
          .populate('guest.userId', 'username xp stats')
          .populate('winnerId', 'username');
      }
    } else if (match.status === 'RESOLVED') {
      timeRemaining = 0;
    }

    // Return the match document converted to an object with timeRemaining injected
    const matchObj = match.toObject();
    matchObj.timeRemaining = timeRemaining;

    return res.json({
      match: matchObj
    });
  } catch (err) {
    console.error('Get status error:', err);
    return res.status(500).json({ error: 'Failed to fetch match status: ' + err.message });
  }
};

// Update coding diagnostics progress fraction
export const updateProgress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { roomCode, progress } = req.body;

    if (!roomCode || progress === undefined) {
      return res.status(400).json({ error: 'Room code and progress fraction required.' });
    }

    const match = await Match.findOne({ roomCode });
    if (!match) {
      return res.status(404).json({ error: 'Match room not found.' });
    }

    if (match.host.userId.toString() === userId) {
      match.host.progress = progress;
    } else if (match.guest && match.guest.userId.toString() === userId) {
      match.guest.progress = progress;
    } else {
      return res.status(403).json({ error: 'Access denied. You are not a player in this match.' });
    }

    await match.save();

    return res.json({
      message: 'Telemetry progress synchronized.',
      match
    });
  } catch (err) {
    console.error('Update progress error:', err);
    return res.status(500).json({ error: 'Failed to update progress: ' + err.message });
  }
};

// Submit code solution & calculate victory/defeat
export const submitMatch = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { roomCode, codeSubmitted, durationTaken } = req.body;

    if (!roomCode || !codeSubmitted || durationTaken === undefined) {
      return res.status(400).json({ error: 'Room code, codeSubmitted content, and durationTaken are required.' });
    }

    const match = await Match.findOne({ roomCode });
    if (!match) {
      return res.status(404).json({ error: 'Match room not found.' });
    }

    const isHost = match.host.userId.toString() === userId;
    const isGuest = match.guest && match.guest.userId.toString() === userId;

    if (!isHost && !isGuest) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (isHost) {
      if (match.host.progress !== 10) {
        return res.status(400).json({ error: 'You must pass all 10 test cases before submitting.' });
      }
      match.host.codeSubmitted = codeSubmitted;
      match.host.durationTaken = durationTaken;
    } else {
      if (!match.guest || match.guest.progress !== 10) {
        return res.status(400).json({ error: 'You must pass all 10 test cases before submitting.' });
      }
      match.guest.codeSubmitted = codeSubmitted;
      match.guest.durationTaken = durationTaken;
    }

    // Check if BOTH players have submitted or time expired
    // The match transitions to RESOLVED if both durationTaken are set (meaning both finished/submitted)
    const hostSubmitted = match.host.durationTaken !== null;
    const guestSubmitted = match.guest && match.guest.durationTaken !== null;

    if (hostSubmitted && guestSubmitted) {
      match.status = 'RESOLVED';

      // Evaluate winner based on lowest durationTaken
      const hostTime = match.host.durationTaken;
      const guestTime = match.guest.durationTaken;

      const userHost = await User.findById(match.host.userId);
      const userGuest = await User.findById(match.guest.userId);

      if (userHost && userGuest) {
        userHost.stats.duelsPlayed += 1;
        userGuest.stats.duelsPlayed += 1;

        if (hostTime < guestTime) {
          match.winnerId = userHost._id;
          userHost.xp += 30;
          userHost.stats.wins += 1;
          userHost.stats.currentStreak += 1;

          userGuest.xp = Math.max(0, userGuest.xp - 15);
          userGuest.stats.currentStreak = 0;
        } else if (guestTime < hostTime) {
          match.winnerId = userGuest._id;
          userGuest.xp += 30;
          userGuest.stats.wins += 1;
          userGuest.stats.currentStreak += 1;

          userHost.xp = Math.max(0, userHost.xp - 15);
          userHost.stats.currentStreak = 0;
        } else {
          // Draw case: both get +10 XP
          userHost.xp += 10;
          userGuest.xp += 10;
        }

        await userHost.save();
        await userGuest.save();
      }
    }

    await match.save();

    return res.json({
      message: 'Submission successfully received.',
      match
    });
  } catch (err) {
    console.error('Submit match error:', err);
    return res.status(500).json({ error: 'Failed to submit match: ' + err.message });
  }
};

// Immediate Forfeit Match trigger
export const forfeitMatch = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { roomCode } = req.body;

    if (!roomCode) {
      return res.status(400).json({ error: 'Room Code is required.' });
    }

    const match = await Match.findOne({ roomCode });
    if (!match) {
      return res.status(404).json({ error: 'Match room not found.' });
    }

    if (match.status === 'RESOLVED') {
      return res.status(400).json({ error: 'Match already resolved.' });
    }

    const isHost = match.host.userId.toString() === userId;
    const isGuest = match.guest && match.guest.userId.toString() === userId;

    if (!isHost && !isGuest) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    match.status = 'RESOLVED';

    const userHost = await User.findById(match.host.userId);
    const userGuest = match.guest ? await User.findById(match.guest.userId) : null;

    if (isHost) {
      // Host forfeited: guest is winner
      if (userGuest) {
        match.winnerId = userGuest._id;
        userGuest.xp += 30;
        userGuest.stats.wins += 1;
        userGuest.stats.currentStreak += 1;
        userGuest.stats.duelsPlayed += 1;
        await userGuest.save();
      }
      if (userHost) {
        userHost.xp = Math.max(0, userHost.xp - 50); // -50 XP penalty for forfeit
        userHost.stats.currentStreak = 0;
        userHost.stats.duelsPlayed += 1;
        await userHost.save();
      }
    } else if (isGuest) {
      // Guest forfeited: host is winner
      if (userHost) {
        match.winnerId = userHost._id;
        userHost.xp += 30;
        userHost.stats.wins += 1;
        userHost.stats.currentStreak += 1;
        userHost.stats.duelsPlayed += 1;
        await userHost.save();
      }
      if (userGuest) {
        userGuest.xp = Math.max(0, userGuest.xp - 50); // -50 XP penalty for forfeit
        userGuest.stats.currentStreak = 0;
        userGuest.stats.duelsPlayed += 1;
        await userGuest.save();
      }
    }

    await match.save();

    return res.json({
      message: 'Forfeited game successfully.',
      match
    });
  } catch (err) {
    console.error('Forfeit match error:', err);
    return res.status(500).json({ error: 'Failed to forfeit match: ' + err.message });
  }
};
