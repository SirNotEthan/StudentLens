import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import {
  getNewWord,
  validateWord,
  submitGameResult,
  getWordleStats
} from '@/controllers/wordleController';

const router = Router();

router.use(authenticate);

router.get('/new-word', getNewWord);

router.post('/validate-word', validateWord);

router.post('/submit-result', submitGameResult);

router.get('/stats', getWordleStats);

export default router;
