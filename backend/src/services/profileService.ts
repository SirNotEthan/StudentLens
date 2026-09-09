import { prisma } from '@/config/database';
import { User } from '@/models/User';
import { AppError } from '@/utils/AppError';
import { appLogger } from '@/services/logger';

export class ProfileService {
  static async getUserByUsername(username: string, requesterId: string): Promise<any> {
    const user = await User.findByUsername(username);
    if (!user || !user.isActive) throw AppError.notFound('User not found');
    if (user.profileVisibility === false && user.id !== requesterId) throw AppError.forbidden('This profile is private');
    return user;
  }

  static async getRecentPosts(userId: string, limit = 5) {
    try {
      return prisma.post.findMany({
        where: { authorId: userId, status: 'published' as any },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (error: any) {
      appLogger.warn('Failed to fetch recent posts for profile', { userId, error: error.message });
      return [];
    }
  }

  static async getAllPublishedPosts(userId: string) {
    try {
      const documents = await prisma.post.findMany({ where: { authorId: userId, status: 'published' as any } });
      return { documents, total: documents.length };
    } catch (error: any) {
      appLogger.warn('Failed to fetch all published posts for profile', { userId, error: error.message });
      return { documents: [], total: 0 };
    }
  }

  static async getUserComments(userId: string) {
    try {
      const documents = await prisma.comment.findMany({ where: { authorId: userId } });
      return { documents, total: documents.length };
    } catch (error: any) {
      appLogger.warn('Failed to fetch comments for profile', { userId, error: error.message });
      return { documents: [], total: 0 };
    }
  }

  static calculateTotalLikes(posts: any[]): number {
    return posts.reduce((sum, post) => sum + (post.likes || 0), 0);
  }

  static calculateTotalBookmarks(posts: any[]): number {
    return posts.reduce((sum, post) => sum + (post.bookmarksCount || 0), 0);
  }

  static buildPublicUserData(user: any) {
    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      profileImage: user.profileImage,
      bio: user.bio,
      streak: user.streak,
      createdAt: user.createdAt,
      showBio: user.prefs?.showBio !== false,
      showStats: user.prefs?.showStats !== false,
      showPosts: user.prefs?.showPosts !== false
    };
  }

  static buildUserStats(allPosts: any, comments: any, totalLikes: number, totalBookmarks: number) {
    return {
      totalPosts: allPosts.total,
      totalLikes,
      totalComments: comments.total,
      totalBookmarks
    };
  }

  static async getPublicProfileData(username: string, requesterId: string) {
    const user = await this.getUserByUsername(username, requesterId);
    const [recentPosts, allPosts, comments] = await Promise.all([
      this.getRecentPosts(user.id, 5),
      this.getAllPublishedPosts(user.id),
      this.getUserComments(user.id)
    ]);

    return {
      user: this.buildPublicUserData(user),
      stats: this.buildUserStats(allPosts, comments, this.calculateTotalLikes(allPosts.documents), this.calculateTotalBookmarks(allPosts.documents)),
      recentPosts
    };
  }
}
