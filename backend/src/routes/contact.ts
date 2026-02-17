import { Router } from 'express';
import { submitContactForm } from '@/controllers/contactController';
import { generalLimiter } from '@/middleware/security';

const router = Router();

router.post('/', generalLimiter, submitContactForm);

export default router;
