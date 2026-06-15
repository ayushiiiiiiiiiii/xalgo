import express from 'express';
import { getAllProblems, getProblemOfTheDay } from '../controllers/problemController.js';

const router = express.Router();

router.get('/', getAllProblems);

router.get('/potd', getProblemOfTheDay);

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
