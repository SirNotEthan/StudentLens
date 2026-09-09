import crypto from 'crypto';
import { prisma } from '@/config/database';
import { IPost, CreatePostRequest, UpdatePostRequest, PostStatus } from '@/types';
import { AppError } from '@/utils/AppError';

const toIso = (value?: Date | string | null): string | undefined => value ? (value instanceof Date ? value.toISOString() : new Date(value).toISOString()) : undefined;

export class Post implements IPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  authorId: string;
  authorName: string;
  authorUsername?: string;
  category: string;
  tags: string[];
  status: PostStatus;
  featuredImage?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  likes: number;
  likedUsers: string[];
  slug: string;
  editorId?: string;
  editorName?: string;
  reviewerId?: string;
  reviewerName?: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionComment?: string;

  constructor(data: any) {
    this.id = data.$id || data.id;
    this.title = data.title;
    this.content = data.content;
    this.excerpt = data.excerpt || '';
    this.authorId = data.authorId;
    this.authorName = data.authorName;
    this.authorUsername = data.authorUsername || undefined;
    this.category = data.category;
    this.tags = Array.isArray(data.tags) ? data.tags : [];
    this.status = data.status || 'draft';
    this.featuredImage = data.featuredImage || undefined;
    this.publishedAt = toIso(data.publishedAt);
    this.createdAt = data.$createdAt || toIso(data.createdAt) || new Date().toISOString();
    this.updatedAt = data.$updatedAt || toIso(data.updatedAt) || new Date().toISOString();
    this.viewCount = data.viewCount || 0;
    this.likes = data.likes || 0;
    this.likedUsers = Array.isArray(data.likedUsers) ? data.likedUsers : [];
    this.slug = data.slug || this.generateSlug(data.title);
    this.editorId = data.editorId || undefined;
    this.editorName = data.editorName || undefined;
    this.reviewerId = data.reviewerId || undefined;
    this.reviewerName = data.reviewerName || undefined;
    this.submittedAt = toIso(data.submittedAt);
    this.reviewedAt = toIso(data.reviewedAt);
    this.rejectionComment = data.rejectionComment || undefined;
  }

  private generateSlug(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  private static fromDb(data: any): Post {
    return new Post(data);
  }

  static async create(postData: CreatePostRequest, authorId: string, authorName: string, authorUsername?: string): Promise<Post> {
    if (!authorName?.trim()) throw AppError.badRequest('Author name is required and cannot be empty');
    const baseSlug = new Post({ title: postData.title }).generateSlug(postData.title);
    const status = postData.status || 'draft';
    const created = await prisma.post.create({
      data: {
        id: crypto.randomUUID(),
        title: postData.title,
        content: postData.content,
        excerpt: postData.excerpt || `${postData.content.substring(0, 150)}...`,
        authorId,
        authorName,
        authorUsername,
        category: postData.category,
        tags: Array.isArray(postData.tags) ? postData.tags : [],
        status: status as any,
        featuredImage: postData.featuredImage || undefined,
        publishedAt: status === 'published' ? new Date() : undefined,
        slug: `${baseSlug}-${Date.now()}`,
      },
    });
    return Post.fromDb(created);
  }

  static async findById(id: string): Promise<Post | null> {
    const post = await prisma.post.findUnique({ where: { id } });
    return post ? Post.fromDb(post) : null;
  }

  static async findBySlug(slug: string): Promise<Post | null> {
    const post = await prisma.post.findUnique({ where: { slug } });
    return post ? Post.fromDb(post) : null;
  }

  static async findMany(options: {
    status?: PostStatus;
    category?: string;
    authorId?: string;
    search?: string;
    limit?: number;
    offset?: number;
    orderBy?: string;
  } = {}): Promise<{ posts: Post[]; total: number }> {
    const where: any = {};
    if (options.status) where.status = options.status;
    if (options.category) where.category = options.category;
    if (options.authorId) where.authorId = options.authorId;
    if (options.search) {
      where.OR = [
        { title: { contains: options.search, mode: 'insensitive' } },
        { content: { contains: options.search, mode: 'insensitive' } },
        { excerpt: { contains: options.search, mode: 'insensitive' } },
        { authorName: { contains: options.search, mode: 'insensitive' } },
        { tags: { has: options.search } },
      ];
    }

    const orderField = options.orderBy === 'viewCount' ? 'viewCount' : options.orderBy === 'publishedAt' ? 'publishedAt' : 'createdAt';
    const [posts, total] = await prisma.$transaction([
      prisma.post.findMany({ where, orderBy: { [orderField]: 'desc' }, take: options.limit, skip: options.offset }),
      prisma.post.count({ where }),
    ]);
    return { posts: posts.map(Post.fromDb), total };
  }

  async update(updateData: Partial<UpdatePostRequest>): Promise<Post> {
    const data: any = {};
    if (updateData.title !== undefined) {
      data.title = updateData.title;
      data.slug = `${this.generateSlug(updateData.title)}-${Date.now()}`;
    }
    for (const key of ['content', 'excerpt', 'category', 'featuredImage', 'rejectionComment', 'editorId', 'editorName', 'reviewerId', 'reviewerName']) {
      if ((updateData as any)[key] !== undefined) data[key] = (updateData as any)[key] || undefined;
    }
    if (updateData.tags !== undefined) data.tags = Array.isArray(updateData.tags) ? updateData.tags : [];
    if (updateData.status !== undefined) {
      data.status = updateData.status;
      if (updateData.status === 'published' && !this.publishedAt) data.publishedAt = new Date();
    }
    for (const key of ['submittedAt', 'reviewedAt', 'publishedAt']) {
      if ((updateData as any)[key] !== undefined) data[key] = (updateData as any)[key] ? new Date((updateData as any)[key]) : null;
    }
    const updated = await prisma.post.update({ where: { id: this.id }, data });
    Object.assign(this, Post.fromDb(updated));
    return this;
  }

  async delete(): Promise<void> {
    await prisma.post.delete({ where: { id: this.id } });
  }

  async incrementViewCount(): Promise<void> {
    const updated = await prisma.post.update({ where: { id: this.id }, data: { viewCount: { increment: 1 } } });
    this.viewCount = updated.viewCount;
  }

  async toggleLike(userId: string): Promise<{ isLiked: boolean; likeCount: number }> {
    const current = await prisma.post.findUnique({ where: { id: this.id } });
    if (!current) throw AppError.notFound('Post not found');
    const likedUsers = current.likedUsers || [];
    const isLiked = !likedUsers.includes(userId);
    const nextLikedUsers = isLiked ? [...likedUsers, userId] : likedUsers.filter(id => id !== userId);
    const updated = await prisma.post.update({ where: { id: this.id }, data: { likedUsers: nextLikedUsers, likes: nextLikedUsers.length } });
    this.likes = updated.likes;
    this.likedUsers = updated.likedUsers;
    return { isLiked, likeCount: updated.likes };
  }

  async submitForReview(): Promise<Post> {
    if (this.status !== 'draft') throw AppError.badRequest('Only draft posts can be submitted for review');
    return this.update({ status: 'pending_editor', submittedAt: new Date().toISOString() });
  }

  async assignToEditor(editorId: string, editorName: string): Promise<Post> {
    if (this.status !== 'pending_editor') throw AppError.badRequest('Post must be pending editor review to assign editor');
    return this.update({ editorId, editorName });
  }

  async forwardToReviewer(reviewerId: string, reviewerName: string): Promise<Post> {
    if (this.status !== 'pending_editor') throw AppError.badRequest('Post must be pending editor review to forward to reviewer');
    return this.update({ status: 'pending_reviewer', reviewerId, reviewerName, reviewedAt: new Date().toISOString() });
  }

  async publishArticle(): Promise<Post> {
    if (!['pending_editor', 'pending_reviewer'].includes(this.status)) throw AppError.badRequest('Post must be pending review to publish');
    return this.update({ status: 'published', publishedAt: this.publishedAt || new Date().toISOString() });
  }

  async rejectForRevision(reason?: string): Promise<Post> {
    if (!['pending_editor', 'pending_reviewer'].includes(this.status)) throw AppError.badRequest('Post must be pending review to reject');
    return this.update({ status: 'draft', rejectionComment: reason || '' });
  }

  static async findPendingForEditor(limit?: number, offset?: number): Promise<{ posts: Post[]; total: number }> {
    return this.findMany({ status: 'pending_editor', limit, offset });
  }

  static async findPendingForReviewer(limit?: number, offset?: number): Promise<{ posts: Post[]; total: number }> {
    return this.findMany({ status: 'pending_reviewer', limit, offset });
  }

  static async findByAuthor(authorId: string, status?: PostStatus): Promise<{ posts: Post[]; total: number }> {
    return this.findMany({ authorId, status });
  }

  toJSON(): IPost {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      excerpt: this.excerpt,
      authorId: this.authorId,
      authorName: this.authorName,
      category: this.category,
      tags: this.tags,
      status: this.status,
      featuredImage: this.featuredImage,
      publishedAt: this.publishedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      viewCount: this.viewCount,
      likes: this.likes,
      slug: this.slug,
      editorId: this.editorId,
      editorName: this.editorName,
      reviewerId: this.reviewerId,
      reviewerName: this.reviewerName,
      submittedAt: this.submittedAt,
      reviewedAt: this.reviewedAt,
      rejectionComment: this.rejectionComment
    };
  }

  toJSONWithInteractions(isBookmarked = false, bookmarkCount = 0): IPost & { isBookmarked: boolean; bookmarkCount: number } {
    return { ...this.toJSON(), isBookmarked, bookmarkCount };
  }
}

export default Post;
