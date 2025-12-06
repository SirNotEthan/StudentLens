import { users, databases, DATABASE_ID, USERS_COLLECTION_ID, ID, Query } from '@/config/appwrite';
import {
  IUser,
  UserRole,
  Permission,
  AppwriteUser,
  RegisterUserRequest,
  UpdateUserRequest
} from '@/types';
import { AppError } from '@/utils/AppError';
import { appLogger } from '@/services/logger';

export class User implements IUser {
  public id: string;
  public email: string;
  public name: string;
  public username: string;
  public firstName: string;
  public lastName: string;
  public role: UserRole;
  public permissions: Permission[];
  public isActive: boolean;
  public streak: number;
  public lastLogin?: string;
  public profileImage: string;
  public bio: string;
  public needsSetup: boolean;
  public provider: 'email' | 'google';
  public googleId?: string;
  public profileVisibility: boolean;
  public wordleGamesPlayed: number;
  public wordleCurrentStreak: number;
  public wordleBestStreak: number;
  public wordleWins: number;
  public createdAt: string;
  public updatedAt: string;
  public prefs: Record<string, any>;

  constructor(userData: AppwriteUser) {
    this.id = userData.$id;
    this.email = userData.email;
    this.name = userData.name;
    this.username = userData.prefs?.username || '';
    this.firstName = userData.prefs?.firstName || '';
    this.lastName = userData.prefs?.lastName || '';
    this.role = userData.prefs?.role || 'Student';
    this.permissions = userData.prefs?.permissions || User.getPermissionsByRole(this.role);
    this.isActive = userData.prefs?.isActive !== false;
    this.streak = userData.prefs?.streak || 0;
    this.lastLogin = userData.prefs?.lastLogin;
    this.profileImage = userData.prefs?.profileImage || '';
    this.bio = userData.prefs?.bio || '';
    this.needsSetup = userData.prefs?.needsSetup !== undefined ? userData.prefs.needsSetup : false;
    this.provider = userData.prefs?.provider || 'email';
    this.googleId = userData.prefs?.googleId;
    this.profileVisibility = userData.prefs?.profileVisibility !== false; // Default to true (public)
    this.wordleGamesPlayed = userData.prefs?.wordleGamesPlayed || 0;
    this.wordleCurrentStreak = userData.prefs?.wordleCurrentStreak || 0;
    this.wordleBestStreak = userData.prefs?.wordleBestStreak || 0;
    this.wordleWins = userData.prefs?.wordleWins || 0;
    this.createdAt = userData.$createdAt;
    this.updatedAt = userData.$updatedAt;
    this.prefs = userData.prefs || {};
  }

  static async create(userData: RegisterUserRequest): Promise<User> {
    const startTime = Date.now();

    try {
      appLogger.debug('Creating new user', { email: userData.email, username: userData.username });

      const user = await users.create(
        ID.unique(),
        userData.email,
        undefined, // phone (optional)
        userData.password || ID.unique(), // Generate random password for OAuth users
        userData.username || userData.email.split('@')[0] // Use username for the name field
      );

      await users.updatePrefs(user.$id, {
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || 'Student',
        permissions: User.getPermissionsByRole(userData.role || 'Student'),
        isActive: userData.isActive !== undefined ? userData.isActive : true,
        streak: 0,
        profileImage: userData.profileImage || '',
        bio: userData.bio || '',
        needsSetup: userData.needsSetup !== undefined ? userData.needsSetup : true,
        provider: userData.provider || 'email',
        googleId: userData.googleId || undefined,
        profileVisibility: true, // Default to public profile
        wordleGamesPlayed: 0,
        wordleCurrentStreak: 0,
        wordleBestStreak: 0,
        wordleWins: 0
      });

      const updatedUser = await users.get(user.$id);
      const newUser = new User(updatedUser);

      if (USERS_COLLECTION_ID && USERS_COLLECTION_ID !== 'not-needed-for-appwrite-auth') {
        try {
          const documentData = User.prepareDatabaseData({
            userId: newUser.id,
            email: newUser.email,
            username: newUser.username,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            role: newUser.role,
            isActive: newUser.isActive,
            streak: newUser.streak,
            provider: newUser.provider,
            googleId: newUser.googleId,
            profileImage: newUser.profileImage,
            bio: newUser.bio,
            needsSetup: newUser.needsSetup
          });

          await databases.createDocument(
            DATABASE_ID,
            USERS_COLLECTION_ID,
            newUser.id,
            documentData
          );
          appLogger.info('User document created in database', { userId: newUser.id });
        } catch (dbError: any) {
          appLogger.warn('Failed to create user document in database', {
            error: dbError.message,
            userId: newUser.id
          });
        }
      }

      const duration = Date.now() - startTime;
      appLogger.logPerformance('User.create', duration, { userId: newUser.id });
      appLogger.info('User created successfully', { userId: newUser.id, email: newUser.email });

      return newUser;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('create', 'users', userData, error);
      appLogger.logPerformance('User.create', duration, { error: true });

      if (error.code === 409) {
        throw AppError.conflict('User with this email already exists');
      }
      throw AppError.internal(`Failed to create user: ${error.message}`);
    }
  }

