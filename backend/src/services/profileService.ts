import { Query } from 'node-appwrite';
import { databases, DATABASE_ID } from '@/config/appwrite';
import { User } from '@/models/User';
import { AppError } from '@/utils/AppError';

const POSTS_COLLECTION_ID = process.env.APPWRITE_POSTS_COLLECTION_ID || 'posts';
const COMMENTS_COLLECTION_ID = process.env.APPWRITE_COMMENTS_COLLECTION_ID || 'comments';

/**
 * Service for handling user profile-related operations
 */
export class ProfileService {
  /**
   * Fetches user by username and validates access
   */
  static async getUserByUsername(username: string, requesterId: string): Promise<any> {
    const user = await User.findByUsername(username);

    if (!user || !user.isActive) {
      throw AppError.notFound('User not found');
    }

    // Check profile visibility
    if (user.profileVisibility === false && user.id !== requesterId) {
      throw AppError.forbidden('This profile is private');
    }

    return user;
  }

  /**
   * Gets recent published posts by user
   */
  static async getRecentPosts(userId: string, limit: number = 5) {
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
  }

  /**
   * Gets all published posts by user
   */
  static async getAllPublishedPosts(userId: string) {
    const allUserPosts = await databases.listDocuments(
      DATABASE_ID,
      POSTS_COLLECTION_ID,
      [
        Query.equal('authorId', userId),
        Query.equal('status', 'published')
      ]
    );

    return allUserPosts;
  }

  /**
   * Gets user comments
   */
  static async getUserComments(userId: string) {
    const commentsResponse = await databases.listDocuments(
      DATABASE_ID,
      COMMENTS_COLLECTION_ID,
      [Query.equal('authorId', userId)]
    );

    return commentsResponse;
  }

  /**
   * Calculates total likes from posts
   */
  static calculateTotalLikes(posts: any[]): number {
    return posts.reduce((sum: number, post: any) => {
      return sum + (post.likes || 0);
    }, 0);
  }

  /**
   * Calculates total bookmarks from posts
   */
  static calculateTotalBookmarks(posts: any[]): number {
    return posts.reduce((sum: number, post: any) => {
      return sum + (post.bookmarksCount || 0);
    }, 0);
  }

  /**
   * Builds public user data object
   */
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

  /**
   * Builds user stats object
   */
  static buildUserStats(allPosts: any, comments: any, totalLikes: number, totalBookmarks: number) {
    return {
      totalPosts: allPosts.total,
      totalLikes,
      totalComments: comments.total,
      totalBookmarks
    };
  }

  /**
   * Fetches complete public profile data for a user
   */
  static async getPublicProfileData(username: string, requesterId: string) {
    // Get and validate user
    const user = await this.getUserByUsername(username, requesterId);

    // Fetch data in parallel where possible
    const [recentPosts, allPosts, comments] = await Promise.all([
      this.getRecentPosts(user.id, 5),
      this.getAllPublishedPosts(user.id),
      this.getUserComments(user.id)
    ]);

    // Calculate stats
    const totalLikes = this.calculateTotalLikes(allPosts.documents);
    const totalBookmarks = this.calculateTotalBookmarks(allPosts.documents);

    // Build response data
    const publicUserData = this.buildPublicUserData(user);
    const stats = this.buildUserStats(allPosts, comments, totalLikes, totalBookmarks);

    return {
      user: publicUserData,
      stats,
      recentPosts
    };
  }
}
