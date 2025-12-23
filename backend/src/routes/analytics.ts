import { Router } from 'express';
import {
  trackEvent,
  getEvents,
  getStats,
  getUserBehavior,
  getMyBehavior
} from '@/controllers/analyticsController';
import { authenticate, authorize, optionalAuth } from '@/middleware/auth';

const router = Router();

router.post('/track', optionalAuth, trackEvent);

router.get('/events', authenticate, authorize('view_analytics'), getEvents);

router.get('/stats', authenticate, authorize('view_analytics'), getStats);

router.get('/behavior/me', authenticate, getMyBehavior);

router.get('/behavior/:userId', authenticate, getUserBehavior);

export default router;
