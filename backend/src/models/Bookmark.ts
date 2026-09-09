import crypto from 'crypto';
import { prisma } from '@/config/database';
import { IBookmark } from '@/types';
import { AppError } from '@/utils/AppError';

const toIso = (value?: Date | string | null): string => value ? (value instanceof Date ? value.toISOString() : new Date(value).toISOString()) : new Date().toISOString();

export class Bookmark implements IBookmark {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;

  constructor(data: any) {
    this.id = data.$id || data.id;
    this.userId = data.userId;
    this.postId = data.postId;
    this.createdAt = data.$createdAt || toIso(data.createdAt);
  }

  static async create(userId: string, postId: string): Promise<Bookmark> {
    const existing = await this.findByUserAndPost(userId, postId);
    if (existing) throw AppError.badRequest('Post is already bookmarked');
    const bookmark = await prisma.bookmark.create({ data: { id: crypto.randomUUID(), userId, postId } });
    return new Bookmark(bookmark);
  }

  static async getUserBookmarks(userId: string, limit = 50, offset = 0): Promise<{ bookmarks: Bookmark[]; total: number }> {
    const [bookmarks, total] = await prisma.$transaction([
      prisma.bookmark.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
      prisma.bookmark.count({ where: { userId } }),
    ]);
    return { bookmarks: bookmarks.map(item => new Bookmark(item)), total };
  }

  static async findByUserAndPost(userId: string, postId: string): Promise<Bookmark | null> {
    const bookmark = await prisma.bookmark.findUnique({ where: { userId_postId: { userId, postId } } });
    return bookmark ? new Bookmark(bookmark) : null;
  }

  static async deleteByUserAndPost(userId: string, postId: string): Promise<boolean> {
    const existing = await this.findByUserAndPost(userId, postId);
    if (!existing) return false;
    await prisma.bookmark.delete({ where: { userId_postId: { userId, postId } } });
    return true;
  }

  static async getPostBookmarkCount(postId: string): Promise<number> {
    return prisma.bookmark.count({ where: { postId } });
  }

  static async isBookmarkedByUser(userId: string, postId: string): Promise<boolean> {
    return !!(await this.findByUserAndPost(userId, postId));
  }

  toJSON(): IBookmark {
    return { id: this.id, userId: this.userId, postId: this.postId, createdAt: this.createdAt };
  }
}

export default Bookmark;
