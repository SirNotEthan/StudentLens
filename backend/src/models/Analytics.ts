import { databases, DATABASE_ID, ID, Query } from '@/config/appwrite';
import {
  IAnalyticsEvent,
  CreateAnalyticsEventRequest,
  AnalyticsQuery,
  AnalyticsStats,
  UserBehaviorData,
  AnalyticsEventType
} from '@/types';
import { AppError } from '@/utils/AppError';
import { appLogger } from '@/services/logger';

const ANALYTICS_COLLECTION_ID = process.env.APPWRITE_ANALYTICS_COLLECTION_ID || 'analytics_events';

export class AnalyticsEvent implements IAnalyticsEvent {
  id: string;
  userId?: string;
  sessionId?: string;
  eventType: AnalyticsEventType;
  eventData?: Record<string, any>;
  ipAddress?: string;
  browser?: string;
  browserVersion?: string;
  deviceType?: string;
  operatingSystem?: string;
  osVersion?: string;
  userAgent?: string;
  pageUrl?: string;
  pageTitle?: string;
  referrer?: string;
  postId?: string;
  commentId?: string;
  searchQuery?: string;
  featureName?: string;
  timestamp: string;
  createdAt: string;

  constructor(data: any) {
    this.id = data.$id || data.id;
    this.userId = data.userId;
    this.sessionId = data.sessionId;
    this.eventType = data.eventType;
    this.eventData = data.eventData;
    this.ipAddress = data.ipAddress;
    this.browser = data.browser;
    this.browserVersion = data.browserVersion;
    this.deviceType = data.deviceType;
    this.operatingSystem = data.operatingSystem;
    this.osVersion = data.osVersion;
    this.userAgent = data.userAgent;
    this.pageUrl = data.pageUrl;
    this.pageTitle = data.pageTitle;
    this.referrer = data.referrer;
    this.postId = data.postId;
    this.commentId = data.commentId;
    this.searchQuery = data.searchQuery;
    this.featureName = data.featureName;
    this.timestamp = data.timestamp || data.$createdAt || new Date().toISOString();
    this.createdAt = data.$createdAt || data.createdAt || new Date().toISOString();
  }

