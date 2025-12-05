import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/security';

const router = express.Router();

// Public route - anyone can view settings
router.get('/', getSettings);

// Owner-only route - update settings
router.put('/', authenticateToken, requireRole('Owner'), updateSettings);

export default router;
