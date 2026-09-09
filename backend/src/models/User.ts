import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/config/database';
import {
  IUser,
  UserRole,
  Permission,
  AppwriteUser,
  RegisterUserRequest,
  UpdateUserRequest
} from '@/types';
import { AppError } from '@/utils/AppError';

const toIso = (value?: Date | string | null): string | undefined => {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};

const asStringArray = (value: unknown): string[] => Array.isArray(value) ? value.map(String) : [];
const fromDb = (data: any): User => new User({ ...data, $id: data.id, $createdAt: toIso(data.createdAt), $updatedAt: toIso(data.updatedAt) });

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
  public wordleLastPlayedDate?: string;
  public spellingBeeGamesPlayed: number;
  public spellingBeeCurrentStreak: number;
  public spellingBeeBestStreak: number;
  public spellingBeeWins: number;
  public spellingBeeLastPlayedDate?: string;
  public strandsGamesPlayed: number;
  public strandsCurrentStreak: number;
  public strandsBestStreak: number;
  public strandsWins: number;
  public strandsLastPlayedDate?: string;
  public createdAt: string;
  public updatedAt: string;
  public prefs: Record<string, any>;
  private passwordHash?: string | null;

  constructor(userData: AppwriteUser & any) {
    const prefs = userData.prefs || {};
    this.id = userData.$id || userData.id;
    this.email = userData.email;
    this.name = userData.name || userData.username || userData.email;
    this.username = userData.username || prefs.username || '';
    this.firstName = userData.firstName || prefs.firstName || '';
    this.lastName = userData.lastName || prefs.lastName || '';
    this.role = (userData.role || prefs.role || 'Student') as UserRole;
    this.permissions = asStringArray(userData.permissions || prefs.permissions) as Permission[];
    if (this.permissions.length === 0) this.permissions = User.getPermissionsByRole(this.role);
    this.isActive = userData.isActive ?? prefs.isActive ?? true;
    this.streak = userData.streak || prefs.streak || 0;
    this.lastLogin = toIso(userData.lastLogin) || prefs.lastLogin;
    this.profileImage = userData.profileImage || prefs.profileImage || '';
    this.bio = userData.bio || prefs.bio || '';
    this.needsSetup = userData.needsSetup ?? prefs.needsSetup ?? false;
    this.provider = (userData.provider || prefs.provider || 'email') as 'email' | 'google';
    this.googleId = userData.googleId || prefs.googleId || undefined;
    this.profileVisibility = userData.profileVisibility ?? prefs.profileVisibility ?? true;
    this.wordleGamesPlayed = userData.wordleGamesPlayed || prefs.wordleGamesPlayed || 0;
    this.wordleCurrentStreak = userData.wordleCurrentStreak || prefs.wordleCurrentStreak || 0;
    this.wordleBestStreak = userData.wordleBestStreak || prefs.wordleBestStreak || 0;
    this.wordleWins = userData.wordleWins || prefs.wordleWins || 0;
    this.wordleLastPlayedDate = toIso(userData.wordleLastPlayedDate) || prefs.wordleLastPlayedDate;
    this.spellingBeeGamesPlayed = userData.spellingBeeGamesPlayed || prefs.spellingBeeGamesPlayed || 0;
    this.spellingBeeCurrentStreak = userData.spellingBeeCurrentStreak || prefs.spellingBeeCurrentStreak || 0;
    this.spellingBeeBestStreak = userData.spellingBeeBestStreak || prefs.spellingBeeBestStreak || 0;
    this.spellingBeeWins = userData.spellingBeeWins || prefs.spellingBeeWins || 0;
    this.spellingBeeLastPlayedDate = toIso(userData.spellingBeeLastPlayedDate) || prefs.spellingBeeLastPlayedDate;
    this.strandsGamesPlayed = userData.strandsGamesPlayed || prefs.strandsGamesPlayed || 0;
    this.strandsCurrentStreak = userData.strandsCurrentStreak || prefs.strandsCurrentStreak || 0;
    this.strandsBestStreak = userData.strandsBestStreak || prefs.strandsBestStreak || 0;
    this.strandsWins = userData.strandsWins || prefs.strandsWins || 0;
    this.strandsLastPlayedDate = toIso(userData.strandsLastPlayedDate) || prefs.strandsLastPlayedDate;
    this.createdAt = userData.$createdAt || toIso(userData.createdAt) || new Date().toISOString();
    this.updatedAt = userData.$updatedAt || toIso(userData.updatedAt) || new Date().toISOString();
    this.prefs = prefs;
    this.passwordHash = userData.passwordHash;
  }

  static async create(userData: RegisterUserRequest): Promise<User> {
    try {
      if (userData.provider !== 'google' && !userData.password) throw AppError.badRequest('Password is required for email registration');
      const role = userData.role || 'Student';
      const username = userData.username || userData.email.split('@')[0];
      const firstName = userData.firstName || '';
      const lastName = userData.lastName || '';
      const name = userData.name || `${firstName} ${lastName}`.trim() || username;
      const passwordHash = userData.password ? await bcrypt.hash(userData.password, 12) : null;

      const created = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email: userData.email,
          name,
          username,
          firstName,
          lastName,
          role: role as any,
          permissions: User.getPermissionsByRole(role),
          isActive: userData.isActive ?? true,
          profileImage: userData.profileImage || '',
          bio: userData.bio || '',
          needsSetup: userData.needsSetup ?? true,
          provider: (userData.provider || 'email') as any,
          googleId: userData.googleId,
          passwordHash,
          prefs: { showBio: true, showStats: true, showPosts: true },
        },
      });

      return fromDb(created);
    } catch (error: any) {
      if (error.code === 'P2002') throw AppError.conflict('User with this email or username already exists');
      throw AppError.internal(`Failed to create user: ${error.message}`);
    }
  }

  static async findById(userId: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user && !user.email.startsWith('DELETED_') ? fromDb(user) : null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    return user && !user.email.startsWith('DELETED_') ? fromDb(user) : null;
  }

  static async findByUsername(username: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { username } });
    return user && !user.username.startsWith('DELETED_') ? fromDb(user) : null;
  }

  static async findByGoogleId(googleId: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { googleId } });
    return user ? fromDb(user) : null;
  }

  static async findByEmailOrUsername(email: string, username: string): Promise<User | null> {
    return (await this.findByEmail(email)) || (await this.findByUsername(username));
  }

  static async find(query: any = {}): Promise<User[]> {
    const searchTerm = query.$or?.[0]?.username?.$regex;
    const where: any = {};
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.role && query.role !== 'all') where.role = query.role;
    if (searchTerm) {
      where.OR = [
        { username: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { name: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({ where, orderBy: { createdAt: 'desc' } });
    return users.filter(user => !user.email.startsWith('DELETED_')).map(fromDb);
  }

  static async countDocuments(query: any = {}): Promise<number> {
    return (await this.find(query)).length;
  }

  async ensureDatabaseRecord(): Promise<void> {
    await prisma.user.upsert({
      where: { id: this.id },
      update: {},
      create: {
        id: this.id,
        email: this.email,
        name: this.name,
        username: this.username || this.email.split('@')[0],
        firstName: this.firstName,
        lastName: this.lastName,
        role: this.role as any,
        permissions: this.permissions,
        isActive: this.isActive,
        streak: this.streak,
        profileImage: this.profileImage,
        bio: this.bio,
        needsSetup: this.needsSetup,
        provider: this.provider as any,
        googleId: this.googleId,
        profileVisibility: this.profileVisibility,
        prefs: this.prefs,
      },
    });
  }

  async updatePrefs(prefs: Partial<UpdateUserRequest>): Promise<this> {
    const mergedPrefs = { ...this.prefs, ...prefs };
    const updateData: any = { prefs: mergedPrefs };
    const directFields = [
      'username', 'firstName', 'lastName', 'bio', 'profileImage', 'role', 'permissions',
      'isActive', 'needsSetup', 'streak', 'googleId', 'provider', 'profileVisibility',
      'wordleGamesPlayed', 'wordleCurrentStreak', 'wordleBestStreak', 'wordleWins',
      'spellingBeeGamesPlayed', 'spellingBeeCurrentStreak', 'spellingBeeBestStreak', 'spellingBeeWins',
      'strandsGamesPlayed', 'strandsCurrentStreak', 'strandsBestStreak', 'strandsWins'
    ];
    for (const key of directFields) if ((prefs as any)[key] !== undefined) updateData[key] = (prefs as any)[key];
    for (const key of ['lastLogin', 'wordleLastPlayedDate', 'spellingBeeLastPlayedDate', 'strandsLastPlayedDate']) {
      if ((prefs as any)[key] !== undefined) updateData[key] = (prefs as any)[key] ? new Date((prefs as any)[key]) : null;
    }
    if (prefs.role && !prefs.permissions) updateData.permissions = User.getPermissionsByRole(prefs.role);

    const updated = await prisma.user.update({ where: { id: this.id }, data: updateData });
    Object.assign(this, fromDb(updated));
    return this;
  }

  async verifyPassword(password: string): Promise<boolean> {
    return this.passwordHash ? bcrypt.compare(password, this.passwordHash) : false;
  }

  async setPassword(password: string): Promise<void> {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: this.id }, data: { passwordHash, provider: 'email' as any } });
    this.passwordHash = passwordHash;
    this.provider = 'email';
  }

  async updateLastLogin(): Promise<this> {
    const nowISO = new Date().toISOString();
    let streak = this.streak || 0;
    if (this.lastLogin) {
      const days = Math.floor((Date.now() - new Date(this.lastLogin).getTime()) / 86400000);
      streak = days === 0 ? (this.streak || 1) : days === 1 ? (this.streak || 0) + 1 : 1;
    } else {
      streak = 1;
    }
    return this.updatePrefs({ lastLogin: nowISO, streak });
  }

  async completeSetup(setupData: Partial<UpdateUserRequest>): Promise<this> {
    if (setupData.username) {
      const existing = await User.findByUsername(setupData.username);
      if (existing && existing.id !== this.id) throw AppError.conflict('Username already taken');
    }
    return this.updatePrefs({
      username: setupData.username || this.username,
      firstName: setupData.firstName || this.firstName,
      lastName: setupData.lastName || this.lastName,
      bio: setupData.bio || this.bio,
      needsSetup: false
    });
  }

  async deleteAccount(): Promise<void> {
    const stamp = Date.now();
    await prisma.user.update({
      where: { id: this.id },
      data: {
        email: `DELETED_${stamp}_${this.email}`,
        username: `DELETED_${stamp}_${this.username}`,
        googleId: null,
        isActive: false,
        prefs: { ...this.prefs, isDeleted: true, deletedAt: new Date().toISOString() },
      },
    });
  }

  async fixUserDataConsistency(): Promise<void> {
    if (this.username) return;
    const base = this.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || `user${Date.now()}`;
    let username = base;
    let counter = 1;
    while (await User.findByUsername(username)) username = `${base}${counter++}`;
    await this.updatePrefs({ username });
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
      articles: { read: 'read_articles', write: 'write_articles', edit: 'edit_articles', delete: 'delete_articles', publish: 'publish_articles' },
      users: { manage: 'manage_users' },
      system: { manage: 'manage_system' }
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
      wordleLastPlayedDate: this.wordleLastPlayedDate,
      spellingBeeGamesPlayed: this.spellingBeeGamesPlayed,
      spellingBeeCurrentStreak: this.spellingBeeCurrentStreak,
      spellingBeeBestStreak: this.spellingBeeBestStreak,
      spellingBeeWins: this.spellingBeeWins,
      spellingBeeLastPlayedDate: this.spellingBeeLastPlayedDate,
      strandsGamesPlayed: this.strandsGamesPlayed,
      strandsCurrentStreak: this.strandsCurrentStreak,
      strandsBestStreak: this.strandsBestStreak,
      strandsWins: this.strandsWins,
      strandsLastPlayedDate: this.strandsLastPlayedDate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export default User;
