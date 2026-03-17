import { Response } from 'express';
const validationResult = require('express-validator').validationResult;
import { User } from '@/models/User';
import {
  AuthenticatedRequest,
  ApiResponse,
  UserListResponse,
  UserStatsResponse,
  UpdateUserRequest,
  UserRole
} from '@/types';
import { AppError } from '@/utils/AppError';
import { appLogger } from '@/services/logger';
import { catchAsync } from '@/middleware/errorHandler';
import { storage, STORAGE_BUCKET_ID, ID } from '@/config/appwrite';
const { InputFile } = require('node-appwrite/file');

export const getUsers = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const { page = 1, limit = 10, role, search, sortBy = 'createdAt', sortOrder = 'desc', isActive } = req.query;

    appLogger.debug('Getting users', {
      userId: req.user.id,
      page,
      limit,
      role,
      search,
      sortBy,
      sortOrder,
      isActive
    });

    const query: any = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (role && role !== 'all') {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query);
    const total = await User.countDocuments(query);

    users.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'username':
          aValue = a.username.toLowerCase();
          bValue = b.username.toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'role':
          aValue = a.role;
          bValue = b.role;
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
          break;
        default: // createdAt
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(1000, Math.max(1, parseInt(limit as string, 10)));
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = pageNum * limitNum;
    const paginatedUsers = users.slice(startIndex, endIndex);

    const totalPages = Math.ceil(total / limitNum);
    const hasNext = endIndex < users.length;
    const hasPrev = startIndex > 0;

    const response: UserListResponse = {
      success: true,
      users: paginatedUsers.map(user => user.toJSON()) as any,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalUsers: total,
        hasNext,
        hasPrev,
        limit: limitNum
      }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('getUsers', duration, {
      userId: req.user.id,
      totalUsers: total,
      returnedUsers: paginatedUsers.length
    });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('getUsers', duration, { error: true, userId: req.user.id });
    throw error;
  }
});

export const getUser = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const { id: userId } = req.params;

    appLogger.debug('Getting user by ID', {
      requesterId: req.user.id,
      targetUserId: userId
    });

    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const canAccess = req.user.id === userId || req.user.hasPermission('manage_users');
    if (!canAccess) {
      throw AppError.forbidden('Access denied. You can only access your own profile.');
    }

    const response: ApiResponse = {
      success: true,
      message: 'User retrieved successfully',
      data: { user: user.toJSON() }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('getUser', duration, {
      requesterId: req.user.id,
      targetUserId: userId
    });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('getUser', duration, {
      error: true,
      requesterId: req.user.id,
      targetUserId: req.params.id
    });
    throw error;
  }
});

export const updateUser = catchAsync(async (
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

    const { id: userId } = req.params;
    const updateData: UpdateUserRequest = req.body;

    appLogger.debug('Updating user', {
      requesterId: req.user.id,
      targetUserId: userId,
      updateFields: Object.keys(updateData)
    });

    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const canUpdate = req.user.id === userId || req.user.hasPermission('manage_users');
    if (!canUpdate) {
      throw AppError.forbidden('Access denied. You can only update your own profile.');
    }

    if (updateData.username && updateData.username !== user.username) {
      const existingUser = await User.findByUsername(updateData.username);
      if (existingUser && existingUser.id !== user.id) {
        throw AppError.conflict('Username already taken');
      }
    }

    const filteredUpdateData: Partial<UpdateUserRequest> = {};
    if (updateData.firstName !== undefined) filteredUpdateData.firstName = updateData.firstName;
    if (updateData.lastName !== undefined) filteredUpdateData.lastName = updateData.lastName;
    if (updateData.username !== undefined) filteredUpdateData.username = updateData.username;
    if (updateData.bio !== undefined) filteredUpdateData.bio = updateData.bio;
    if (updateData.profileImage !== undefined) filteredUpdateData.profileImage = updateData.profileImage;

    if (req.user.role === 'Owner') {
      if (updateData.isActive !== undefined) {
        if (req.user.id === userId && updateData.isActive === false) {
          throw AppError.badRequest('Cannot deactivate your own account');
        }
        filteredUpdateData.isActive = updateData.isActive;
      }
    } else if (updateData.isActive !== undefined) {
      throw AppError.forbidden('Only Owner role can activate or deactivate user accounts');
    }

    await user.updatePrefs(filteredUpdateData);

    const response: ApiResponse = {
      success: true,
      message: 'User updated successfully',
      data: { user: user.toJSON() }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('updateUser', duration, {
      requesterId: req.user.id,
      targetUserId: userId
    });

    appLogger.info('User updated successfully', {
      requesterId: req.user.id,
      targetUserId: userId,
      updatedFields: Object.keys(filteredUpdateData)
    });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('updateUser', duration, {
      error: true,
      requesterId: req.user.id,
      targetUserId: req.params.id
    });
    throw error;
  }
});

