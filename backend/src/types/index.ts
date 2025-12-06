import { Request } from 'express';

export interface IUser {
  id: string;
  email: string;
  name: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  streak: number;
  lastLogin?: string;
  profileImage: string;
  bio: string;
  needsSetup: boolean;
  provider: AuthProvider;
  googleId?: string;
  profileVisibility: boolean;
  wordleGamesPlayed: number;
  wordleCurrentStreak: number;
  wordleBestStreak: number;
  wordleWins: number;
  createdAt: string;
  updatedAt: string;
  prefs: Record<string, any>;
}

export type UserRole = 'Student' | 'Writer' | 'Editor' | 'Teacher' | 'Owner';

export type Permission =
  | 'read_articles'
  | 'write_articles'
  | 'edit_articles'
  | 'delete_articles'
  | 'publish_articles'
  | 'moderate_content'
  | 'view_analytics'
  | 'manage_categories'
  | 'manage_users'
  | 'manage_roles'
  | 'manage_system'
  | 'review_articles'
  | 'apply_writer'
  | 'manage_applications';

export type AuthProvider = 'email' | 'google';

export interface IPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  authorId: string;
  authorName: string;
  category: string;
  tags: string[];
  status: PostStatus;
  featuredImage?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  likes: number;
  slug: string;
  editorId?: string;
  editorName?: string;
  reviewerId?: string;
  reviewerName?: string;
  submittedAt?: string;
  reviewedAt?: string;
}

export type PostStatus = 'draft' | 'pending_editor' | 'pending_reviewer' | 'published' | 'archived';

export interface IComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  parentId?: string; // For nested comments/replies
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  likes: number;
}

export interface IBookmark {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
}

export interface CreateBookmarkRequest {
  postId: string;
}

