import { Router } from 'express';
import { getVersion } from '../controllers/versionController';

const router = Router();

/**
 * @route   GET /version
 * @desc    Get application version information
 * @access  Public
 */
router.get('/', getVersion);

export default router;