  static async findById(userId: string): Promise<User | null> {
    const startTime = Date.now();

    try {
      appLogger.debug('Finding user by ID', { userId });

      const user = await users.get(userId);
      const foundUser = new User(user);

      const duration = Date.now() - startTime;
      appLogger.logPerformance('User.findById', duration, { userId, found: true });

      return foundUser;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logPerformance('User.findById', duration, { userId, found: false });

      if (error.code === 404) {
        appLogger.debug('User not found', { userId });
        return null;
      }

      appLogger.logDatabase('findById', 'users', { userId }, error);
      throw AppError.internal(`Failed to find user: ${error.message}`);
    }
  }

  static async findByEmail(email: string): Promise<User | null> {
    const startTime = Date.now();

    try {
      appLogger.debug('Finding user by email', { email });

      const usersList = await users.list();
      const user = usersList.users.find(u =>
        u.email === email &&
        !u.prefs?.isDeleted &&
        !u.email.startsWith('DELETED_') // Extra check for scrambled emails
      );

      const duration = Date.now() - startTime;
      appLogger.logPerformance('User.findByEmail', duration, { email, found: !!user });

      if (!user) {
        appLogger.debug('User not found by email', { email });
        return null;
      }

      return new User(user);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('findByEmail', 'users', { email }, error);
      appLogger.logPerformance('User.findByEmail', duration, { email, error: true });
      throw AppError.internal(`Failed to find user by email: ${error.message}`);
    }
  }

  static async findByUsername(username: string): Promise<User | null> {
    const startTime = Date.now();

    try {
      appLogger.debug('Finding user by username', { username });

      const usersList = await users.list();
      const user = usersList.users.find(u => u.prefs?.username === username && !u.prefs?.isDeleted);

      const duration = Date.now() - startTime;
      appLogger.logPerformance('User.findByUsername', duration, { username, found: !!user });

      if (!user) {
        appLogger.debug('User not found by username', { username });
        return null;
      }

      return new User(user);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('findByUsername', 'users', { username }, error);
      appLogger.logPerformance('User.findByUsername', duration, { username, error: true });
      throw AppError.internal(`Failed to find user by username: ${error.message}`);
    }
  }

  static async findByGoogleId(googleId: string): Promise<User | null> {
    const startTime = Date.now();

    try {
      appLogger.debug('Finding user by Google ID', { googleId });

      const usersList = await users.list();

      const duration = Date.now() - startTime;
      appLogger.logPerformance('User.findByGoogleId', duration, { googleId });

      const matchingUser = usersList.users.find((user: any) =>
        user.prefs?.googleId === googleId &&
        user.prefs?.googleId != null &&
        !user.prefs?.isDeleted
      );

      if (!matchingUser) {
        return null;
      }

      appLogger.logDatabase('findByGoogleId', 'users', { googleId }, null);
      return new User(matchingUser);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('findByGoogleId', 'users', { googleId }, error);
      appLogger.logPerformance('User.findByGoogleId', duration, { googleId, error: true });
      throw AppError.internal(`Failed to find user by Google ID: ${error.message}`);
    }
  }

  static async findByEmailOrUsername(email: string, username: string): Promise<User | null> {
    try {
      const emailUser = await this.findByEmail(email);
      if (emailUser) return emailUser;

      const usernameUser = await this.findByUsername(username);
      return usernameUser;
    } catch (error: any) {
      appLogger.error('Failed to find user by email or username', error, { email, username });
      throw error;
    }
  }

