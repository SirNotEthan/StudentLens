import { Response } from 'express';
const validationResult = require('express-validator').validationResult;
import { account, users } from '@/config/appwrite';
import { User } from '@/models/User';
import {
  generateAccessToken,
  generateTokenPair,
  revokeToken
} from '@/utils/generateToken';
import {
  AuthenticatedRequest,
  ApiResponse,
  RegisterUserRequest,
  LoginRequest,
  UpdateUserRequest,
  ChangePasswordRequest
} from '@/types';
import { AppError } from '@/utils/AppError';
import { appLogger } from '@/services/logger';
import { catchAsync } from '@/middleware/errorHandler';

export const register = catchAsync(async (
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

    const userData: RegisterUserRequest = req.body;
    const { username, email, password, firstName, lastName } = userData;

    appLogger.debug('User registration attempt', {
      email,
      username,
      ip: req.ip
    });

    const existingUser = await User.findByEmailOrUsername(email, username);

    if (existingUser) {
      const message = existingUser.email === email
        ? 'Email already registered'
        : 'Username already taken';

      appLogger.logAuth('failed_registration', undefined, {
        reason: message.toLowerCase().replace(' ', '_'),
        email,
        username
      }, req);

      throw AppError.conflict(message);
    }

    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName
    });

    const { accessToken, refreshToken } = generateTokenPair(user);

    const response: ApiResponse = {
      success: true,
      message: 'User registered successfully',
      data: {
        accessToken,
        refreshToken,
        user: user.toJSON()
      }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('register', duration, { userId: user.id });
    appLogger.logAuth('register', user.id, { email, username }, req);

    res.status(201).json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('register', duration, { error: true });

    if (error.code === 409) {
      throw AppError.conflict('User already exists');
    }

    throw error;
  }
});

export const login = catchAsync(async (
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

    const { login, password }: LoginRequest = req.body;

    appLogger.debug('User login attempt', {
      login,
      ip: req.ip
    });

    let user: User | null = null;

    if (login.includes('@')) {
      user = await User.findByEmail(login);
    } else {
      user = await User.findByUsername(login);
    }

    if (!user) {
      appLogger.logAuth('failed_login', undefined, {
        reason: 'user_not_found',
        login
      }, req);

      throw AppError.unauthorized('Invalid credentials');
    }

    if (!user.isActive) {
      appLogger.logAuth('failed_login', user.id, {
        reason: 'user_inactive',
        login
      }, req);

      throw AppError.unauthorized('Account is inactive');
    }

    try {
      const session = await account.createEmailPasswordSession(user.email, password);

      await user.updateLastLogin();

      const { accessToken, refreshToken } = generateTokenPair(user);

      const response: ApiResponse = {
        success: true,
        message: 'Login successful',
        data: {
          accessToken,
          refreshToken,
          user: user.toJSON()
        }
      };

      const duration = Date.now() - startTime;
      appLogger.logPerformance('login', duration, { userId: user.id });
      appLogger.logAuth('login', user.id, { login }, req);

      res.json(response);

    } catch (authError: any) {
      appLogger.logAuth('failed_login', user.id, {
        reason: 'invalid_password',
        login,
        error: authError.message
      }, req);

      throw AppError.unauthorized('Invalid credentials');
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('login', duration, { error: true });
    throw error;
  }
});

export const getProfile = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  await req.user.fixUserDataConsistency();

  const response: ApiResponse = {
    success: true,
    message: 'Profile retrieved successfully',
    data: { user: req.user.toJSON() }
  };

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
    const { firstName, lastName, username, bio, profileImage } = updateData;

    appLogger.debug('Updating user profile', {
      userId: req.user.id,
      updateFields: Object.keys(updateData)
    });

    if (username && username !== req.user.username) {
      const existingUser = await User.findByUsername(username);
      if (existingUser && existingUser.id !== req.user.id) {
        throw AppError.conflict('Username already taken');
      }
    }

    const filteredUpdateData: Partial<UpdateUserRequest> = {};
    if (firstName !== undefined) filteredUpdateData.firstName = firstName;
    if (lastName !== undefined) filteredUpdateData.lastName = lastName;
    if (username !== undefined) filteredUpdateData.username = username;
    if (bio !== undefined) filteredUpdateData.bio = bio;
    if (profileImage !== undefined) filteredUpdateData.profileImage = profileImage;

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