  static async create(
    eventData: CreateAnalyticsEventRequest,
    metadata: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      browser?: string;
      browserVersion?: string;
      deviceType?: string;
      operatingSystem?: string;
      osVersion?: string;
      userAgent?: string;
    }
  ): Promise<AnalyticsEvent> {
    const startTime = Date.now();

    try {
      const now = new Date().toISOString();

      const documentData: any = {
        eventType: eventData.eventType,
        eventData: eventData.eventData || {},
        userId: metadata.userId || '',
        sessionId: metadata.sessionId || '',
        ipAddress: metadata.ipAddress || '',
        browser: metadata.browser || '',
        browserVersion: metadata.browserVersion || '',
        deviceType: metadata.deviceType || '',
        operatingSystem: metadata.operatingSystem || '',
        osVersion: metadata.osVersion || '',
        userAgent: metadata.userAgent || '',
        pageUrl: eventData.pageUrl || '',
        pageTitle: eventData.pageTitle || '',
        referrer: eventData.referrer || '',
        postId: eventData.postId || '',
        commentId: eventData.commentId || '',
        searchQuery: eventData.searchQuery || '',
        featureName: eventData.featureName || '',
        timestamp: now
      };

      const document = await databases.createDocument(
        DATABASE_ID,
        ANALYTICS_COLLECTION_ID,
        ID.unique(),
        documentData
      );

      const duration = Date.now() - startTime;
      appLogger.logPerformance('AnalyticsEvent.create', duration, {
        eventType: eventData.eventType,
        userId: metadata.userId
      });

      return new AnalyticsEvent(document);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('create', 'analytics_events', { eventType: eventData.eventType }, error);
      appLogger.logPerformance('AnalyticsEvent.create', duration, { error: true });
      throw AppError.internal(`Failed to create analytics event: ${error.message}`);
    }
  }

  static async findMany(query: AnalyticsQuery = {}): Promise<{ events: AnalyticsEvent[]; total: number }> {
    const startTime = Date.now();

    try {
      const queries: string[] = [];

      if (query.userId) {
        queries.push(Query.equal('userId', query.userId));
      }
      if (query.eventType) {
        queries.push(Query.equal('eventType', query.eventType));
      }
      if (query.startDate) {
        queries.push(Query.greaterThanEqual('timestamp', query.startDate));
      }
      if (query.endDate) {
        queries.push(Query.lessThanEqual('timestamp', query.endDate));
      }

      queries.push(Query.orderDesc('timestamp'));

      if (query.limit) {
        queries.push(Query.limit(query.limit));
      }
      if (query.offset) {
        queries.push(Query.offset(query.offset));
      }

      const documents = await databases.listDocuments(
        DATABASE_ID,
        ANALYTICS_COLLECTION_ID,
        queries
      );

      const events = documents.documents.map(doc => new AnalyticsEvent(doc));

      const duration = Date.now() - startTime;
      appLogger.logPerformance('AnalyticsEvent.findMany', duration, {
        count: events.length,
        total: documents.total
      });

      return {
        events,
        total: documents.total
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('findMany', 'analytics_events', query, error);
      appLogger.logPerformance('AnalyticsEvent.findMany', duration, { error: true });
      throw AppError.internal(`Failed to find analytics events: ${error.message}`);
    }
  }

  static async getStats(query: AnalyticsQuery = {}): Promise<AnalyticsStats> {
    const startTime = Date.now();

    try {
      const { events } = await this.findMany({ ...query, limit: 10000 });

      const uniqueUsers = new Set(events.filter(e => e.userId).map(e => e.userId)).size;

      const eventsByType: Record<string, number> = {};
      events.forEach(event => {
        eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
      });

      const pageViews: Record<string, number> = {};
      events.filter(e => e.eventType === 'page_view' && e.pageUrl).forEach(event => {
        pageViews[event.pageUrl!] = (pageViews[event.pageUrl!] || 0) + 1;
      });

      const topPages = Object.entries(pageViews)
        .map(([page, views]) => ({ page, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      const postViews: Record<string, number> = {};
      events.filter(e => e.eventType === 'post_view' && e.postId).forEach(event => {
        postViews[event.postId!] = (postViews[event.postId!] || 0) + 1;
      });

      const topPosts = Object.entries(postViews)
        .map(([postId, views]) => ({ postId, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      const deviceStats = {
        desktop: events.filter(e => e.deviceType === 'desktop').length,
        mobile: events.filter(e => e.deviceType === 'mobile').length,
        tablet: events.filter(e => e.deviceType === 'tablet').length,
        other: events.filter(e => e.deviceType && !['desktop', 'mobile', 'tablet'].includes(e.deviceType)).length
      };

      const browserStats: Record<string, number> = {};
      events.filter(e => e.browser).forEach(event => {
        browserStats[event.browser!] = (browserStats[event.browser!] || 0) + 1;
      });

      const osStats: Record<string, number> = {};
      events.filter(e => e.operatingSystem).forEach(event => {
        osStats[event.operatingSystem!] = (osStats[event.operatingSystem!] || 0) + 1;
      });

      const userGrowthMap: Record<string, Set<string>> = {};
      events.filter(e => e.userId && e.eventType === 'login').forEach(event => {
        const date = event.timestamp.split('T')[0];
        if (!userGrowthMap[date]) {
          userGrowthMap[date] = new Set();
        }
        userGrowthMap[date].add(event.userId!);
      });

      const userGrowth = Object.entries(userGrowthMap)
        .map(([date, users]) => ({ date, count: users.size }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const duration = Date.now() - startTime;
      appLogger.logPerformance('AnalyticsEvent.getStats', duration, {
        totalEvents: events.length,
        uniqueUsers
      });

      return {
        totalEvents: events.length,
        uniqueUsers,
        eventsByType: eventsByType as Record<AnalyticsEventType, number>,
        topPages,
        topPosts,
        deviceStats,
        browserStats,
        osStats,
        userGrowth
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.error('Failed to get analytics stats', error);
      appLogger.logPerformance('AnalyticsEvent.getStats', duration, { error: true });
      throw AppError.internal(`Failed to get analytics stats: ${error.message}`);
    }
  }

  static async getUserBehavior(userId: string, days: number = 30): Promise<UserBehaviorData> {
    const startTime = Date.now();

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { events } = await this.findMany({
        userId,
        startDate: startDate.toISOString(),
        limit: 10000
      });

      const pagesViewed = [...new Set(events.filter(e => e.eventType === 'page_view' && e.pageUrl).map(e => e.pageUrl!))];
      const postsViewed = [...new Set(events.filter(e => e.eventType === 'post_view' && e.postId).map(e => e.postId!))];
      const featuresUsed = [...new Set(events.filter(e => e.eventType === 'feature_use' && e.featureName).map(e => e.featureName!))];

      const sessionIds = new Set(events.filter(e => e.sessionId).map(e => e.sessionId!));

      const sortedEvents = events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const duration = Date.now() - startTime;
      appLogger.logPerformance('AnalyticsEvent.getUserBehavior', duration, { userId });

      return {
        userId,
        totalPageViews: events.filter(e => e.eventType === 'page_view').length,
        totalPostViews: events.filter(e => e.eventType === 'post_view').length,
        totalLikes: events.filter(e => e.eventType === 'post_like').length,
        totalComments: events.filter(e => e.eventType === 'comment_create').length,
        totalBookmarks: events.filter(e => e.eventType === 'post_bookmark').length,
        pagesViewed,
        postsViewed,
        featuresUsed,
        lastActive: sortedEvents[sortedEvents.length - 1]?.timestamp || new Date().toISOString(),
        firstSeen: sortedEvents[0]?.timestamp || new Date().toISOString(),
        sessionCount: sessionIds.size
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.error('Failed to get user behavior', error, { userId });
      appLogger.logPerformance('AnalyticsEvent.getUserBehavior', duration, { userId, error: true });
      throw AppError.internal(`Failed to get user behavior: ${error.message}`);
    }
  }

  toJSON(): IAnalyticsEvent {
    return {
      id: this.id,
      userId: this.userId,
      sessionId: this.sessionId,
      eventType: this.eventType,
      eventData: this.eventData,
      ipAddress: this.ipAddress,
      browser: this.browser,
      browserVersion: this.browserVersion,
      deviceType: this.deviceType,
      operatingSystem: this.operatingSystem,
      osVersion: this.osVersion,
      userAgent: this.userAgent,
      pageUrl: this.pageUrl,
      pageTitle: this.pageTitle,
      referrer: this.referrer,
      postId: this.postId,
      commentId: this.commentId,
      searchQuery: this.searchQuery,
      featureName: this.featureName,
      timestamp: this.timestamp,
      createdAt: this.createdAt
    };
  }
}

export default AnalyticsEvent;
