import express from 'express';
import { getAllProblems, getProblemOfTheDay } from '../controllers/problemController.js';

const router = express.Router();

// Retrieve all problems
router.get('/', getAllProblems);

// Retrieve today's Problem of the Day (POTD)
router.get('/potd', getProblemOfTheDay);

// Scrape and import a problem from a website link
router.post('/import-web', async (req, res) => {
  try {
    const { importProblemFromWeb } = await import('../controllers/scraperController.js');
    return importProblemFromWeb(req, res);
  } catch (err) {
    console.warn('⚠️ [IMPORT] Scraper subsystem is unavailable on this deployment.');
    return res.status(501).json({
      error: 'Feature Not Implemented: Scraper subsystem is not available on this deployment.'
    });
  }
});

export default router;
