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
  getUserBookmarks
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
import { authLimiter } from '@/middleware/security';

const router = Router();

router.use((req, res, next) => {
  if (req.path === '/public' || req.path === '/featured' || req.path === '/search' || req.path.startsWith('/public/')) {
    return next();
  }
  return authenticate(req, res, next);
});

router.get('/public',
  validate(validatePostQuery),
  getPublicPosts
);

router.get('/public/:id',
  validate(validatePostId),
  getPublicPost
);

router.get('/featured',
  validate(validatePostQuery),
  getFeaturedPosts
);

router.get('/search',
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

router.patch('/:id/like',
  validate(validatePostId),
  toggleLike
);

router.patch('/:postId/bookmark',
  validate(validatePostIdParam),
  toggleBookmark
);

router.get('/bookmarks',
  getUserBookmarks
);

export default router;