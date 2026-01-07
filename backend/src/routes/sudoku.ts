import express from 'express';
import * as sudokuController from '../controllers/sudokuController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get new puzzle
router.get('/new-puzzle', sudokuController.getNewPuzzle);

// Submit result
router.post('/submit-result', sudokuController.submitResult);

// Get stats
router.get('/stats', sudokuController.getStats);

export default router;
