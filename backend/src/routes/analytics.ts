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

/**
 * @route   POST /api/analytics/track
 * @desc    Track a custom analytics event
 * @access  Public (with optional auth for userId)
 */
router.post('/track', optionalAuth, trackEvent);

/**
 * @route   GET /api/analytics/events
 * @desc    Get analytics events (admin only)
 * @access  Private (requires view_analytics permission)
 */
router.get('/events', authenticate, authorize('view_analytics'), getEvents);

/**
 * @route   GET /api/analytics/stats
 * @desc    Get analytics statistics
 * @access  Private (requires view_analytics permission)
 */
router.get('/stats', authenticate, authorize('view_analytics'), getStats);

/**
 * @route   GET /api/analytics/behavior/me
 * @desc    Get current user's behavior data
 * @access  Private
 */
router.get('/behavior/me', authenticate, getMyBehavior);

/**
 * @route   GET /api/analytics/behavior/:userId
 * @desc    Get user behavior data
 * @access  Private (requires view_analytics permission for other users)
 */
router.get('/behavior/:userId', authenticate, getUserBehavior);

export default router;
