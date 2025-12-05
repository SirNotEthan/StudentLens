import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';
import { authenticate, authorizeRole } from '../middleware/auth';

const router = express.Router();

// Public route - anyone can view settings
router.get('/', getSettings);

// Owner-only route - update settings
router.put('/', authenticate, authorizeRole('Owner'), updateSettings);

export default router;
