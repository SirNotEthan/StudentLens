import crypto from 'crypto';
import { prisma } from '@/config/database';
import { IComment, CreateCommentRequest, UpdateCommentRequest } from '@/types';
import { AppError } from '@/utils/AppError';

const toIso = (value?: Date | string | null): string => value ? (value instanceof Date ? value.toISOString() : new Date(value).toISOString()) : new Date().toISOString();

export class Comment implements IComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  parentId?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  likes: number;
  likedUsers: string[];

  constructor(data: any) {
    this.id = data.$id || data.id;
    this.postId = data.postId;
    this.authorId = data.authorId;
    this.authorName = data.authorName;
    this.content = data.content;
    this.parentId = data.parentId || undefined;
    this.isDeleted = data.isDeleted || false;
    this.createdAt = data.$createdAt || toIso(data.createdAt);
    this.updatedAt = data.$updatedAt || toIso(data.updatedAt);
    this.likes = data.likes || 0;
    this.likedUsers = Array.isArray(data.likedUsers) ? data.likedUsers : [];
  }

  static async create(commentData: CreateCommentRequest, authorId: string, authorName: string): Promise<Comment> {
    const comment = await prisma.comment.create({
      data: {
        id: crypto.randomUUID(),
        postId: commentData.postId,
        authorId,
        authorName,
        content: commentData.content,
        parentId: commentData.parentId || undefined,
      },
    });
    return new Comment(comment);
  }

  static async getPostComments(postId: string, limit = 50, offset = 0): Promise<{ comments: Comment[]; total: number }> {
    const where = { postId, isDeleted: false };
    const [comments, total] = await prisma.$transaction([
      prisma.comment.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
      prisma.comment.count({ where }),
    ]);
    return { comments: comments.map(item => new Comment(item)), total };
  }

  static async findById(id: string): Promise<Comment | null> {
    const comment = await prisma.comment.findUnique({ where: { id } });
    return comment ? new Comment(comment) : null;
  }

  async update(updateData: UpdateCommentRequest): Promise<this> {
    const updated = await prisma.comment.update({ where: { id: this.id }, data: { content: updateData.content } });
    Object.assign(this, new Comment(updated));
    return this;
  }

  async delete(): Promise<void> {
    const updated = await prisma.comment.update({ where: { id: this.id }, data: { isDeleted: true, content: '[Comment deleted]' } });
    Object.assign(this, new Comment(updated));
  }

  async toggleLike(userId: string): Promise<{ isLiked: boolean; likeCount: number }> {
    const current = await prisma.comment.findUnique({ where: { id: this.id } });
    if (!current) throw AppError.notFound('Comment not found');
    const likedUsers = current.likedUsers || [];
    const isLiked = !likedUsers.includes(userId);
    const nextLikedUsers = isLiked ? [...likedUsers, userId] : likedUsers.filter(id => id !== userId);
    const updated = await prisma.comment.update({ where: { id: this.id }, data: { likedUsers: nextLikedUsers, likes: nextLikedUsers.length } });
    Object.assign(this, new Comment(updated));
    return { isLiked, likeCount: this.likes };
  }

  async isLikedByUser(userId: string): Promise<boolean> {
    const current = await prisma.comment.findUnique({ where: { id: this.id } });
    return !!current?.likedUsers?.includes(userId);
  }

  toJSON(): IComment & { isLikedByUser?: boolean; replies?: any[] } {
    return {
      id: this.id,
      postId: this.postId,
      authorId: this.authorId,
      authorName: this.authorName,
      content: this.content,
      parentId: this.parentId,
      isDeleted: this.isDeleted,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      likes: this.likes
    };
  }
}

export default Comment;
