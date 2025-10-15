import { Router } from 'express';
import {
  createComment,
  getPostComments,
  updateComment,
  deleteComment,
  toggleCommentLike
} from '@/controllers/commentController';
import { authenticate, optionalAuth } from '@/middleware/auth';
import { authLimiter } from '@/middleware/security';
import { validateCreateComment, validateUpdateComment, validateCommentId, validatePostIdParam, validate } from '@/middleware/validation';

const router = Router();

router.get('/post/:postId',
  validate(validatePostIdParam),
  optionalAuth,
  getPostComments
);

router.use(authenticate);

router.post('/',
  authLimiter,
  validate(validateCreateComment),
  createComment
);

router.put('/:commentId',
  authLimiter,
  validate(validateUpdateComment),
  updateComment
);

router.delete('/:commentId',
  validate(validateCommentId),
  deleteComment
);

router.patch('/:commentId/like',
  validate(validateCommentId),
  toggleCommentLike
);

export default router;