export interface CreateCommentRequest {
  postId: string;
  content: string;
  parentId?: string;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface CommentResponse {
  success: boolean;
  message?: string;
  data?: { comment: IComment };
}

export interface CommentListResponse {
  success: boolean;
  message?: string;
  data?: {
    comments: IComment[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalComments: number;
      hasNext: boolean;
      hasPrev: boolean;
      limit: number;
    };
  };
}

export interface CreatePostRequest {
  title: string;
  content: string;
  excerpt?: string;
  category: string;
  tags?: string[];
  status?: PostStatus;
  featuredImage?: string;
}

export interface UpdatePostRequest extends Partial<CreatePostRequest> {
  id: string;
  editorId?: string;
  editorName?: string;
  reviewerId?: string;
  reviewerName?: string;
  submittedAt?: string;
  reviewedAt?: string;
  publishedAt?: string;
}

export interface IWriterApplication {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  reason: string;
  writingSample?: string;
  status: ApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewerName?: string;
  createdAt: string;
  updatedAt: string;
}

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface CreateApplicationRequest {
  reason: string;
  writingSample?: string;
}

export interface UpdateApplicationRequest {
  id: string;
  status: ApplicationStatus;
  reviewedBy?: string;
  reviewerName?: string;
}

export interface PostListResponse {
  success: boolean;
  posts: IPost[];
  pagination: PaginationInfo;
}

export interface PostResponse {
  success: boolean;
  post: IPost;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  stack?: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  hasNext: boolean;
  hasPrev: boolean;
  limit: number;
}

export interface UserListResponse {
  success: boolean;
  users: IUser[];
  pagination: PaginationInfo;
}

export interface UserStatsResponse {
  success: boolean;
  stats: {
    totalUsers: number;
    activeUsers: number;
    usersByRole: Record<UserRole, number>;
    recentUsers: IUser[];
  };
}

export interface AuthenticatedRequest extends Request {
  user: IUser & {
    userId: string;
    hasPermission: (permission: Permission) => boolean;
    canAccess: (resource: string, action: string) => boolean;
    updatePrefs: (prefs: Partial<UpdateUserRequest>) => Promise<IUser>;
    completeSetup: (setupData: Partial<UpdateUserRequest>) => Promise<IUser>;
    deleteAccount: () => Promise<void>;
    fixUserDataConsistency: () => Promise<void>;
    toJSON: () => Omit<IUser, 'prefs'> & { fullName: string };
  };
}

export interface RegisterUserRequest {
  username: string;
  email: string;
  password?: string;
  name?: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  profileImage?: string;
  bio?: string;
  provider?: AuthProvider;
  googleId?: string;
  isActive?: boolean;
  needsSetup?: boolean;
}

export interface LoginRequest {
  login: string; // can be username or email
  password: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  username?: string;
  bio?: string;
  profileImage?: string;
  role?: UserRole;
  isActive?: boolean;
  lastLogin?: string;
  needsSetup?: boolean;
  streak?: number;
  googleId?: string;
  provider?: AuthProvider;
  profileVisibility?: boolean;
  showBio?: boolean;
  showStats?: boolean;
  showPosts?: boolean;
  wordleGamesPlayed?: number;
  wordleCurrentStreak?: number;
  wordleBestStreak?: number;
  wordleWins?: number;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AppwriteUser {
  $id: string;
  email: string;
  name: string;
  prefs?: Record<string, any>;
  $createdAt: string;
  $updatedAt: string;
}

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface EnvironmentVariables {
  PORT: string;
  NODE_ENV: 'development' | 'production' | 'test';
  APPWRITE_ENDPOINT: string;
  APPWRITE_PROJECT_ID: string;
  APPWRITE_API_KEY: string;
  APPWRITE_DATABASE_ID: string;
  APPWRITE_USERS_COLLECTION_ID: string;
  JWT_SECRET: string;
  JWT_EXPIRE: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CALLBACK_URL: string;
  SESSION_SECRET: string;
  CLIENT_URL: string;
  REDIS_URL: string;
}

export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LoggerContext {
  userId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  role?: string;
  userRole?: string;
}

// Analytics Types
export type AnalyticsEventType =
  | 'page_view'
  | 'post_view'
  | 'post_like'
  | 'post_unlike'
  | 'post_bookmark'
  | 'post_unbookmark'
  | 'comment_create'
  | 'comment_like'
  | 'search'
  | 'login'
  | 'logout'
  | 'signup'
  | 'profile_update'
  | 'post_create'
  | 'post_edit'
  | 'post_delete'
  | 'feature_use';

export interface IAnalyticsEvent {
  id: string;
  userId?: string;
  sessionId?: string;
  eventType: AnalyticsEventType;
  eventData?: Record<string, any>;

  // User Technical Data
  ipAddress?: string;
  browser?: string;
  browserVersion?: string;
  deviceType?: string;
  operatingSystem?: string;
  osVersion?: string;
  userAgent?: string;

  // Page/Content Data
  pageUrl?: string;
  pageTitle?: string;
  referrer?: string;

  // Interaction Data
  postId?: string;
  commentId?: string;
  searchQuery?: string;
  featureName?: string;

  // Metadata
  timestamp: string;
  createdAt: string;
}

export interface CreateAnalyticsEventRequest {
  eventType: AnalyticsEventType;
  eventData?: Record<string, any>;
  pageUrl?: string;
  pageTitle?: string;
  referrer?: string;
  postId?: string;
  commentId?: string;
  searchQuery?: string;
  featureName?: string;
}

export interface AnalyticsQuery {
  userId?: string;
  eventType?: AnalyticsEventType;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AnalyticsStats {
  totalEvents: number;
  uniqueUsers: number;
  eventsByType: Record<AnalyticsEventType, number>;
  topPages: Array<{ page: string; views: number }>;
  topPosts: Array<{ postId: string; views: number }>;
  deviceStats: {
    desktop: number;
    mobile: number;
    tablet: number;
    other: number;
  };
  browserStats: Record<string, number>;
  osStats: Record<string, number>;
  userGrowth: Array<{ date: string; count: number }>;
}

export interface UserBehaviorData {
  userId: string;
  totalPageViews: number;
  totalPostViews: number;
  totalLikes: number;
  totalComments: number;
  totalBookmarks: number;
  pagesViewed: string[];
  postsViewed: string[];
  featuresUsed: string[];
  lastActive: string;
  firstSeen: string;
  sessionCount: number;
}