import { Request } from 'express';
import { AnalyticsEvent } from '@/models/Analytics';
import { CreateAnalyticsEventRequest } from '@/types';
import { appLogger } from '@/services/logger';

interface ParsedUserAgent {
  browser: string;
  browserVersion: string;
  operatingSystem: string;
  osVersion: string;
  deviceType: string;
}

export class AnalyticsService {
  /**
   * Parse user agent string to extract browser, OS, and device information
   */
  static parseUserAgent(userAgent: string): ParsedUserAgent {
    const ua = userAgent.toLowerCase();

    // Detect Browser
    let browser = 'Unknown';
    let browserVersion = '';

    if (ua.includes('edg/')) {
      browser = 'Edge';
      const match = userAgent.match(/Edg\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : '';
    } else if (ua.includes('chrome/')) {
      browser = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : '';
    } else if (ua.includes('firefox/')) {
      browser = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : '';
    } else if (ua.includes('safari/') && !ua.includes('chrome')) {
      browser = 'Safari';
      const match = userAgent.match(/Version\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : '';
    } else if (ua.includes('opera/') || ua.includes('opr/')) {
      browser = 'Opera';
      const match = userAgent.match(/(?:Opera|OPR)\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : '';
    } else if (ua.includes('msie') || ua.includes('trident/')) {
      browser = 'Internet Explorer';
      const match = userAgent.match(/(?:MSIE |rv:)(\d+\.\d+)/);
      browserVersion = match ? match[1] : '';
    }

    // Detect Operating System
    let operatingSystem = 'Unknown';
    let osVersion = '';

    if (ua.includes('windows nt 10.0')) {
      operatingSystem = 'Windows';
      osVersion = '10';
    } else if (ua.includes('windows nt 6.3')) {
      operatingSystem = 'Windows';
      osVersion = '8.1';
    } else if (ua.includes('windows nt 6.2')) {
      operatingSystem = 'Windows';
      osVersion = '8';
    } else if (ua.includes('windows nt 6.1')) {
      operatingSystem = 'Windows';
      osVersion = '7';
    } else if (ua.includes('windows')) {
      operatingSystem = 'Windows';
    } else if (ua.includes('mac os x')) {
      operatingSystem = 'macOS';
      const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
      osVersion = match ? match[1].replace('_', '.') : '';
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
      operatingSystem = 'iOS';
      const match = userAgent.match(/OS (\d+[._]\d+)/);
      osVersion = match ? match[1].replace('_', '.') : '';
    } else if (ua.includes('android')) {
      operatingSystem = 'Android';
      const match = userAgent.match(/Android (\d+\.\d+)/);
      osVersion = match ? match[1] : '';
    } else if (ua.includes('linux')) {
      operatingSystem = 'Linux';
    } else if (ua.includes('ubuntu')) {
      operatingSystem = 'Ubuntu';
    } else if (ua.includes('cros')) {
      operatingSystem = 'Chrome OS';
    }

    // Detect Device Type
    let deviceType = 'desktop';

    if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('ipod') || ua.includes('android')) {
      deviceType = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      deviceType = 'tablet';
    }

    return {
      browser,
      browserVersion,
      operatingSystem,
      osVersion,
      deviceType
    };
  }

  /**
   * Extract IP address from request, accounting for proxies
   */
  static getClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = (forwardedFor as string).split(',');
      return ips[0].trim();
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return realIp as string;
    }

    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  /**
   * Generate a session ID from request
   */
  static getSessionId(req: Request): string {
    // Try to get from session first
    if ((req as any).session?.id) {
      return (req as any).session.id;
    }

    // Fallback to generating from user agent + IP
    const userAgent = req.headers['user-agent'] || '';
    const ip = this.getClientIp(req);
    const date = new Date().toISOString().split('T')[0]; // Daily session

    return `${ip}-${date}-${this.hashString(userAgent)}`;
  }

  /**
   * Simple hash function for strings
   */
  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Track an analytics event
   */
  static async trackEvent(
    req: Request,
    eventData: CreateAnalyticsEventRequest
  ): Promise<void> {
    try {
      const userAgent = req.headers['user-agent'] || '';
      const parsed = this.parseUserAgent(userAgent);
      const ipAddress = this.getClientIp(req);
      const sessionId = this.getSessionId(req);

      const userId = (req as any).user?.id || (req as any).user?.userId;

      await AnalyticsEvent.create(eventData, {
        userId,
        sessionId,
        ipAddress,
        browser: parsed.browser,
        browserVersion: parsed.browserVersion,
        deviceType: parsed.deviceType,
        operatingSystem: parsed.operatingSystem,
        osVersion: parsed.osVersion,
        userAgent
      });

      appLogger.debug('Analytics event tracked', {
        eventType: eventData.eventType,
        userId,
        sessionId
      });
    } catch (error) {
      // Log the error but don't throw - analytics failures shouldn't break the application
      appLogger.error('Failed to track analytics event', error, {
        eventType: eventData.eventType
      });
    }
  }

  /**
   * Middleware to automatically track page views
   */
  static trackPageView() {
    return async (req: Request, res: any, next: any) => {
      // Only track GET requests to non-API routes
      if (req.method === 'GET' && !req.path.startsWith('/api/')) {
        await this.trackEvent(req, {
          eventType: 'page_view',
          pageUrl: req.originalUrl || req.url,
          pageTitle: req.path,
          referrer: req.headers.referer || req.headers.referrer as string
        });
      }
      next();
    };
  }
}

export default AnalyticsService;
