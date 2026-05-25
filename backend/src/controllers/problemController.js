import { Problem } from '../models/Problem.js';


// Retrieve all archived problems from grid MongoDB storage
export const getAllProblems = async (req, res) => {
  try {
    const problems = await Problem.find({}, '_id title difficulty description');
    return res.json(problems);
  } catch (err) {
    console.error('❌ [PROBLEMS] Get all failed:', err);
    return res.status(500).json({ error: 'System fault retrieving problems.' });
  }
};

// Dynamically resolve and return today's Problem of the Day (POTD)
export const getProblemOfTheDay = async (req, res) => {
  try {
    const problems = await Problem.find({});
    if (problems.length === 0) {
      return res.status(404).json({ error: 'No challenges registered in the database grid.' });
    }

    // Determine today's deterministic index based on calendar day (Day of Year)
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const diff = (today.getTime() - startOfYear.getTime()) + ((startOfYear.getTimezoneOffset() - today.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    const potdIndex = dayOfYear % problems.length;
    const potd = problems[potdIndex];

    return res.json({
      id: potd._id,
      title: potd.title,
      difficulty: potd.difficulty,
      description: potd.description,
      boilerplateCode: Object.fromEntries(potd.boilerplateCode || new Map())
    });
  } catch (err) {
    console.error('❌ [PROBLEMS] POTD resolution failed:', err);
    return res.status(500).json({ error: 'Internal system fault resolving daily challenge.' });
  }
};
