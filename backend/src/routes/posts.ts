import { Router } from 'express';
import {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  publishPost,
  toggleLike,
  getMyPosts,
  submitForReview,
  forwardToReviewer,
  publishArticle,
  rejectForRevision,
  getPendingForEditor,
  getPendingForReviewer,
  getPublicPosts,
  getPublicPost,
  getFeaturedPosts,
  searchPosts,
  toggleBookmark,
  getUserBookmarks,
  getPostInteractions
} from '@/controllers/postController';
import { authenticate, authorizePermission } from '@/middleware/auth';
import {
  validateCreatePost,
  validateUpdatePost,
  validatePostId,
  validatePostIdParam,
  validatePostQuery,
  validate
} from '@/middleware/validation';
import { authLimiter, apiLimiter } from '@/middleware/security';

const router = Router();

router.use((req, res, next) => {
  if (req.path === '/public' || req.path === '/featured' || req.path === '/search' || req.path.startsWith('/public/')) {
    return next();
  }
  return authenticate(req, res, next);
});

router.get('/public',
  apiLimiter,
  validate(validatePostQuery),
  getPublicPosts
);

router.get('/public/:id',
  apiLimiter,
  validate(validatePostId),
  getPublicPost
);

router.get('/featured',
  apiLimiter,
  validate(validatePostQuery),
  getFeaturedPosts
);

router.get('/search',
  apiLimiter,
  validate(validatePostQuery),
  searchPosts
);

router.get('/',
  validate(validatePostQuery),
  getPosts
);

router.get('/my',
  validate(validatePostQuery),
  getMyPosts
);

router.get('/bookmarks',
  getUserBookmarks
);

router.get('/pending/editor',
  authorizePermission('edit_articles'),
  validate(validatePostQuery),
  getPendingForEditor
);

router.get('/pending/reviewer',
  authorizePermission('review_articles'),
  validate(validatePostQuery),
  getPendingForReviewer
);

router.get('/:id/interactions',
  validate(validatePostId),
  getPostInteractions
);

router.get('/:id',
  validate(validatePostId),
  getPost
);

router.post('/',
  authLimiter,
  validate(validateCreatePost),
  createPost
);

router.put('/:id',
  authLimiter,
  validate(validateUpdatePost),
  updatePost
);

router.delete('/:id',
  validate(validatePostId),
  deletePost
);

router.patch('/:id/publish',
  validate(validatePostId),
  publishPost
);

router.patch('/:id/submit',
  validate(validatePostId),
  submitForReview
);

router.patch('/:id/forward',
  authorizePermission('edit_articles'),
  validate(validatePostId),
  forwardToReviewer
);

router.patch('/:id/publish-article',
  authorizePermission('review_articles'),
  validate(validatePostId),
  publishArticle
);

router.patch('/:id/reject',
  validate(validatePostId),
  rejectForRevision
);

router.patch('/:id/like',
  validate(validatePostId),
  toggleLike
);

router.patch('/:postId/bookmark',
  validate(validatePostIdParam),
  toggleBookmark
);

export default router;