import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import {
  getNewPuzzle,
  validateWord,
  submitGameResult,
  getSpellingBeeStats
} from '@/controllers/spellingBeeController';

const router = Router();

router.use(authenticate);

router.get('/new-puzzle', getNewPuzzle);

router.post('/validate-word', validateWord);

router.post('/submit-result', submitGameResult);

router.get('/stats', getSpellingBeeStats);

export default router;
