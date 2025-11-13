import { Response, Request } from 'express';
const { validationResult } = require('express-validator');
import { Post } from '@/models/Post';
import { Bookmark } from '@/models/Bookmark';
import { databases, DATABASE_ID } from '@/config/appwrite';
import {
  AuthenticatedRequest,
  ApiResponse,
  CreatePostRequest,
  UpdatePostRequest,
  PostListResponse,
  PostResponse,
  PostStatus
} from '@/types';
import { AppError } from '@/utils/AppError';
import { appLogger } from '@/services/logger';
import { catchAsync } from '@/middleware/errorHandler';

const POSTS_COLLECTION_ID = process.env.APPWRITE_POSTS_COLLECTION_ID || 'posts';

export const createPost = catchAsync(async (
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

    if (!req.user.canAccess('articles', 'write')) {
      throw AppError.forbidden('You do not have permission to create posts.');
    }

    const postData: CreatePostRequest = req.body;

    appLogger.debug('Creating post', {
      title: postData.title,
      authorId: req.user.id,
      category: postData.category
    });

    // Construct author name with fallback to email if all fields are empty
    const fullName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();
    const authorName = fullName || req.user.username || req.user.email.split('@')[0] || 'Anonymous';

    const post = await Post.create(postData, req.user.id, authorName, req.user.username);

    const response: PostResponse = {
      success: true,
      post: post.toJSON()
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('createPost', duration, { postId: post.id });

    res.status(201).json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('createPost', duration, { error: true });
    appLogger.error('Failed to create post', error, {
      userId: req.user.id,
      userRole: req.user.role,
      title: req.body?.title,
      hasUsername: !!req.user.username,
      hasFirstName: !!req.user.firstName,
      hasLastName: !!req.user.lastName
    });
    throw error;
  }
});

export const getPosts = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    if (!req.user.canAccess('articles', 'read')) {
      throw AppError.forbidden('You do not have permission to read posts.');
    }

    const {
      status,
      category,
      authorId,
      search,
      page = 1,
      limit = 10,
      orderBy = 'createdAt'
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    const options: any = {
      limit: Number(limit),
      offset,
      orderBy: orderBy as string
    };

    if (req.user.role === 'Student') {
      options.status = 'published';
    } else if (status && typeof status === 'string') {
      options.status = status as PostStatus;
    } else if (['Writer', 'Editor', 'Teacher', 'Owner'].includes(req.user.role)) {
    }

    if (category && typeof category === 'string') {
      options.category = category;
    }

    if (authorId && typeof authorId === 'string') {
      options.authorId = authorId;
    }

    if (search && typeof search === 'string') {
      options.search = search;
    }

    appLogger.debug('Getting posts with options', options);

    const { posts, total } = await Post.findMany(options);

    const totalPages = Math.ceil(total / Number(limit));

    const response: PostListResponse = {
      success: true,
      posts: posts.map(post => post.toJSON()),
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalUsers: total,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1,
        limit: Number(limit)
      }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('getPosts', duration, { count: posts.length, total });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('getPosts', duration, { error: true });
    throw error;
  }
});

export const getPost = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    if (!req.user.canAccess('articles', 'read')) {
      throw AppError.forbidden('You do not have permission to read posts.');
    }

    const { id } = req.params;

    appLogger.debug('Getting post', { id, userId: req.user.id });

    let post: Post | null = null;

    try {
      post = await Post.findById(id);
    } catch (error) {
      post = await Post.findBySlug(id);
    }

    if (!post) {
      throw AppError.notFound('Post not found');
    }

    if (post.status !== 'published' && req.user.role === 'Student') {
      throw AppError.forbidden('You do not have permission to view this post.');
    }

    await post.incrementViewCount();

    const response: PostResponse = {
      success: true,
      post: post.toJSON()
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('getPost', duration, { postId: post.id });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('getPost', duration, { error: true });
    throw error;
  }
});

export const updatePost = catchAsync(async (
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

    const { id } = req.params;
    const updateData: UpdatePostRequest = { ...req.body, id };

    appLogger.debug('Updating post', { id, userId: req.user.id });

    const post = await Post.findById(id);
    if (!post) {
      throw AppError.notFound('Post not found');
    }

    const isAuthor = post.authorId === req.user.id;
    const canEdit = req.user.canAccess('articles', 'edit');

    if (!isAuthor && !canEdit) {
      throw AppError.forbidden('You do not have permission to edit this post.');
    }

    if (isAuthor && !canEdit && post.status !== 'draft') {
      throw AppError.forbidden('You can only edit your own draft posts.');
    }

    await post.update(updateData);

    const response: PostResponse = {
      success: true,
      post: post.toJSON()
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('updatePost', duration, { postId: post.id });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('updatePost', duration, { error: true });
    throw error;
  }
});