export const deleteUser = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const { id: userId } = req.params;

    appLogger.debug('Deleting user', {
      requesterId: req.user.id,
      targetUserId: userId
    });

    if (req.user.id === userId) {
      throw AppError.badRequest('Cannot delete your own account');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    if (user.role === 'Owner') {
      throw AppError.forbidden('Cannot delete Owner accounts');
    }

    await user.updatePrefs({ isActive: false });

    const response: ApiResponse = {
      success: true,
      message: 'User deleted successfully'
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('deleteUser', duration, {
      requesterId: req.user.id,
      targetUserId: userId
    });

    appLogger.info('User deleted successfully', {
      requesterId: req.user.id,
      targetUserId: userId,
      targetUserRole: user.role
    });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('deleteUser', duration, {
      error: true,
      requesterId: req.user.id,
      targetUserId: req.params.id
    });
    throw error;
  }
});

export const getUserStats = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    appLogger.debug('Getting user statistics', {
      requesterId: req.user.id
    });

    const allUsers = await User.find({});

    const stats = {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter(u => u.isActive).length,
      usersByRole: {
        Student: allUsers.filter(u => u.role === 'Student').length,
        Writer: allUsers.filter(u => u.role === 'Writer').length,
        Editor: allUsers.filter(u => u.role === 'Editor').length,
        Teacher: allUsers.filter(u => u.role === 'Teacher').length,
        Owner: allUsers.filter(u => u.role === 'Owner').length
      } as Record<UserRole, number>,
      recentUsers: allUsers
        .filter(u => u.isActive)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(user => user.toJSON()) as any
    };

    const response: UserStatsResponse = {
      success: true,
      stats
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('getUserStats', duration, {
      requesterId: req.user.id,
      totalUsers: stats.totalUsers
    });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('getUserStats', duration, {
      error: true,
      requesterId: req.user.id
    });
    throw error;
  }
});

export const updateUserRole = catchAsync(async (
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

    const { id: userId } = req.params;
    const { role }: { role: UserRole } = req.body;

    appLogger.debug('Updating user role', {
      requesterId: req.user.id,
      targetUserId: userId,
      newRole: role
    });

    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    if (req.user.id === userId) {
      throw AppError.badRequest('Cannot change your own role');
    }

    if (user.role === 'Owner' || role === 'Owner') {
      if (req.user.role !== 'Owner') {
        throw AppError.forbidden('Only Owners can modify Owner roles');
      }
    }

    const oldRole = user.role;

    const updateData = {
      role,
      permissions: User.getPermissionsByRole(role)
    };

    await user.updatePrefs(updateData);

    const response: ApiResponse = {
      success: true,
      message: 'User role updated successfully',
      data: { user: user.toJSON() }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('updateUserRole', duration, {
      requesterId: req.user.id,
      targetUserId: userId
    });

    appLogger.info('User role updated successfully', {
      requesterId: req.user.id,
      targetUserId: userId,
      oldRole,
      newRole: role
    });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('updateUserRole', duration, {
      error: true,
      requesterId: req.user.id,
      targetUserId: req.params.id
    });
    throw error;
  }
});

export const updateUserStreak = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const { id: userId } = req.params;
    const { streak } = req.body;

    appLogger.debug('Updating user streak', {
      requesterId: req.user.id,
      targetUserId: userId,
      newStreak: streak
    });

    if (req.user.id !== userId && !req.user.hasPermission('manage_users')) {
      throw AppError.forbidden('Access denied. You can only update your own streak.');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const validatedStreak = Math.max(0, parseInt(streak, 10) || 0);
    await user.updatePrefs({ streak: validatedStreak });

    const response: ApiResponse = {
      success: true,
      message: 'User streak updated successfully',
      data: { user: user.toJSON() }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('updateUserStreak', duration, {
      requesterId: req.user.id,
      targetUserId: userId
    });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('updateUserStreak', duration, {
      error: true,
      requesterId: req.user.id,
      targetUserId: req.params.id
    });
    throw error;
  }
});

export const getProfile = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const response: ApiResponse = {
    success: true,
    message: 'Profile retrieved successfully',
    data: { user: req.user.toJSON() }
  };

  appLogger.debug('Profile retrieved', { userId: req.user.id });
  res.json(response);
});

