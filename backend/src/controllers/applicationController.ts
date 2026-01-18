import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, CreateApplicationRequest, UpdateApplicationRequest } from '@/types';
import { WriterApplication } from '@/models/WriterApplication';
import { User } from '@/models/User';
import { AppError } from '@/utils/AppError';
import { catchAsync } from '@/middleware/errorHandler';
import { appLogger } from '@/services/logger';

export const createApplication = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  const { reason, writingSample }: CreateApplicationRequest = req.body;

  try {
    appLogger.debug('Creating writer application', {
      userId: req.user.id,
      userRole: req.user.role
    });

    if (req.user.role === 'Writer' || req.user.role === 'Editor' || req.user.role === 'Teacher' || req.user.role === 'Owner') {
      throw AppError.badRequest('You already have writer permissions or higher');
    }

    const application = await WriterApplication.create(
      { reason, writingSample },
      req.user.id,
      `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username,
      req.user.email
    );

    const duration = Date.now() - startTime;
    appLogger.logPerformance('createApplication', duration, { applicationId: application.id });

    res.status(201).json({
      success: true,
      message: 'Writer application submitted successfully',
      data: { application: application.toJSON() }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('createApplication', duration, { error: true });
    next(error);
  }
});

export const getMyApplication = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = Date.now();

  try {
    appLogger.debug('Getting user application', { userId: req.user.id });

    const application = await WriterApplication.findByUserId(req.user.id);

    const duration = Date.now() - startTime;
    appLogger.logPerformance('getMyApplication', duration, { found: !!application });

    if (!application) {
      res.status(404).json({
        success: false,
        message: 'No writer application found'
      });
      return;
    }

    res.json({
      success: true,
      data: { application: application.toJSON() }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('getMyApplication', duration, { error: true });
    next(error);
  }
});

export const getAllApplications = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  try {
    appLogger.debug('Getting all applications', { userId: req.user.id });

    const { status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const { applications, total } = await WriterApplication.findMany({
      status: status as any,
      limit: Number(limit),
      offset
    });

    const duration = Date.now() - startTime;
    appLogger.logPerformance('getAllApplications', duration, {
      count: applications.length,
      total
    });

    res.json({
      success: true,
      data: {
        applications: applications.map(app => app.toJSON()),
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalApplications: total,
          hasNext: offset + Number(limit) < total,
          hasPrev: Number(page) > 1,
          limit: Number(limit)
        }
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('getAllApplications', duration, { error: true });
    next(error);
  }
});

export const reviewApplication = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const { status }: { status: 'approved' | 'rejected' } = req.body;

    appLogger.debug('Reviewing application', {
      applicationId: id,
      reviewerId: req.user.id,
      status
    });

    const application = await WriterApplication.findById(id);
    if (!application) {
      throw AppError.notFound('Writer application not found');
    }

    if (application.status !== 'pending') {
      throw AppError.badRequest('Application has already been reviewed');
    }

    await application.updateStatus({
      id,
      status,
      reviewedBy: req.user.id,
      reviewerName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username
    });

    if (status === 'approved') {
      const user = await User.findById(application.userId);
      if (user) {
        // Update both role and permissions when approving writer application
        const writerPermissions = User.getPermissionsByRole('Writer');
        await user.updatePrefs({
          role: 'Writer',
          permissions: writerPermissions
        });
        appLogger.info('User role updated to Writer with permissions', {
          userId: user.id,
          applicationId: application.id,
          permissions: writerPermissions
        });
      }
    }

    const duration = Date.now() - startTime;
    appLogger.logPerformance('reviewApplication', duration, { applicationId: id });

    res.json({
      success: true,
      message: `Application ${status} successfully`,
      data: { application: application.toJSON() }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('reviewApplication', duration, { error: true });
    next(error);
  }
});

export const getApplicationById = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;

    appLogger.debug('Getting application by ID', { applicationId: id });

    const application = await WriterApplication.findById(id);
    if (!application) {
      throw AppError.notFound('Writer application not found');
    }

    const duration = Date.now() - startTime;
    appLogger.logPerformance('getApplicationById', duration, { applicationId: id });

    res.json({
      success: true,
      data: { application: application.toJSON() }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('getApplicationById', duration, { error: true });
    next(error);
  }
});

export const deleteApplication = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;

    appLogger.debug('Deleting application', { applicationId: id, userId: req.user.id });

    const application = await WriterApplication.findById(id);
    if (!application) {
      throw AppError.notFound('Writer application not found');
    }

    if (application.userId !== req.user.id && !req.user.hasPermission('manage_applications')) {
      throw AppError.forbidden('Not authorized to delete this application');
    }

    await application.delete();

    const duration = Date.now() - startTime;
    appLogger.logPerformance('deleteApplication', duration, { applicationId: id });

    res.json({
      success: true,
      message: 'Application deleted successfully'
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('deleteApplication', duration, { error: true });
    next(error);
  }
});

export const getApplicationStats = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  try {
    appLogger.debug('Getting application stats', { userId: req.user.id });

    const [pending, approved, rejected] = await Promise.all([
      WriterApplication.findMany({ status: 'pending' }),
      WriterApplication.findMany({ status: 'approved' }),
      WriterApplication.findMany({ status: 'rejected' })
    ]);

    const duration = Date.now() - startTime;
    appLogger.logPerformance('getApplicationStats', duration);

    res.json({
      success: true,
      data: {
        stats: {
          total: pending.total + approved.total + rejected.total,
          pending: pending.total,
          approved: approved.total,
          rejected: rejected.total,
          recentApplications: pending.applications
            .slice(0, 5)
            .map(app => app.toJSON())
        }
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('getApplicationStats', duration, { error: true });
    next(error);
  }
});