export const deletePost = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const { id } = req.params;

    appLogger.debug('Deleting post', { id, userId: req.user.id });

    const post = await Post.findById(id);
    if (!post) {
      throw AppError.notFound('Post not found');
    }

    const isAuthor = post.authorId === req.user.id;
    const canDelete = req.user.canAccess('articles', 'delete');

    if (!isAuthor && !canDelete) {
      throw AppError.forbidden('You do not have permission to delete this post.');
    }

    if (isAuthor && !canDelete && post.status !== 'draft') {
      throw AppError.forbidden('You can only delete your own draft posts.');
    }

    await post.delete();

    const response: ApiResponse = {
      success: true,
      message: 'Post deleted successfully'
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('deletePost', duration, { postId: post.id });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('deletePost', duration, { error: true });
    throw error;
  }
});

export const publishPost = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const { id } = req.params;

    if (!req.user.canAccess('articles', 'publish')) {
      throw AppError.forbidden('You do not have permission to publish posts.');
    }

    appLogger.debug('Publishing post', { id, userId: req.user.id });

    const post = await Post.findById(id);
    if (!post) {
      throw AppError.notFound('Post not found');
    }

    await post.update({ status: 'published' });

    const response: PostResponse = {
      success: true,
      post: post.toJSON()
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('publishPost', duration, { postId: post.id });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('publishPost', duration, { error: true });
    throw error;
  }
});

export const toggleLike = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const { id } = req.params;

    appLogger.debug('Toggling like on post', { id, userId: req.user.id });

    const post = await Post.findById(id);
    if (!post) {
      throw AppError.notFound('Post not found');
    }

    const likeResult = await post.toggleLike(req.user.id);
    const postJson = post.toJSON();

    const response: ApiResponse = {
      success: true,
      message: likeResult.isLiked ? 'Post liked successfully' : 'Post unliked successfully',
      data: {
        postId: post.id,
        isLiked: likeResult.isLiked,
        likeCount: likeResult.likeCount || postJson.likes || 0
      }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('toggleLike', duration, { postId: post.id, isLiked: likeResult.isLiked });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('toggleLike', duration, { error: true });
    throw error;
  }
});

export const getMyPosts = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const {
      status,
      page = 1,
      limit = 10
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    const options: any = {
      authorId: req.user.id,
      limit: Number(limit),
      offset
    };

    if (status && typeof status === 'string') {
      options.status = status as PostStatus;
    }

    appLogger.debug('Getting user posts', { userId: req.user.id, options });

    const { posts, total } = await Post.findMany(options);

    const totalPages = Math.ceil(total / Number(limit));

    const response: PostListResponse = {
      success: true,
      posts: posts.map(post => post.toJSON()),
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalUsers: total,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1,
        limit: Number(limit)
      }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('getMyPosts', duration, { count: posts.length, total });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('getMyPosts', duration, { error: true });
    throw error;
  }
});


export const submitForReview = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const { id } = req.params;

    appLogger.debug('Submitting post for review', { postId: id, authorId: req.user.id });

    const post = await Post.findById(id);
    if (!post) {
      throw AppError.notFound('Post not found');
    }

    if (post.authorId !== req.user.id) {
      throw AppError.forbidden('You can only submit your own posts for review');
    }

    if (!req.user.hasPermission('write_articles')) {
      throw AppError.forbidden('You do not have permission to submit posts for review');
    }

    const updatedPost = await post.submitForReview();

    const duration = Date.now() - startTime;
    appLogger.logPerformance('submitForReview', duration, { postId: id });

    res.json({
      success: true,
      message: 'Post submitted for review successfully',
      data: { post: updatedPost.toJSON() }
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('submitForReview', duration, { error: true });
    throw error;
  }
});

export const forwardToReviewer = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const { reviewerId, reviewerName } = req.body;

    appLogger.debug('Forwarding post to reviewer', { postId: id, editorId: req.user.id, reviewerId });

    if (!req.user.hasPermission('edit_articles')) {
      throw AppError.forbidden('You do not have permission to forward posts to reviewers');
    }

    const post = await Post.findById(id);
    if (!post) {
      throw AppError.notFound('Post not found');
    }

    const updatedPost = await post.forwardToReviewer(reviewerId, reviewerName);

    const duration = Date.now() - startTime;
    appLogger.logPerformance('forwardToReviewer', duration, { postId: id });

    res.json({
      success: true,
      message: 'Post forwarded to reviewer successfully',
      data: { post: updatedPost.toJSON() }
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('forwardToReviewer', duration, { error: true });
    throw error;
  }
});

