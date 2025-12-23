import { Router } from 'express';
import { getVersion } from '../controllers/versionController';

const router = Router();

router.get('/', getVersion);

export default router;