  static async find(query: any = {}): Promise<User[]> {
    const startTime = Date.now();

    try {
      appLogger.debug('Finding users with query', { query });

      const usersList = await users.list();
      let filteredUsers = usersList.users;

      if (query.isActive !== undefined) {
        filteredUsers = filteredUsers.filter(u => u.prefs?.isActive === query.isActive);
      }

      if (query.role && query.role !== 'all') {
        filteredUsers = filteredUsers.filter(u => u.prefs?.role === query.role);
      }

      if (query.$or && Array.isArray(query.$or)) {
        const searchTerm = query.$or[0]?.username?.$regex ||
                          query.$or[0]?.email?.$regex ||
                          query.$or[0]?.firstName?.$regex ||
                          query.$or[0]?.lastName?.$regex;

        if (searchTerm) {
          const regex = new RegExp(searchTerm, 'i');
          filteredUsers = filteredUsers.filter(u =>
            regex.test(u.prefs?.username || '') ||
            regex.test(u.email || '') ||
            regex.test(u.prefs?.firstName || '') ||
            regex.test(u.prefs?.lastName || '')
          );
        }
      }

      const result = filteredUsers.map(user => new User(user));

      const duration = Date.now() - startTime;
      appLogger.logPerformance('User.find', duration, {
        query,
        totalFound: result.length,
        totalScanned: usersList.users.length
      });

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('find', 'users', { query }, error);
      appLogger.logPerformance('User.find', duration, { query, error: true });
      throw AppError.internal(`Failed to find users: ${error.message}`);
    }
  }

  static async countDocuments(query: any = {}): Promise<number> {
    try {
      const allUsers = await this.find(query);
      return allUsers.length;
    } catch (error: any) {
      appLogger.logDatabase('countDocuments', 'users', { query }, error);
      throw error;
    }
  }


  private static prepareDatabaseData(data: any): any {
    const cleanData = { ...data };

    if (!cleanData.profileImage || cleanData.profileImage.trim() === '') {
      delete cleanData.profileImage;
    }

    if (!cleanData.googleId) {
      delete cleanData.googleId;
    }

    return cleanData;
  }

  async ensureDatabaseRecord(): Promise<void> {
    if (!USERS_COLLECTION_ID || USERS_COLLECTION_ID === 'not-needed-for-appwrite-auth') {
      return;
    }

    try {
      await databases.getDocument(DATABASE_ID, USERS_COLLECTION_ID, this.id);
      appLogger.debug('User document already exists in database', { userId: this.id });
    } catch (error: any) {
      if (error.code === 404) {
        try {
          const documentData = User.prepareDatabaseData({
            userId: this.id,
            email: this.email,
            username: this.username,
            firstName: this.firstName,
            lastName: this.lastName,
            role: this.role,
            isActive: this.isActive,
            streak: this.streak,
            provider: this.provider,
            googleId: this.googleId,
            profileImage: this.profileImage,
            bio: this.bio,
            needsSetup: this.needsSetup
          });

          await databases.createDocument(
            DATABASE_ID,
            USERS_COLLECTION_ID,
            this.id,
            documentData
          );
          appLogger.info('User document synced to database', { userId: this.id });
        } catch (createError: any) {
          appLogger.warn('Failed to sync user document to database', {
            error: createError.message,
            userId: this.id
          });
        }
      } else {
        appLogger.warn('Failed to check user document in database', {
          error: error.message,
          userId: this.id
        });
      }
    }
  }

