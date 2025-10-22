import { databases, DATABASE_ID, ID, Query } from '@/config/appwrite';
import { IComment, CreateCommentRequest, UpdateCommentRequest } from '@/types';
import { AppError } from '@/utils/AppError';
import { appLogger } from '@/services/logger';

const COMMENTS_COLLECTION_ID = process.env.APPWRITE_COMMENTS_COLLECTION_ID || 'comments';

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

  constructor(data: any) {
    this.id = data.$id || data.id;
    this.postId = data.postId;
    this.authorId = data.authorId;
    this.authorName = data.authorName;
    this.content = data.content;
    this.parentId = data.parentId;
    this.isDeleted = data.isDeleted || false;
    this.createdAt = data.$createdAt || data.createdAt || new Date().toISOString();
    this.updatedAt = data.$updatedAt || data.updatedAt || new Date().toISOString();
    this.likes = data.likes || 0;
  }

  static async create(commentData: CreateCommentRequest, authorId: string, authorName: string): Promise<Comment> {
    const startTime = Date.now();

    try {
      appLogger.debug('Creating comment', {
        postId: commentData.postId,
        authorId,
        hasParent: !!commentData.parentId
      });

      const docData = {
        postId: commentData.postId,
        authorId,
        authorName,
        content: commentData.content,
        parentId: commentData.parentId || null,
        isDeleted: false,
        likes: 0
      };

      const document = await databases.createDocument(
        DATABASE_ID,
        COMMENTS_COLLECTION_ID,
        ID.unique(),
        docData
      );

      const comment = new Comment(document);

      const duration = Date.now() - startTime;
      appLogger.logPerformance('Comment.create', duration, { commentId: comment.id });
      appLogger.info('Comment created successfully', {
        commentId: comment.id,
        postId: comment.postId,
        authorId: comment.authorId
      });

      return comment;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('create', 'comments', commentData, error);
      appLogger.logPerformance('Comment.create', duration, { error: true });
      throw AppError.internal(`Failed to create comment: ${error.message}`);
    }
  }

  static async getPostComments(postId: string, limit: number = 50, offset: number = 0): Promise<{ comments: Comment[]; total: number }> {
    const startTime = Date.now();

    try {
      appLogger.debug('Getting comments for post', { postId, limit, offset });

      const queries = [
        Query.equal('postId', postId),
        Query.equal('isDeleted', false),
        Query.orderDesc('$createdAt'),
        Query.limit(limit),
        Query.offset(offset)
      ];

      const documents = await databases.listDocuments(
        DATABASE_ID,
        COMMENTS_COLLECTION_ID,
        queries
      );

      const comments = documents.documents.map(doc => new Comment(doc));

      const duration = Date.now() - startTime;
      appLogger.logPerformance('Comment.getPostComments', duration, {
        postId,
        count: comments.length,
        total: documents.total
      });

      return {
        comments,
        total: documents.total
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('getPostComments', 'comments', { postId }, error);
      appLogger.logPerformance('Comment.getPostComments', duration, { error: true });
      throw AppError.internal(`Failed to get comments: ${error.message}`);
    }
  }

  static async findById(id: string): Promise<Comment | null> {
    const startTime = Date.now();

    try {
      appLogger.debug('Finding comment by ID', { id });

      const document = await databases.getDocument(
        DATABASE_ID,
        COMMENTS_COLLECTION_ID,
        id
      );

      const comment = new Comment(document);

      const duration = Date.now() - startTime;
      appLogger.logPerformance('Comment.findById', duration, { id });

      return comment;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logPerformance('Comment.findById', duration, { id, error: true });

      if (error.code === 404) {
        return null;
      }
      throw AppError.internal(`Failed to find comment: ${error.message}`);
    }
  }

  async update(updateData: UpdateCommentRequest): Promise<this> {
    const startTime = Date.now();

    try {
      appLogger.debug('Updating comment', { commentId: this.id, updateData });

      const document = await databases.updateDocument(
        DATABASE_ID,
        COMMENTS_COLLECTION_ID,
        this.id,
        {
          content: updateData.content
        }
      );

      this.content = updateData.content;
      this.updatedAt = document.$updatedAt;

      const duration = Date.now() - startTime;
      appLogger.logPerformance('Comment.update', duration, { commentId: this.id });
      appLogger.info('Comment updated successfully', { commentId: this.id });

      return this;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('update', 'comments', { id: this.id, updateData }, error);
      appLogger.logPerformance('Comment.update', duration, { commentId: this.id, error: true });
      throw AppError.internal(`Failed to update comment: ${error.message}`);
    }
  }

  async delete(): Promise<void> {
    const startTime = Date.now();

    try {
      appLogger.debug('Deleting comment', { commentId: this.id });

      const updatedDoc = await databases.updateDocument(
        DATABASE_ID,
        COMMENTS_COLLECTION_ID,
        this.id,
        {
          isDeleted: true,
          content: '[Comment deleted]'
        }
      );

      this.isDeleted = true;
      this.content = '[Comment deleted]';
      this.updatedAt = updatedDoc.$updatedAt;

      const duration = Date.now() - startTime;
      appLogger.logPerformance('Comment.delete', duration, { commentId: this.id });
      appLogger.info('Comment deleted successfully', { commentId: this.id });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('delete', 'comments', { id: this.id }, error);
      appLogger.logPerformance('Comment.delete', duration, { commentId: this.id, error: true });
      throw AppError.internal(`Failed to delete comment: ${error.message}`);
    }
  }

  async toggleLike(userId: string): Promise<{ isLiked: boolean; likeCount: number }> {
    const startTime = Date.now();

    try {
      appLogger.debug('Toggling comment like', { commentId: this.id, userId, currentLikes: this.likes });


      const currentDoc = await databases.getDocument(DATABASE_ID, COMMENTS_COLLECTION_ID, this.id);
      const likedUsers = currentDoc.likedUsers || [];

      const userIndex = likedUsers.indexOf(userId);
      let newLikedUsers: string[];
      let newLikes: number;
      let isLiked: boolean;

      if (userIndex === -1) {
        newLikedUsers = [...likedUsers, userId];
        newLikes = this.likes + 1;
        isLiked = true;
      } else {
        newLikedUsers = likedUsers.filter((id: string) => id !== userId);
        newLikes = Math.max(0, this.likes - 1);
        isLiked = false;
      }

      const updatedDoc = await databases.updateDocument(
        DATABASE_ID,
        COMMENTS_COLLECTION_ID,
        this.id,
        {
          likes: newLikes,
          likedUsers: newLikedUsers
        }
      );

      this.likes = newLikes;
      this.updatedAt = updatedDoc.$updatedAt;

      const duration = Date.now() - startTime;
      appLogger.logPerformance('Comment.toggleLike', duration, { commentId: this.id, isLiked });

      return { isLiked, likeCount: newLikes };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('toggleLike', 'comments', { id: this.id }, error);
      appLogger.logPerformance('Comment.toggleLike', duration, { commentId: this.id, error: true });
      throw AppError.internal(`Failed to toggle comment like: ${error.message}`);
    }
  }

  async isLikedByUser(userId: string): Promise<boolean> {
    try {
      const doc = await databases.getDocument(DATABASE_ID, COMMENTS_COLLECTION_ID, this.id);
      const likedUsers = doc.likedUsers || [];
      return likedUsers.includes(userId);
    } catch (error) {
      appLogger.error('Failed to check if comment is liked by user', error);
      return false;
    }
  }

  toJSON(userId?: string): IComment & { isLikedByUser?: boolean } {
    const json: IComment & { isLikedByUser?: boolean } = {
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

    if (userId) {
    }

    return json;
  }
}

export default Comment;