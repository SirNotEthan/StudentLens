import { Router } from 'express';
import {
  submitContactForm,
  getSubmissions,
  updateSubmissionStatus,
  deleteSubmission
} from '@/controllers/contactController';
import { contactLimiter } from '@/middleware/security';
import { authenticate, authorizeRole } from '@/middleware/auth';

const router = Router();

// Public: submit contact form
router.post('/', contactLimiter, submitContactForm);

// Admin: manage submissions (Owner or Teacher only)
router.get('/submissions', authenticate, authorizeRole('Owner', 'Teacher'), getSubmissions);
router.patch('/submissions/:id/status', authenticate, authorizeRole('Owner', 'Teacher'), updateSubmissionStatus);
router.delete('/submissions/:id', authenticate, authorizeRole('Owner', 'Teacher'), deleteSubmission);

export default router;
