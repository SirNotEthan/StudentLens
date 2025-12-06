import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import {
  getNewWord,
  validateWord,
  submitGameResult,
  getWordleStats
} from '@/controllers/wordleController';

const router = Router();

// All Wordle routes require authentication
router.use(authenticate);

// Get a new random word for the game
router.get('/new-word', getNewWord);

// Validate if a word is in the word list
router.post('/validate-word', validateWord);

// Submit game result (win/loss) and update stats
router.post('/submit-result', submitGameResult);

// Get current user's Wordle stats
router.get('/stats', getWordleStats);

export default router;
