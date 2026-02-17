import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import {
  startGame,
  submitGuess,
  getHint,
  getWordleStats
} from '@/controllers/wordleController';

const router = Router();

router.use(authenticate);

router.get('/start', startGame);

router.post('/guess', submitGuess);

router.post('/hint', getHint);

router.get('/stats', getWordleStats);

export default router;