export const publishArticle = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const { id } = req.params;

    appLogger.debug('Publishing article', { postId: id, reviewerId: req.user.id });

    if (!req.user.hasPermission('review_articles')) {
      throw AppError.forbidden('You do not have permission to publish articles');
    }

    const post = await Post.findById(id);
    if (!post) {
      throw AppError.notFound('Post not found');
    }

    const updatedPost = await post.publishArticle();

    const duration = Date.now() - startTime;
    appLogger.logPerformance('publishArticle', duration, { postId: id });

    res.json({
      success: true,
      message: 'Article published successfully',
      data: { post: updatedPost.toJSON() }
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('publishArticle', duration, { error: true });
    throw error;
  }
});

export const rejectForRevision = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const { reason } = req.body;

    appLogger.debug('Rejecting post for revision', { postId: id, userId: req.user.id });

    if (!req.user.hasPermission('edit_articles') && !req.user.hasPermission('review_articles')) {
      throw AppError.forbidden('You do not have permission to reject posts');
    }

    const post = await Post.findById(id);
    if (!post) {
      throw AppError.notFound('Post not found');
    }

    const updatedPost = await post.rejectForRevision(reason);

    const duration = Date.now() - startTime;
    appLogger.logPerformance('rejectForRevision', duration, { postId: id });

    res.json({
      success: true,
      message: 'Post rejected for revision',
      data: { post: updatedPost.toJSON() }
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('rejectForRevision', duration, { error: true });
    throw error;
  }
});

export const getPendingForEditor = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    appLogger.debug('Getting posts pending editor review', { userId: req.user.id });

    if (!req.user.hasPermission('edit_articles')) {
      throw AppError.forbidden('You do not have permission to view posts pending editor review');
    }

    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const { posts, total } = await Post.findPendingForEditor(Number(limit), offset);

    const totalPages = Math.ceil(total / Number(limit));

    const response: PostListResponse = {
      success: true,
      posts: posts.map(post => post.toJSON()),
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalUsers: total,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1,
        limit: Number(limit)
      }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('getPendingForEditor', duration, { count: posts.length, total });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('getPendingForEditor', duration, { error: true });
    throw error;
  }
});

export const getPendingForReviewer = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    appLogger.debug('Getting posts pending reviewer approval', { userId: req.user.id });

    if (!req.user.hasPermission('review_articles')) {
      throw AppError.forbidden('You do not have permission to view posts pending reviewer approval');
    }

    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const { posts, total } = await Post.findPendingForReviewer(Number(limit), offset);

    const totalPages = Math.ceil(total / Number(limit));

    const response: PostListResponse = {
      success: true,
      posts: posts.map(post => post.toJSON()),
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalUsers: total,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1,
        limit: Number(limit)
      }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('getPendingForReviewer', duration, { count: posts.length, total });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('getPendingForReviewer', duration, { error: true });
    throw error;
  }
});

export const getPublicPosts = catchAsync(async (
  req: Request,
  res: Response
): Promise<void> => {
  const startTime = Date.now();
  try {
    const {
      category,
      page = 1,
      limit = 10,
      orderBy = 'createdAt'
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const options: any = {
      limit: Number(limit),
      offset,
      orderBy: orderBy as string,
      status: 'published' // Only show published posts for public access
    };

    if (category && category !== 'ALL') {
      options.category = category as string;
    }

    appLogger.debug('Fetching public posts', options);

    const { posts, total } = await Post.findMany(options);
    const totalPages = Math.ceil(total / Number(limit));

    const response: PostListResponse = {
      success: true,
      posts: posts.map(post => post.toJSON()),
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalUsers: total,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1,
        limit: Number(limit)
      }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('getPublicPosts', duration, { count: posts.length, total });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('getPublicPosts', duration, { error: true });
    throw error;
  }
});

export const getFeaturedPosts = catchAsync(async (
  req: Request,
  res: Response
): Promise<void> => {
  const startTime = Date.now();
  try {
    const {
      limit = 3
    } = req.query;

    const options: any = {
      limit: Number(limit),
      offset: 0,
      orderBy: 'viewCount', // Featured posts ordered by view count
      status: 'published'
    };

    appLogger.debug('Fetching featured posts', options);

    const { posts, total } = await Post.findMany(options);

    const response: PostListResponse = {
      success: true,
      posts: posts.map(post => post.toJSON()),
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalUsers: total,
        hasNext: false,
        hasPrev: false,
        limit: Number(limit)
      }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('getFeaturedPosts', duration, { count: posts.length, total });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('getFeaturedPosts', duration, { error: true });
    throw error;
  }
});

export const searchPosts = catchAsync(async (
  req: Request,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const {
      search,
      category,
      page = 1,
      limit = 10,
      orderBy = 'createdAt'
    } = req.query;

    if (!search || typeof search !== 'string' || search.trim().length === 0) {
      const response: PostListResponse = {
        success: true,
        posts: [],
        pagination: {
          currentPage: Number(page),
          totalPages: 0,
          totalUsers: 0,
          hasNext: false,
          hasPrev: false,
          limit: Number(limit)
        }
      };
      res.json(response);
      return;
    }

    const offset = (Number(page) - 1) * Number(limit);

    const options: any = {
      search: search as string,
      limit: Number(limit),
      offset,
      orderBy: orderBy as string,
      status: 'published' // Only search published posts for public access
    };

    if (category && typeof category === 'string') {
      options.category = category;
    }

    appLogger.debug('Searching posts with options', options);

    const { posts, total } = await Post.findMany(options);

    const totalPages = Math.ceil(total / Number(limit));

    const response: PostListResponse = {
      success: true,
      posts: posts.map(post => post.toJSON()),
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalUsers: total,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1,
        limit: Number(limit)
      }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('searchPosts', duration, {
      searchTerm: search,
      count: posts.length,
      total
    });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('searchPosts', duration, { error: true });
    throw error;
  }
});

