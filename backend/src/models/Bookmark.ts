import { databases, DATABASE_ID, ID, Query } from '@/config/appwrite';
import { IBookmark, CreateBookmarkRequest } from '@/types';
import { AppError } from '@/utils/AppError';
import { appLogger } from '@/services/logger';

const BOOKMARKS_COLLECTION_ID = process.env.APPWRITE_BOOKMARKS_COLLECTION_ID || 'bookmarks';

export class Bookmark implements IBookmark {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;

  constructor(data: any) {
    this.id = data.$id || data.id;
    this.userId = data.userId;
    this.postId = data.postId;
    this.createdAt = data.$createdAt || data.createdAt || new Date().toISOString();
  }

  static async create(userId: string, postId: string): Promise<Bookmark> {
    const startTime = Date.now();

    try {
      appLogger.debug('Creating bookmark', { userId, postId });

      const existing = await this.findByUserAndPost(userId, postId);
      if (existing) {
        throw AppError.badRequest('Post is already bookmarked');
      }

      const docData = {
        userId,
        postId
      };

      const document = await databases.createDocument(
        DATABASE_ID,
        BOOKMARKS_COLLECTION_ID,
        ID.unique(),
        docData
      );

      const bookmark = new Bookmark(document);

      const duration = Date.now() - startTime;
      appLogger.logPerformance('Bookmark.create', duration, { bookmarkId: bookmark.id });
      appLogger.info('Bookmark created successfully', {
        bookmarkId: bookmark.id,
        userId,
        postId
      });

      return bookmark;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('create', 'bookmarks', { userId, postId }, error);
      appLogger.logPerformance('Bookmark.create', duration, { error: true });
      throw AppError.internal(`Failed to create bookmark: ${error.message}`);
    }
  }

  static async getUserBookmarks(userId: string, limit: number = 50, offset: number = 0): Promise<{ bookmarks: Bookmark[]; total: number }> {
    const startTime = Date.now();

    try {
      appLogger.debug('Getting user bookmarks', { userId, limit, offset });

      const queries = [
        Query.equal('userId', userId),
        Query.orderDesc('$createdAt'),
        Query.limit(limit),
        Query.offset(offset)
      ];

      const documents = await databases.listDocuments(
        DATABASE_ID,
        BOOKMARKS_COLLECTION_ID,
        queries
      );

      const bookmarks = documents.documents.map(doc => new Bookmark(doc));

      const duration = Date.now() - startTime;
      appLogger.logPerformance('Bookmark.getUserBookmarks', duration, {
        userId,
        count: bookmarks.length,
        total: documents.total
      });

      return {
        bookmarks,
        total: documents.total
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('getUserBookmarks', 'bookmarks', { userId }, error);
      appLogger.logPerformance('Bookmark.getUserBookmarks', duration, { error: true });
      throw AppError.internal(`Failed to get bookmarks: ${error.message}`);
    }
  }

  static async findByUserAndPost(userId: string, postId: string): Promise<Bookmark | null> {
    const startTime = Date.now();

    try {
      appLogger.debug('Finding bookmark by user and post', { userId, postId });

      const queries = [
        Query.equal('userId', userId),
        Query.equal('postId', postId),
        Query.limit(1)
      ];

      const documents = await databases.listDocuments(
        DATABASE_ID,
        BOOKMARKS_COLLECTION_ID,
        queries
      );

      const duration = Date.now() - startTime;
      appLogger.logPerformance('Bookmark.findByUserAndPost', duration, { userId, postId });

      if (documents.documents.length === 0) {
        return null;
      }

      return new Bookmark(documents.documents[0]);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('findByUserAndPost', 'bookmarks', { userId, postId }, error);
      appLogger.logPerformance('Bookmark.findByUserAndPost', duration, { error: true });
      throw AppError.internal(`Failed to find bookmark: ${error.message}`);
    }
  }

  static async deleteByUserAndPost(userId: string, postId: string): Promise<boolean> {
    const startTime = Date.now();

    try {
      appLogger.debug('Deleting bookmark by user and post', { userId, postId });

      const bookmark = await this.findByUserAndPost(userId, postId);
      if (!bookmark) {
        return false; // Bookmark doesn't exist
      }

      await databases.deleteDocument(
        DATABASE_ID,
        BOOKMARKS_COLLECTION_ID,
        bookmark.id
      );

      const duration = Date.now() - startTime;
      appLogger.logPerformance('Bookmark.delete', duration, { bookmarkId: bookmark.id });
      appLogger.info('Bookmark deleted successfully', {
        bookmarkId: bookmark.id,
        userId,
        postId
      });

      return true;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('delete', 'bookmarks', { userId, postId }, error);
      appLogger.logPerformance('Bookmark.delete', duration, { error: true });
      throw AppError.internal(`Failed to delete bookmark: ${error.message}`);
    }
  }

  static async getPostBookmarkCount(postId: string): Promise<number> {
    const startTime = Date.now();

    try {
      appLogger.debug('Getting bookmark count for post', { postId });

      const queries = [
        Query.equal('postId', postId),
        Query.limit(1) // We only need the count
      ];

      const documents = await databases.listDocuments(
        DATABASE_ID,
        BOOKMARKS_COLLECTION_ID,
        queries
      );

      const duration = Date.now() - startTime;
      appLogger.logPerformance('Bookmark.getPostBookmarkCount', duration, { postId });

      return documents.total;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('getPostBookmarkCount', 'bookmarks', { postId }, error);
      appLogger.logPerformance('Bookmark.getPostBookmarkCount', duration, { error: true });
      throw AppError.internal(`Failed to get bookmark count: ${error.message}`);
    }
  }

  static async isBookmarkedByUser(userId: string, postId: string): Promise<boolean> {
    const bookmark = await this.findByUserAndPost(userId, postId);
    return !!bookmark;
  }

  toJSON(): IBookmark {
    return {
      id: this.id,
      userId: this.userId,
      postId: this.postId,
      createdAt: this.createdAt
    };
  }
}

export default Bookmark;