  async updatePrefs(prefs: Partial<UpdateUserRequest>): Promise<this> {
    const startTime = Date.now();

    try {
      appLogger.debug('Updating user preferences', { userId: this.id, prefs });

      const mergedPrefs = { ...this.prefs, ...prefs };
      await users.updatePrefs(this.id, mergedPrefs);

      Object.assign(this, prefs);
      this.updatedAt = new Date().toISOString();

      if (USERS_COLLECTION_ID && USERS_COLLECTION_ID !== 'not-needed-for-appwrite-auth') {
        try {
          await databases.updateDocument(
            DATABASE_ID,
            USERS_COLLECTION_ID,
            this.id,
            User.prepareDatabaseData(prefs)
          );
          appLogger.debug('User document updated in database', { userId: this.id });
        } catch (dbError: any) {
          if (dbError.code === 404) {
            appLogger.info('Creating missing user database document', { userId: this.id });
            await this.ensureDatabaseRecord();
            try {
              await databases.updateDocument(
                DATABASE_ID,
                USERS_COLLECTION_ID,
                this.id,
                User.prepareDatabaseData(prefs)
              );
              appLogger.debug('User document updated after creation', { userId: this.id });
            } catch (retryError: any) {
              appLogger.warn('Failed to update user document after creation', {
                error: retryError.message,
                userId: this.id
              });
            }
          } else {
            appLogger.warn('Failed to update user document in database', {
              error: dbError.message,
              userId: this.id
            });
          }
        }
      }

      const duration = Date.now() - startTime;
      appLogger.logPerformance('User.updatePrefs', duration, { userId: this.id });
      appLogger.info('User preferences updated', { userId: this.id });

      return this;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('updatePrefs', 'users', { userId: this.id, prefs }, error);
      appLogger.logPerformance('User.updatePrefs', duration, { userId: this.id, error: true });
      throw AppError.internal(`Failed to update user preferences: ${error.message}`);
    }
  }

