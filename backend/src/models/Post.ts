import { databases, DATABASE_ID, ID, Query } from '@/config/appwrite';
import { IPost, CreatePostRequest, UpdatePostRequest, PostStatus } from '@/types';
import { AppError } from '@/utils/AppError';
import { appLogger } from '@/services/logger';

const POSTS_COLLECTION_ID = process.env.APPWRITE_POSTS_COLLECTION_ID || 'posts';

export class Post implements IPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  authorId: string;
  authorName: string;
  category: string;
  tags: string[];
  status: PostStatus;
  featuredImage?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  likes: number;
  slug: string;
  editorId?: string;
  editorName?: string;
  reviewerId?: string;
  reviewerName?: string;
  submittedAt?: string;
  reviewedAt?: string;

  constructor(data: any) {
    this.id = data.$id || data.id;
    this.title = data.title;
    this.content = data.content;
    this.excerpt = data.excerpt;
    this.authorId = data.authorId;
    this.authorName = data.authorName;
    this.category = data.category;
    this.tags = Array.isArray(data.tags) ? data.tags : (data.tags ? (typeof data.tags === 'string' ? data.tags.split(',') : []) : []);
    this.status = data.status || 'draft';
    this.featuredImage = data.featuredImage;
    this.publishedAt = data.publishedAt;
    this.createdAt = data.$createdAt || data.createdAt || new Date().toISOString();
    this.updatedAt = data.$updatedAt || data.updatedAt || new Date().toISOString();
    this.viewCount = data.viewCount || 0;
    this.likes = data.likes || 0;
    this.slug = data.slug || this.generateSlug(data.title);
    this.editorId = data.editorId;
    this.editorName = data.editorName;
    this.reviewerId = data.reviewerId;
    this.reviewerName = data.reviewerName;
    this.submittedAt = data.submittedAt;
    this.reviewedAt = data.reviewedAt;
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  static async create(postData: CreatePostRequest, authorId: string, authorName: string): Promise<Post> {
    const startTime = Date.now();

    try {
      appLogger.debug('Creating new post', { title: postData.title, authorId });

      const slug = new Post({ title: postData.title }).generateSlug(postData.title);
      const now = new Date().toISOString();

      const documentData = {
        title: postData.title,
        content: postData.content,
        excerpt: postData.excerpt || postData.content.substring(0, 150) + '...',
        authorId,
        authorName,
        category: postData.category,
        tags: Array.isArray(postData.tags) ? postData.tags : [],
        status: postData.status || 'draft',
        featuredImage: postData.featuredImage || '',
        publishedAt: postData.status === 'published' ? now : '',
        viewCount: 0,
        likes: 0,
        slug: slug + '-' + Date.now() // Add timestamp to ensure uniqueness
      };

      const document = await databases.createDocument(
        DATABASE_ID,
        POSTS_COLLECTION_ID,
        ID.unique(),
        documentData
      );

      const duration = Date.now() - startTime;
      appLogger.logPerformance('Post.create', duration, { postId: document.$id });
      appLogger.logDatabase('create', 'posts', { title: postData.title }, null);

      return new Post(document);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('create', 'posts', { title: postData.title }, error);
      appLogger.logPerformance('Post.create', duration, { error: true });
      throw AppError.internal(`Failed to create post: ${error.message}`);
    }
  }

  static async findById(id: string): Promise<Post | null> {
    const startTime = Date.now();

    try {
      appLogger.debug('Finding post by ID', { id });

      const document = await databases.getDocument(DATABASE_ID, POSTS_COLLECTION_ID, id);

      const duration = Date.now() - startTime;
      appLogger.logPerformance('Post.findById', duration, { id, found: !!document });

      return new Post(document);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logPerformance('Post.findById', duration, { id, error: true });

      if (error.code === 404) {
        return null;
      }

      appLogger.logDatabase('findById', 'posts', { id }, error);
      throw AppError.internal(`Failed to find post: ${error.message}`);
    }
  }

  static async findBySlug(slug: string): Promise<Post | null> {
    const startTime = Date.now();

    try {
      appLogger.debug('Finding post by slug', { slug });

      const documents = await databases.listDocuments(
        DATABASE_ID,
        POSTS_COLLECTION_ID,
        [Query.equal('slug', slug)]
      );

      const duration = Date.now() - startTime;
      appLogger.logPerformance('Post.findBySlug', duration, { slug, found: documents.documents.length > 0 });

      if (documents.documents.length === 0) {
        return null;
      }

      return new Post(documents.documents[0]);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('findBySlug', 'posts', { slug }, error);
      appLogger.logPerformance('Post.findBySlug', duration, { slug, error: true });
      throw AppError.internal(`Failed to find post by slug: ${error.message}`);
    }
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
    const startTime = Date.now();

    try {
      appLogger.debug('Finding posts with options', options);

      const queries: string[] = [];

      if (options.status) {
        queries.push(Query.equal('status', options.status));
      }
      if (options.category) {
        queries.push(Query.equal('category', options.category));
      }
      if (options.authorId) {
        queries.push(Query.equal('authorId', options.authorId));
      }


      queries.push(Query.orderDesc('$createdAt'));

      if (options.limit) {
        queries.push(Query.limit(options.limit));
      }
      if (options.offset) {
        queries.push(Query.offset(options.offset));
      }

      const documents = await databases.listDocuments(
        DATABASE_ID,
        POSTS_COLLECTION_ID,
        queries
      );

      let posts = documents.documents.map(doc => new Post(doc));

      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        posts = posts.filter(post =>
          post.title.toLowerCase().includes(searchTerm) ||
          post.content.toLowerCase().includes(searchTerm) ||
          post.excerpt.toLowerCase().includes(searchTerm) ||
          post.authorName.toLowerCase().includes(searchTerm) ||
          post.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }

      const duration = Date.now() - startTime;
      appLogger.logPerformance('Post.findMany', duration, {
        count: posts.length,
        total: documents.total
      });

      return {
        posts,
        total: options.search ? posts.length : documents.total
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('findMany', 'posts', options, error);
      appLogger.logPerformance('Post.findMany', duration, { error: true });
      throw AppError.internal(`Failed to find posts: ${error.message}`);
    }
  }

  async update(updateData: Partial<UpdatePostRequest>): Promise<Post> {
    const startTime = Date.now();

    try {
      appLogger.debug('Updating post', { id: this.id, updateData });

      const documentData: any = {};

      if (updateData.title !== undefined) {
        documentData.title = updateData.title;
        documentData.slug = this.generateSlug(updateData.title) + '-' + Date.now();
      }
      if (updateData.content !== undefined) documentData.content = updateData.content;
      if (updateData.excerpt !== undefined) documentData.excerpt = updateData.excerpt;
      if (updateData.category !== undefined) documentData.category = updateData.category;
      if (updateData.tags !== undefined) {
        documentData.tags = Array.isArray(updateData.tags) ? updateData.tags : [];
      }
      if (updateData.status !== undefined) {
        documentData.status = updateData.status;
        if (updateData.status === 'published' && !this.publishedAt) {
          documentData.publishedAt = new Date().toISOString();
        }
      }
      if (updateData.featuredImage !== undefined) documentData.featuredImage = updateData.featuredImage;

      const document = await databases.updateDocument(
        DATABASE_ID,
        POSTS_COLLECTION_ID,
        this.id,
        documentData
      );

      const duration = Date.now() - startTime;
      appLogger.logPerformance('Post.update', duration, { id: this.id });
      appLogger.logDatabase('update', 'posts', { id: this.id }, null);

      Object.assign(this, new Post(document));
      return this;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('update', 'posts', { id: this.id }, error);
      appLogger.logPerformance('Post.update', duration, { id: this.id, error: true });
      throw AppError.internal(`Failed to update post: ${error.message}`);
    }
  }

  async delete(): Promise<void> {
    const startTime = Date.now();

    try {
      appLogger.debug('Deleting post', { id: this.id });

      await databases.deleteDocument(DATABASE_ID, POSTS_COLLECTION_ID, this.id);

      const duration = Date.now() - startTime;
      appLogger.logPerformance('Post.delete', duration, { id: this.id });
      appLogger.logDatabase('delete', 'posts', { id: this.id }, null);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('delete', 'posts', { id: this.id }, error);
      appLogger.logPerformance('Post.delete', duration, { id: this.id, error: true });
      throw AppError.internal(`Failed to delete post: ${error.message}`);
    }
  }

  async incrementViewCount(): Promise<void> {
    try {
      await databases.updateDocument(
        DATABASE_ID,
        POSTS_COLLECTION_ID,
        this.id,
        { viewCount: this.viewCount + 1 }
      );
      this.viewCount += 1;
    } catch (error: any) {
      appLogger.error('Failed to increment view count', error, { id: this.id });
    }
  }

  async toggleLike(userId: string): Promise<void> {
    try {
      const newLikes = Math.max(0, this.likes + (Math.random() > 0.5 ? 1 : -1));
      await databases.updateDocument(
        DATABASE_ID,
        POSTS_COLLECTION_ID,
        this.id,
        { likes: newLikes }
      );
      this.likes = newLikes;
    } catch (error: any) {
      appLogger.error('Failed to toggle like', error, { id: this.id, userId });
    }
  }

  async submitForReview(): Promise<Post> {
    if (this.status !== 'draft') {
      throw AppError.badRequest('Only draft posts can be submitted for review');
    }

    const now = new Date().toISOString();
    return await this.update({
      status: 'pending_editor',
      submittedAt: now
    });
  }

  async assignToEditor(editorId: string, editorName: string): Promise<Post> {
    if (this.status !== 'pending_editor') {
      throw AppError.badRequest('Post must be pending editor review to assign editor');
    }

    return await this.update({
      editorId,
      editorName
    });
  }

  async forwardToReviewer(reviewerId: string, reviewerName: string): Promise<Post> {
    if (this.status !== 'pending_editor') {
      throw AppError.badRequest('Post must be pending editor review to forward to reviewer');
    }

    const now = new Date().toISOString();
    return await this.update({
      status: 'pending_reviewer',
      reviewerId,
      reviewerName,
      reviewedAt: now
    });
  }

  async publishArticle(): Promise<Post> {
    if (this.status !== 'pending_reviewer') {
      throw AppError.badRequest('Post must be pending reviewer approval to publish');
    }

    const now = new Date().toISOString();
    return await this.update({
      status: 'published',
      publishedAt: now
    });
  }

  async rejectForRevision(reason?: string): Promise<Post> {
    if (!['pending_editor', 'pending_reviewer'].includes(this.status)) {
      throw AppError.badRequest('Post must be pending review to reject');
    }

    return await this.update({
      status: 'draft'
    });
  }

  static async findPendingForEditor(limit?: number, offset?: number): Promise<{ posts: Post[]; total: number }> {
    return await this.findMany({
      status: 'pending_editor',
      limit,
      offset,
      orderBy: '$createdAt'
    });
  }

  static async findPendingForReviewer(limit?: number, offset?: number): Promise<{ posts: Post[]; total: number }> {
    return await this.findMany({
      status: 'pending_reviewer',
      limit,
      offset,
      orderBy: '$createdAt'
    });
  }

  static async findByAuthor(authorId: string, status?: PostStatus): Promise<{ posts: Post[]; total: number }> {
    return await this.findMany({
      authorId,
      status,
      orderBy: '$createdAt'
    });
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
      reviewedAt: this.reviewedAt
    };
  }

  toJSONWithInteractions(isBookmarked: boolean = false, bookmarkCount: number = 0): IPost & { isBookmarked: boolean; bookmarkCount: number } {
    return {
      ...this.toJSON(),
      isBookmarked,
      bookmarkCount
    };
  }
}