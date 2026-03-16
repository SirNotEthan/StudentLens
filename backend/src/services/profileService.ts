import { Query } from 'node-appwrite';
import { databases, DATABASE_ID } from '@/config/appwrite';
import { User } from '@/models/User';
import { AppError } from '@/utils/AppError';
import { appLogger } from '@/services/logger';

const POSTS_COLLECTION_ID = process.env.APPWRITE_POSTS_COLLECTION_ID || 'posts';
const COMMENTS_COLLECTION_ID = process.env.APPWRITE_COMMENTS_COLLECTION_ID || 'comments';

export class ProfileService {
  
  static async getUserByUsername(username: string, requesterId: string): Promise<any> {
    const user = await User.findByUsername(username);

    if (!user || !user.isActive) {
      throw AppError.notFound('User not found');
    }

    if (user.profileVisibility === false && user.id !== requesterId) {
      throw AppError.forbidden('This profile is private');
    }

    return user;
  }

  static async getRecentPosts(userId: string, limit: number = 5) {
    try {
      const postsResponse = await databases.listDocuments(
        DATABASE_ID,
        POSTS_COLLECTION_ID,
        [
          Query.equal('authorId', userId),
          Query.equal('status', 'published'),
          Query.orderDesc('$createdAt'),
          Query.limit(limit)
        ]
      );
      return postsResponse.documents;
    } catch (error: any) {
      appLogger.warn('Failed to fetch recent posts for profile', { userId, error: error.message });
      return [];
    }
  }

  static async getAllPublishedPosts(userId: string) {
    try {
      const allUserPosts = await databases.listDocuments(
        DATABASE_ID,
        POSTS_COLLECTION_ID,
        [
          Query.equal('authorId', userId),
          Query.equal('status', 'published')
        ]
      );
      return allUserPosts;
    } catch (error: any) {
      appLogger.warn('Failed to fetch all published posts for profile', { userId, error: error.message });
      return { documents: [], total: 0 };
    }
  }

  static async getUserComments(userId: string) {
    try {
      const commentsResponse = await databases.listDocuments(
        DATABASE_ID,
        COMMENTS_COLLECTION_ID,
        [Query.equal('authorId', userId)]
      );
      return commentsResponse;
    } catch (error: any) {
      appLogger.warn('Failed to fetch comments for profile (authorId index may be missing in comments collection)', { userId, error: error.message });
      return { documents: [], total: 0 };
    }
  }

  static calculateTotalLikes(posts: any[]): number {
    return posts.reduce((sum: number, post: any) => {
      return sum + (post.likes || 0);
    }, 0);
  }

  static calculateTotalBookmarks(posts: any[]): number {
    return posts.reduce((sum: number, post: any) => {
      return sum + (post.bookmarksCount || 0);
    }, 0);
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

    const totalLikes = this.calculateTotalLikes(allPosts.documents);
    const totalBookmarks = this.calculateTotalBookmarks(allPosts.documents);

    const publicUserData = this.buildPublicUserData(user);
    const stats = this.buildUserStats(allPosts, comments, totalLikes, totalBookmarks);

    return {
      user: publicUserData,
      stats,
      recentPosts
    };
  }
}
