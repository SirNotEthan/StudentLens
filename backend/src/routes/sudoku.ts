import express from 'express';
import * as sudokuController from '../controllers/sudokuController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

router.get('/new-puzzle', sudokuController.getNewPuzzle);

router.post('/check-cell', sudokuController.checkCell);

router.post('/hint', sudokuController.getHintCell);

router.post('/check-complete', sudokuController.checkComplete);

router.post('/submit-result', sudokuController.submitResult);

router.get('/stats', sudokuController.getStats);

export default router;