export const updateProfile = catchAsync(async (
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

    const updateData: UpdateUserRequest = req.body;

    appLogger.debug('Updating user profile', {
      userId: req.user.id,
      updateFields: Object.keys(updateData)
    });

    if (updateData.username && updateData.username !== req.user.username) {
      const existingUser = await User.findByUsername(updateData.username);
      if (existingUser && existingUser.id !== req.user.id) {
        throw AppError.conflict('Username already taken');
      }
    }

    const allowedFields: (keyof UpdateUserRequest)[] = [
      'firstName',
      'lastName',
      'username',
      'bio',
      'profileImage'
    ];

    const filteredUpdateData: any = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredUpdateData[field] = updateData[field];
      }
    });

    await req.user.updatePrefs(filteredUpdateData);

    const response: ApiResponse = {
      success: true,
      message: 'Profile updated successfully',
      data: { user: req.user.toJSON() }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('updateProfile', duration, { userId: req.user.id });

    appLogger.info('User profile updated', {
      userId: req.user.id,
      updatedFields: Object.keys(filteredUpdateData)
    });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('updateProfile', duration, {
      error: true,
      userId: req.user.id
    });
    throw error;
  }
});

export const updateProfileVisibility = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const { profileVisibility } = req.body;
    const userId = req.user.id;

    appLogger.debug('Updating profile visibility', {
      userId,
      profileVisibility
    });

    // Validate input
    if (typeof profileVisibility !== 'boolean') {
      throw AppError.badRequest('profileVisibility must be a boolean value');
    }

    // Update user
    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    await user.updatePrefs({ profileVisibility });

    const response: ApiResponse = {
      success: true,
      message: `Profile is now ${profileVisibility ? 'public' : 'private'}`,
      data: {
        profileVisibility: user.profileVisibility
      }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('updateProfileVisibility', duration, {
      userId,
      profileVisibility
    });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('updateProfileVisibility', duration, {
      error: true,
      userId: req.user.id
    });
    throw error;
  }
});

export const getPublicProfile = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const { username } = req.params;

    appLogger.debug('Getting public profile', {
      requesterId: req.user.id,
      targetUsername: username
    });

    const { ProfileService } = require('@/services/profileService');
    const profileData = await ProfileService.getPublicProfileData(username, req.user.id);

    const response: ApiResponse = {
      success: true,
      message: 'Public profile retrieved successfully',
      data: profileData
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('getPublicProfile', duration, {
      requesterId: req.user.id,
      targetUsername: username
    });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('getPublicProfile', duration, {
      error: true,
      requesterId: req.user.id,
      targetUsername: req.params.username
    });
    throw error;
  }
});

export const uploadProfilePicture = catchAsync(async (
  req: AuthenticatedRequest & { file?: Express.Multer.File },
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    appLogger.debug('Uploading profile picture', {
      userId: req.user.id,
      fileSize: req.file?.size,
      mimeType: req.file?.mimetype
    });

    if (!req.file) {
      throw AppError.badRequest('No file uploaded');
    }

    if (req.user.profileImage) {
      try {
        const oldImageUrl = req.user.profileImage;
        const fileIdMatch = oldImageUrl.match(/files\/([^\/]+)\//);
        if (fileIdMatch && fileIdMatch[1]) {
          await storage.deleteFile(STORAGE_BUCKET_ID, fileIdMatch[1]);
          appLogger.debug('Deleted old profile image', {
            userId: req.user.id,
            oldFileId: fileIdMatch[1]
          });
        }
      } catch (error) {
        appLogger.warn('Failed to delete old profile image', {
          userId: req.user.id,
          error
        });
      }
    }

    const fileId = ID.unique();
    const file = await storage.createFile(
      STORAGE_BUCKET_ID,
      fileId,
      InputFile.fromBuffer(req.file.buffer, req.file.originalname)
    );

    appLogger.debug('File uploaded to Appwrite Storage', {
      userId: req.user.id,
      fileId: file.$id
    });

    const fileUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_ID}/files/${file.$id}/view?project=${process.env.APPWRITE_PROJECT_ID}`;

    await req.user.updatePrefs({ profileImage: fileUrl });

    const response: ApiResponse = {
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        profileImage: fileUrl,
        fileId: file.$id
      }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('uploadProfilePicture', duration, {
      userId: req.user.id,
      fileSize: req.file.size
    });

    appLogger.info('Profile picture uploaded successfully', {
      userId: req.user.id,
      fileId: file.$id,
      fileSize: req.file.size
    });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('uploadProfilePicture', duration, {
      error: true,
      userId: req.user.id
    });
    throw error;
  }
});