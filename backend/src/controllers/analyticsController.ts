import { Response } from 'express';
import { AuthenticatedRequest, CreateAnalyticsEventRequest, AnalyticsQuery } from '@/types';
import { AnalyticsEvent } from '@/models/Analytics';
import { AnalyticsService } from '@/services/analytics';
import { AppError } from '@/utils/AppError';
import { appLogger } from '@/services/logger';

export const trackEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const eventData: CreateAnalyticsEventRequest = req.body;

    if (!eventData.eventType) {
      throw AppError.badRequest('Event type is required');
    }

    await AnalyticsService.trackEvent(req, eventData);

    res.status(201).json({
      success: true,
      message: 'Event tracked successfully'
    });
  } catch (error: any) {
    appLogger.error('Error tracking event', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to track event'
    });
  }
};

export const getEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const query: AnalyticsQuery = {
      userId: req.query.userId as string,
      eventType: req.query.eventType as any,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    const { events, total } = await AnalyticsEvent.findMany(query);

    res.json({
      success: true,
      data: {
        events: events.map(e => e.toJSON()),
        total,
        query
      }
    });
  } catch (error: any) {
    appLogger.error('Error getting analytics events', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to get analytics events'
    });
  }
};

export const getStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const query: AnalyticsQuery = {
      userId: req.query.userId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string
    };

    const stats = await AnalyticsEvent.getStats(query);

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    appLogger.error('Error getting analytics stats', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to get analytics stats'
    });
  }
};

export const getUserBehavior = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId || req.user?.id;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;

    if (!userId) {
      throw AppError.badRequest('User ID is required');
    }

    if (userId !== req.user?.id && !req.user?.hasPermission('view_analytics')) {
      throw AppError.forbidden('You do not have permission to view this user\'s behavior data');
    }

    const behaviorData = await AnalyticsEvent.getUserBehavior(userId, days);

    res.json({
      success: true,
      data: behaviorData
    });
  } catch (error: any) {
    appLogger.error('Error getting user behavior', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to get user behavior'
    });
  }
};

export const getMyBehavior = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;

    if (!userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    const behaviorData = await AnalyticsEvent.getUserBehavior(userId, days);

    res.json({
      success: true,
      data: behaviorData
    });
  } catch (error: any) {
    appLogger.error('Error getting my behavior', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to get behavior data'
    });
  }
};
