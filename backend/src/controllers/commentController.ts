import { Response } from 'express';
const { validationResult } = require('express-validator');
import { Comment } from '@/models/Comment';
import { Post } from '@/models/Post';
import {
  AuthenticatedRequest,
  ApiResponse,
  CreateCommentRequest,
  UpdateCommentRequest
} from '@/types';
import { AppError } from '@/utils/AppError';
import { appLogger } from '@/services/logger';
import { catchAsync } from '@/middleware/errorHandler';

export const createComment = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map((err: any) => err.msg).join(', ');
      throw AppError.badRequest(`Validation failed: ${errorMessages}`);
    }

    const commentData: CreateCommentRequest = req.body;

    appLogger.debug('Creating comment', {
      postId: commentData.postId,
      authorId: req.user.id,
      hasParent: !!commentData.parentId
    });

    const post = await Post.findById(commentData.postId);
    if (!post) {
      throw AppError.notFound('Post not found');
    }

    if (post.status !== 'published') {
      throw AppError.forbidden('Cannot comment on unpublished posts');
    }

    if (commentData.parentId) {
      const parentComment = await Comment.findById(commentData.parentId);
      if (!parentComment || parentComment.postId !== commentData.postId) {
        throw AppError.badRequest('Invalid parent comment');
      }
    }

    const authorName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username;
    const comment = await Comment.create(commentData, req.user.id, authorName);

    const response: ApiResponse = {
      success: true,
      message: 'Comment created successfully',
      data: { comment: comment.toJSON() }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('createComment', duration, { commentId: comment.id });

    res.status(201).json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('createComment', duration, { error: true });
    throw error;
  }
});

export const getPostComments = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    appLogger.debug('Getting comments for post', {
      postId,
      page,
      limit,
      userId: req.user?.id
    });

    const post = await Post.findById(postId);
    if (!post) {
      throw AppError.notFound('Post not found');
    }

    if (post.status !== 'published' && req.user?.role === 'Student') {
      throw AppError.forbidden('Cannot view comments on unpublished posts');
    }

    const offset = (Number(page) - 1) * Number(limit);
    const { comments, total } = await Comment.getPostComments(postId, Number(limit), offset);

    const parentComments = comments.filter(comment => !comment.parentId);
    const replies = comments.filter(comment => !!comment.parentId);

    const commentThreads = await Promise.all(
      parentComments.map(async parent => {
        const parentJson = parent.toJSON();
        const parentReplies = replies.filter(reply => reply.parentId === parent.id);

        if (req.user) {
          parentJson.isLikedByUser = await parent.isLikedByUser(req.user.id);
        }

        const repliesWithLikeStatus = await Promise.all(
          parentReplies.map(async reply => {
            const replyJson = reply.toJSON();
            if (req.user) {
              replyJson.isLikedByUser = await reply.isLikedByUser(req.user.id);
            }
            return replyJson;
          })
        );

        return {
          ...parentJson,
          replies: repliesWithLikeStatus
        };
      })
    );

    const totalPages = Math.ceil(total / Number(limit));

    const response: ApiResponse = {
      success: true,
      message: 'Comments retrieved successfully',
      data: {
        comments: commentThreads,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalComments: total,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
          limit: Number(limit)
        }
      }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('getPostComments', duration, {
      postId,
      count: comments.length,
      total
    });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('getPostComments', duration, { error: true });
    throw error;
  }
});

export const updateComment = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map((err: any) => err.msg).join(', ');
      throw AppError.badRequest(`Validation failed: ${errorMessages}`);
    }

    const { commentId } = req.params;
    const updateData: UpdateCommentRequest = req.body;

    appLogger.debug('Updating comment', {
      commentId,
      userId: req.user.id,
      updateData
    });

    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw AppError.notFound('Comment not found');
    }

    if (comment.authorId !== req.user.id && !req.user.hasPermission('moderate_content')) {
      throw AppError.forbidden('You can only edit your own comments');
    }

    if (comment.isDeleted) {
      throw AppError.badRequest('Cannot edit deleted comments');
    }

    await comment.update(updateData);

    const response: ApiResponse = {
      success: true,
      message: 'Comment updated successfully',
      data: { comment: comment.toJSON() }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('updateComment', duration, { commentId });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('updateComment', duration, { error: true });
    throw error;
  }
});

export const deleteComment = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const { commentId } = req.params;

    appLogger.debug('Deleting comment', {
      commentId,
      userId: req.user.id
    });

    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw AppError.notFound('Comment not found');
    }

    if (comment.authorId !== req.user.id && !req.user.hasPermission('moderate_content')) {
      throw AppError.forbidden('You can only delete your own comments');
    }

    if (comment.isDeleted) {
      throw AppError.badRequest('Comment is already deleted');
    }

    await comment.delete();

    const response: ApiResponse = {
      success: true,
      message: 'Comment deleted successfully'
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('deleteComment', duration, { commentId });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('deleteComment', duration, { error: true });
    throw error;
  }
});

export const toggleCommentLike = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const { commentId } = req.params;

    appLogger.debug('Toggling comment like', {
      commentId,
      userId: req.user.id
    });

    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw AppError.notFound('Comment not found');
    }

    if (comment.isDeleted) {
      throw AppError.badRequest('Cannot like deleted comments');
    }

    const likeResult = await comment.toggleLike(req.user.id);

    const response: ApiResponse = {
      success: true,
      message: 'Comment like toggled successfully',
      data: {
        comment: {
          ...comment.toJSON(),
          isLikedByUser: likeResult.isLiked,
          likes: likeResult.likeCount
        }
      }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('toggleCommentLike', duration, { commentId });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('toggleCommentLike', duration, { error: true });
    throw error;
  }
});