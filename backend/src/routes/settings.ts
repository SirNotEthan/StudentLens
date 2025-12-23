import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';
import { authenticate, authorizeRole } from '../middleware/auth';

const router = express.Router();

router.get('/', getSettings);

router.put('/', authenticate, authorizeRole('Owner'), updateSettings);

export default router;