  async updateLastLogin(): Promise<this> {
    try {
      const now = new Date();
      const nowISO = now.toISOString();

      // Calculate streak
      let newStreak = this.streak || 0;
      if (this.lastLogin) {
        const lastLoginDate = new Date(this.lastLogin);
        const daysDifference = Math.floor((now.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDifference === 0) {
          // Same day login, keep streak
          newStreak = this.streak || 1;
        } else if (daysDifference === 1) {
          // Consecutive day login, increment streak
          newStreak = (this.streak || 0) + 1;
          appLogger.info('Login streak increased', { userId: this.id, newStreak, previousStreak: this.streak });
        } else {
          // Streak broken, reset to 1
          if (this.streak && this.streak > 1) {
            appLogger.info('Login streak broken', { userId: this.id, previousStreak: this.streak, daysMissed: daysDifference });
          }
          newStreak = 1;
        }
      } else {
        // First login, start streak
        newStreak = 1;
        appLogger.info('Login streak started', { userId: this.id });
      }

      await this.updatePrefs({
        lastLogin: nowISO,
        streak: newStreak
      });
      this.lastLogin = nowISO;
      this.streak = newStreak;

      appLogger.logAuth('login', this.id, {
        timestamp: nowISO,
        streak: newStreak
      });
      return this;
    } catch (error: any) {
      appLogger.error('Failed to update last login', error, { userId: this.id });
      throw error;
    }
  }

  async completeSetup(setupData: Partial<UpdateUserRequest>): Promise<this> {
    try {
      if (setupData.username) {
        const existingUser = await User.findByUsername(setupData.username);
        if (existingUser && existingUser.id !== this.id) {
          throw AppError.conflict('Username already taken');
        }
      }

      const updateData: Partial<UpdateUserRequest> = {
        username: setupData.username || this.username,
        firstName: setupData.firstName || this.firstName,
        lastName: setupData.lastName || this.lastName,
        bio: setupData.bio || this.bio,
        needsSetup: false
      };

      await this.updatePrefs(updateData);

      Object.assign(this, updateData);

      appLogger.info('User setup completed', { userId: this.id });
      return this;
    } catch (error: any) {
      appLogger.error('Failed to complete user setup', error, { userId: this.id, setupData });
      throw error;
    }
  }

  async deleteAccount(): Promise<void> {
    const startTime = Date.now();

    try {
      appLogger.warn('User account deletion initiated', {
        userId: this.id,
        email: this.email,
        username: this.username
      });

      if (USERS_COLLECTION_ID && USERS_COLLECTION_ID !== 'not-needed-for-appwrite-auth') {
        try {
          await databases.deleteDocument(DATABASE_ID, USERS_COLLECTION_ID, this.id);
          appLogger.info('User document deleted from database', { userId: this.id });
        } catch (dbError: any) {
          if (dbError.code !== 404) {
            appLogger.warn('Failed to delete user document from database', {
              error: dbError.message,
              userId: this.id
            });
          }
        }
      }

      const deletedEmail = `DELETED_${Date.now()}_${this.email}`;
      const deletedUsername = `DELETED_${Date.now()}_${this.username}`;

      try {
        await users.updateEmail(this.id, deletedEmail);
        appLogger.info('User email scrambled in Appwrite Auth', { userId: this.id, newEmail: deletedEmail });
      } catch (emailUpdateError: any) {
        appLogger.warn('Failed to update user email in Appwrite Auth', {
          error: emailUpdateError.message,
          userId: this.id
        });
      }

      try {
        await users.updatePrefs(this.id, {
          ...this.prefs,
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          email: deletedEmail, // Keep consistent with actual email
          googleId: null, // Explicitly set to null instead of undefined
          username: deletedUsername // Modify username too
        });
        appLogger.info('User marked as deleted in preferences', { userId: this.id });
      } catch (prefsError: any) {
        appLogger.warn('Failed to mark user as deleted in preferences', {
          error: prefsError.message,
          userId: this.id
        });
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        await users.delete(this.id);
        appLogger.warn('User successfully deleted from Appwrite Auth', { userId: this.id });
      } catch (deleteError: any) {
        appLogger.error('Failed to delete user from Appwrite Auth', deleteError, { userId: this.id });
      }

      const duration = Date.now() - startTime;
      appLogger.logPerformance('User.deleteAccount', duration, { userId: this.id });
      appLogger.warn('User account deletion process completed', {
        userId: this.id,
        email: this.email,
        username: this.username,
        deletedAt: new Date().toISOString()
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logPerformance('User.deleteAccount', duration, { userId: this.id, error: true });
      appLogger.error('Failed to delete user account', error, { userId: this.id });
      throw AppError.internal(`Failed to delete account: ${error.message}`);
    }
  }

  async fixUserDataConsistency(): Promise<void> {
    try {
      appLogger.info('Fixing user data consistency', { userId: this.id });

      if (this.name && this.name.includes(' ') && !this.username) {
        const baseUsername = this.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        let newUsername = baseUsername;
        let counter = 1;

        while (await User.findByUsername(newUsername)) {
          newUsername = `${baseUsername}${counter}`;
          counter++;
        }

        await this.updatePrefs({
          username: newUsername
        });

        appLogger.info('Fixed user data consistency', {
          userId: this.id,
          oldName: this.name,
          newUsername: newUsername
        });
      }
    } catch (error: any) {
      appLogger.error('Failed to fix user data consistency', error, { userId: this.id });
    }
  }

  static getPermissionsByRole(role: UserRole): Permission[] {
    const rolePermissions: Record<UserRole, Permission[]> = {
      Student: ['read_articles', 'apply_writer'],
      Writer: ['read_articles', 'write_articles'],
      Editor: ['read_articles', 'edit_articles', 'moderate_content', 'view_analytics'],
      Teacher: ['read_articles', 'review_articles', 'publish_articles', 'manage_users', 'view_analytics'],
      Owner: ['read_articles', 'write_articles', 'edit_articles', 'delete_articles', 'publish_articles', 'review_articles', 'moderate_content', 'view_analytics', 'manage_categories', 'manage_users', 'manage_roles', 'manage_system', 'manage_applications']
    };

    return rolePermissions[role] || ['read_articles'];
  }

  getPermissionsByRole(role: UserRole = this.role): Permission[] {
    return User.getPermissionsByRole(role);
  }

  hasPermission(permission: Permission): boolean {
    return this.permissions.includes(permission);
  }

  canAccess(resource: string, action: string): boolean {
    const permissionMap: Record<string, Record<string, Permission>> = {
      articles: {
        read: 'read_articles',
        write: 'write_articles',
        edit: 'edit_articles',
        delete: 'delete_articles',
        publish: 'publish_articles'
      },
      users: {
        manage: 'manage_users'
      },
      system: {
        manage: 'manage_system'
      }
    };

    const requiredPermission = permissionMap[resource]?.[action];
    return requiredPermission ? this.hasPermission(requiredPermission) : false;
  }

  get fullName(): string {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }

  toJSON(): Omit<IUser, 'prefs'> & { fullName: string } {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      name: this.name,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      role: this.role,
      permissions: this.permissions,
      isActive: this.isActive,
      streak: this.streak,
      lastLogin: this.lastLogin,
      profileImage: this.profileImage,
      bio: this.bio,
      needsSetup: this.needsSetup,
      provider: this.provider,
      profileVisibility: this.profileVisibility,
      wordleGamesPlayed: this.wordleGamesPlayed,
      wordleCurrentStreak: this.wordleCurrentStreak,
      wordleBestStreak: this.wordleBestStreak,
      wordleWins: this.wordleWins,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export default User;