export const logout = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        revokeToken(token);
      }
    }

    appLogger.logAuth('logout', req.user?.id, {}, req);

    const response: ApiResponse = {
      success: true,
      message: 'Logged out successfully'
    };

    res.json(response);
  } catch (error: any) {
    appLogger.error('Logout error', error, { userId: req.user?.id });
    throw error;
  }
});

export const changePassword = catchAsync(async (
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

    const { currentPassword, newPassword }: ChangePasswordRequest = req.body;
    const userId = req.user.id;

    appLogger.debug('Password change attempt', { userId });

    try {
      await account.createEmailPasswordSession(req.user.email, currentPassword);

      await users.updatePassword(userId, newPassword);

      const response: ApiResponse = {
        success: true,
        message: 'Password changed successfully'
      };

      const duration = Date.now() - startTime;
      appLogger.logPerformance('changePassword', duration, { userId });

      appLogger.info('Password changed successfully', { userId });

      res.json(response);

    } catch (authError: any) {
      appLogger.logAuth('failed_password_change', userId, {
        reason: 'invalid_current_password'
      }, req);

      if (authError.code === 401) {
        throw AppError.badRequest('Current password is incorrect');
      }
      throw authError;
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('changePassword', duration, {
      error: true,
      userId: req.user.id
    });
    throw error;
  }
});

export const completeSetup = catchAsync(async (
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

    const setupData: UpdateUserRequest = req.body;
    const { username, firstName, lastName, bio } = setupData;

    appLogger.debug('Completing user setup', {
      userId: req.user.id,
      username
    });

    const setupDataFiltered: Partial<UpdateUserRequest> = {};
    if (username !== undefined) setupDataFiltered.username = username;
    if (firstName !== undefined) setupDataFiltered.firstName = firstName;
    if (lastName !== undefined) setupDataFiltered.lastName = lastName;
    if (bio !== undefined) setupDataFiltered.bio = bio;

    await req.user.completeSetup(setupDataFiltered);

    const response: ApiResponse = {
      success: true,
      message: 'Account setup completed successfully',
      data: { user: req.user.toJSON() }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('completeSetup', duration, { userId: req.user.id });

    appLogger.info('User setup completed', {
      userId: req.user.id,
      username
    });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('completeSetup', duration, {
      error: true,
      userId: req.user.id
    });

    if (error.message === 'Username already taken') {
      throw AppError.conflict('Username already taken');
    }

    throw error;
  }
});

export const checkUsername = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const { username } = req.params;

    appLogger.debug('Checking username availability', { username });

    if (!username || username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      throw AppError.badRequest('Invalid username format');
    }

    const existingUser = await User.findByUsername(username);
    const available = !existingUser;

    const response: ApiResponse = {
      success: true,
      message: 'Username availability checked',
      data: {
        username,
        available
      }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('checkUsername', duration, { username, available });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('checkUsername', duration, {
      error: true,
      username: req.params.username
    });
    throw error;
  }
});

export const refreshToken = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      throw AppError.badRequest('Refresh token is required');
    }

    appLogger.debug('Token refresh attempt');

    const newAccessToken = generateAccessToken(req.user);

    const response: ApiResponse = {
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken
      }
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('refreshToken', duration, { userId: req.user.id });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('refreshToken', duration, { error: true });
    throw error;
  }
});

export const deleteAccount = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const startTime = Date.now();

  try {
    appLogger.warn('Account deletion request received', {
      userId: req.user.id,
      email: req.user.email,
      ip: req.ip
    });

    const { confirmationText } = req.body;
    if (confirmationText !== 'DELETE MY ACCOUNT') {
      appLogger.warn('Account deletion attempted with invalid confirmation', {
        userId: req.user.id,
        providedText: confirmationText
      });
      throw AppError.badRequest('Invalid confirmation text. Please type "DELETE MY ACCOUNT" to confirm.');
    }

    appLogger.warn('Account deletion confirmed and proceeding', {
      userId: req.user.id,
      email: req.user.email,
      username: req.user.username,
      role: req.user.role,
      provider: req.user.provider,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    await req.user.deleteAccount();

    const response: ApiResponse = {
      success: true,
      message: 'Account deleted successfully'
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('deleteAccount', duration, { userId: req.user.id });
    appLogger.warn('Account deletion completed successfully', {
      userId: req.user.id,
      email: req.user.email,
      duration
    });

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('deleteAccount', duration, { error: true, userId: req.user?.id });
    appLogger.error('Account deletion failed', error, {
      userId: req.user?.id,
      email: req.user?.email
    });
    throw error;
  }
});