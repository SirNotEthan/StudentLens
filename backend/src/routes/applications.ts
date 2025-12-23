import { Router } from 'express';
import {
  createApplication,
  getMyApplication,
  getAllApplications,
  reviewApplication,
  getApplicationById,
  deleteApplication,
  getApplicationStats
} from '@/controllers/applicationController';
import { authenticate, authorizeRole, authorizePermission } from '@/middleware/auth';
import { validateCreateApplication, validateReviewApplication } from '@/middleware/validation';

const router = Router();

router.use(authenticate);

router.post('/', validateCreateApplication, createApplication);
router.get('/my-application', getMyApplication);

router.get('/', authorizePermission('manage_applications'), getAllApplications);
router.get('/stats', authorizePermission('manage_applications'), getApplicationStats);
router.get('/:id', authorizePermission('manage_applications'), getApplicationById);
router.put('/:id/review', authorizePermission('manage_applications'), validateReviewApplication, reviewApplication);
router.delete('/:id', deleteApplication); 

export default router;