export const toggleBookmark = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const { postId } = req.params;

    appLogger.debug('Toggling bookmark', {
      postId,
      userId: req.user.id
    });

    const post = await Post.findById(postId);
    if (!post) {
      throw AppError.notFound('Post not found');
    }

    const existingBookmark = await Bookmark.findByUserAndPost(req.user.id, postId);

    let isBookmarked = false;
    let message = '';

    if (existingBookmark) {
      await Bookmark.deleteByUserAndPost(req.user.id, postId);
      isBookmarked = false;
      message = 'Bookmark removed successfully';
    } else {
      await Bookmark.create(req.user.id, postId);
      isBookmarked = true;
      message = 'Post bookmarked successfully';
    }

    const bookmarkCount = await Bookmark.getPostBookmarkCount(postId);

    const response: ApiResponse = {
      success: true,
      message,
      data: {
        postId,
        isBookmarked,
        bookmarkCount
      }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('toggleBookmark', duration, { postId, isBookmarked });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('toggleBookmark', duration, { error: true });
    throw error;
  }
});

export const getUserBookmarks = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const { page = 1, limit = 10 } = req.query;

    appLogger.debug('Getting user bookmarks', {
      userId: req.user.id,
      page,
      limit
    });

    const offset = (Number(page) - 1) * Number(limit);
    const { bookmarks, total } = await Bookmark.getUserBookmarks(req.user.id, Number(limit), offset);

    const postPromises = bookmarks.map(bookmark => Post.findById(bookmark.postId));
    const posts = await Promise.all(postPromises);

    const validPosts = posts.filter(post => post !== null);

    const totalPages = Math.ceil(total / Number(limit));

    const response: PostListResponse = {
      success: true,
      posts: validPosts.map(post => post!.toJSON()),
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalUsers: total,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1,
        limit: Number(limit)
      }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('getUserBookmarks', duration, {
      userId: req.user.id,
      count: validPosts.length,
      total
    });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('getUserBookmarks', duration, { error: true });
    throw error;
  }
});

export const getPublicPost = catchAsync(async (
  req: Request,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const { id } = req.params;

    appLogger.debug('Getting public post', { id });

    let post: Post | null = null;

    try {
      post = await Post.findById(id);
    } catch (error) {
      post = await Post.findBySlug(id);
    }

    if (!post) {
      throw AppError.notFound('Post not found');
    }

    if (post.status !== 'published') {
      throw AppError.notFound('Post not found');
    }

    const response: PostResponse = {
      success: true,
      post: post.toJSON()
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('getPublicPost', duration, { postId: post.id });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('getPublicPost', duration, { error: true });
    throw error;
  }
});

export const getPostInteractions = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const { id } = req.params;

    appLogger.debug('Getting post interactions', { postId: id, userId: req.user.id });

    const post = await Post.findById(id);
    if (!post) {
      throw AppError.notFound('Post not found');
    }

    const currentDoc = await databases.getDocument(DATABASE_ID, POSTS_COLLECTION_ID, id);
    const likedUsers = currentDoc.likedUsers || [];
    const isLiked = likedUsers.includes(req.user.id);
    const isBookmarked = await Bookmark.findByUserAndPost(req.user.id, id) !== null;
    const bookmarkCount = await Bookmark.getPostBookmarkCount(id);

    const response: ApiResponse = {
      success: true,
      message: 'Post interactions retrieved successfully',
      data: {
        postId: id,
        isLiked,
        isBookmarked,
        likeCount: post.likes || 0,
        bookmarkCount
      }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('getPostInteractions', duration, { postId: id });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('getPostInteractions', duration, { error: true });
    throw error;
  }
});