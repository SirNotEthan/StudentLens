import crypto from 'crypto';
import { prisma } from '@/config/database';
import {
  IAnalyticsEvent,
  CreateAnalyticsEventRequest,
  AnalyticsQuery,
  AnalyticsStats,
  UserBehaviorData,
  AnalyticsEventType
} from '@/types';

const toIso = (value?: Date | string | null): string => value ? (value instanceof Date ? value.toISOString() : new Date(value).toISOString()) : new Date().toISOString();

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
    this.userId = data.userId || undefined;
    this.sessionId = data.sessionId || undefined;
    this.eventType = data.eventType;
    this.eventData = data.eventData || {};
    this.ipAddress = data.ipAddress || undefined;
    this.browser = data.browser || undefined;
    this.browserVersion = data.browserVersion || undefined;
    this.deviceType = data.deviceType || undefined;
    this.operatingSystem = data.operatingSystem || undefined;
    this.osVersion = data.osVersion || undefined;
    this.userAgent = data.userAgent || undefined;
    this.pageUrl = data.pageUrl || data.page || undefined;
    this.pageTitle = data.pageTitle || undefined;
    this.referrer = data.referrer || undefined;
    this.postId = data.postId || undefined;
    this.commentId = data.commentId || undefined;
    this.searchQuery = data.searchQuery || undefined;
    this.featureName = data.featureName || undefined;
    this.timestamp = toIso(data.timestamp);
    this.createdAt = data.$createdAt || toIso(data.createdAt);
  }

  static async create(eventData: CreateAnalyticsEventRequest, metadata: {
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    browser?: string;
    browserVersion?: string;
    deviceType?: string;
    operatingSystem?: string;
    osVersion?: string;
    userAgent?: string;
  }): Promise<AnalyticsEvent> {
    const event = await prisma.analyticsEvent.create({
      data: {
        id: crypto.randomUUID(),
        eventType: eventData.eventType,
        eventData: eventData.eventData || {},
        userId: metadata.userId || undefined,
        sessionId: metadata.sessionId || undefined,
        ipAddress: metadata.ipAddress || undefined,
        browser: metadata.browser || undefined,
        browserVersion: metadata.browserVersion || undefined,
        deviceType: metadata.deviceType || undefined,
        operatingSystem: metadata.operatingSystem || undefined,
        osVersion: metadata.osVersion || undefined,
        userAgent: metadata.userAgent || undefined,
        pageUrl: eventData.pageUrl || undefined,
        page: eventData.pageUrl || undefined,
        pageTitle: eventData.pageTitle || undefined,
        referrer: eventData.referrer || undefined,
        postId: eventData.postId || undefined,
        commentId: eventData.commentId || undefined,
        searchQuery: eventData.searchQuery || undefined,
        featureName: eventData.featureName || undefined,
      },
    });
    return new AnalyticsEvent(event);
  }

  static async findMany(query: AnalyticsQuery = {}): Promise<{ events: AnalyticsEvent[]; total: number }> {
    const where: any = {};
    if (query.userId) where.userId = query.userId;
    if (query.eventType) where.eventType = query.eventType;
    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = new Date(query.startDate);
      if (query.endDate) where.timestamp.lte = new Date(query.endDate);
    }
    const [events, total] = await prisma.$transaction([
      prisma.analyticsEvent.findMany({ where, orderBy: { timestamp: 'desc' }, take: query.limit, skip: query.offset }),
      prisma.analyticsEvent.count({ where }),
    ]);
    return { events: events.map(item => new AnalyticsEvent(item)), total };
  }

  static async getStats(query: AnalyticsQuery = {}): Promise<AnalyticsStats> {
    const { events } = await this.findMany({ ...query, limit: 10000 });
    const uniqueUsers = new Set(events.filter(e => e.userId).map(e => e.userId)).size;
    const eventsByType: Record<string, number> = {};
    events.forEach(event => { eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1; });
    const pageViews: Record<string, number> = {};
    events.filter(e => e.eventType === 'page_view' && e.pageUrl).forEach(event => { pageViews[event.pageUrl!] = (pageViews[event.pageUrl!] || 0) + 1; });
    const postViews: Record<string, number> = {};
    events.filter(e => e.eventType === 'post_view' && e.postId).forEach(event => { postViews[event.postId!] = (postViews[event.postId!] || 0) + 1; });
    const browserStats: Record<string, number> = {};
    events.filter(e => e.browser).forEach(event => { browserStats[event.browser!] = (browserStats[event.browser!] || 0) + 1; });
    const osStats: Record<string, number> = {};
    events.filter(e => e.operatingSystem).forEach(event => { osStats[event.operatingSystem!] = (osStats[event.operatingSystem!] || 0) + 1; });
    const userGrowthMap: Record<string, Set<string>> = {};
    events.filter(e => e.userId && e.eventType === 'login').forEach(event => {
      const date = event.timestamp.split('T')[0];
      userGrowthMap[date] ||= new Set();
      userGrowthMap[date].add(event.userId!);
    });
    return {
      totalEvents: events.length,
      uniqueUsers,
      eventsByType: eventsByType as Record<AnalyticsEventType, number>,
      topPages: Object.entries(pageViews).map(([page, views]) => ({ page, views })).sort((a, b) => b.views - a.views).slice(0, 10),
      topPosts: Object.entries(postViews).map(([postId, views]) => ({ postId, views })).sort((a, b) => b.views - a.views).slice(0, 10),
      deviceStats: {
        desktop: events.filter(e => e.deviceType === 'desktop').length,
        mobile: events.filter(e => e.deviceType === 'mobile').length,
        tablet: events.filter(e => e.deviceType === 'tablet').length,
        other: events.filter(e => e.deviceType && !['desktop', 'mobile', 'tablet'].includes(e.deviceType)).length
      },
      browserStats,
      osStats,
      userGrowth: Object.entries(userGrowthMap).map(([date, users]) => ({ date, count: users.size })).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  static async getUserBehavior(userId: string, days = 30): Promise<UserBehaviorData> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const { events } = await this.findMany({ userId, startDate: startDate.toISOString(), limit: 10000 });
    const sortedEvents = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return {
      userId,
      totalPageViews: events.filter(e => e.eventType === 'page_view').length,
      totalPostViews: events.filter(e => e.eventType === 'post_view').length,
      totalLikes: events.filter(e => e.eventType === 'post_like').length,
      totalComments: events.filter(e => e.eventType === 'comment_create').length,
      totalBookmarks: events.filter(e => e.eventType === 'post_bookmark').length,
      pagesViewed: [...new Set(events.filter(e => e.eventType === 'page_view' && e.pageUrl).map(e => e.pageUrl!))],
      postsViewed: [...new Set(events.filter(e => e.eventType === 'post_view' && e.postId).map(e => e.postId!))],
      featuresUsed: [...new Set(events.filter(e => e.eventType === 'feature_use' && e.featureName).map(e => e.featureName!))],
      lastActive: sortedEvents[sortedEvents.length - 1]?.timestamp || new Date().toISOString(),
      firstSeen: sortedEvents[0]?.timestamp || new Date().toISOString(),
      sessionCount: new Set(events.filter(e => e.sessionId).map(e => e.sessionId!)).size
    };
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
