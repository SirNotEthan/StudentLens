export const APP_CONFIG = {
  name: "STUDENT LENS",
  tagline: "Your Student News Hub",
  contact: {
    email: "contact@studentlens.edu",
    location: "DOC 21",
    phone: "(555) 123-4567"
  },
  social: {
    twitter: "@studentlens",
    instagram: "@studentlens_official",
    facebook: "StudentLensOfficial"
  }
};

export const ROLES = {
  STUDENT: "student",
  WRITER: "writer",
  EDITOR: "editor",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin"
};

export const PERMISSIONS = {
  READ_ARTICLES: "read_articles",
  WRITE_ARTICLES: "write_articles",
  EDIT_ARTICLES: "edit_articles",
  DELETE_ARTICLES: "delete_articles",
  PUBLISH_ARTICLES: "publish_articles",
  MANAGE_USERS: "manage_users",
  MANAGE_SYSTEM: "manage_system",
  VIEW_ANALYTICS: "view_analytics"
};

export const ROLE_PERMISSIONS = {
  [ROLES.STUDENT]: [
    PERMISSIONS.READ_ARTICLES
  ],
  [ROLES.WRITER]: [
    PERMISSIONS.READ_ARTICLES,
    PERMISSIONS.WRITE_ARTICLES
  ],
  [ROLES.EDITOR]: [
    PERMISSIONS.READ_ARTICLES,
    PERMISSIONS.WRITE_ARTICLES,
    PERMISSIONS.EDIT_ARTICLES,
    PERMISSIONS.PUBLISH_ARTICLES
  ],
  [ROLES.ADMIN]: [
    PERMISSIONS.READ_ARTICLES,
    PERMISSIONS.WRITE_ARTICLES,
    PERMISSIONS.EDIT_ARTICLES,
    PERMISSIONS.PUBLISH_ARTICLES,
    PERMISSIONS.DELETE_ARTICLES,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_ANALYTICS
  ],
  [ROLES.SUPER_ADMIN]: [
    PERMISSIONS.READ_ARTICLES,
    PERMISSIONS.WRITE_ARTICLES,
    PERMISSIONS.EDIT_ARTICLES,
    PERMISSIONS.PUBLISH_ARTICLES,
    PERMISSIONS.DELETE_ARTICLES,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_SYSTEM,
    PERMISSIONS.VIEW_ANALYTICS
  ]
};

export const ROLE_DISPLAY_NAMES = {
  [ROLES.STUDENT]: "Student",
  [ROLES.WRITER]: "Writer",
  [ROLES.EDITOR]: "Editor",
  [ROLES.ADMIN]: "Administrator",
  [ROLES.SUPER_ADMIN]: "Super Admin"
};

export const ROLE_COLORS = {
  [ROLES.STUDENT]: "#4a90e2",
  [ROLES.WRITER]: "#28a745",
  [ROLES.EDITOR]: "#fd7e14",
  [ROLES.ADMIN]: "#dc3545",
  [ROLES.SUPER_ADMIN]: "#6f42c1"
};

export const DEFAULT_PROFILE_IMAGES = [
  "/images/avatars/default-1.png",
  "/images/avatars/default-2.png",
  "/images/avatars/default-3.png",
  "/images/avatars/default-4.png",
  "/images/avatars/default-5.png"
];

export const PLACEHOLDER_IMAGES = {
  ARTICLE: "/images/placeholders/article-placeholder.jpg",
  AVATAR: "/images/placeholders/avatar-placeholder.png",
  LOGO: "/images/logo/student-lens-logo.png"
};

export const DATE_FORMATS = {
  FULL: {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  },
  SHORT: {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  },
  COMPACT: {
    month: 'short',
    day: 'numeric'
  }
};

export const STREAK_MESSAGES = {
  0: "Start your journey!",
  1: "Great start!",
  7: "One week strong! 🎉",
  30: "30 days in a row! Amazing! 🔥",
  100: "Century mark! Incredible! 💯",
  365: "One full year! Outstanding! 🏆"
};

export const getStreakMessage = (streakCount) => {
  const milestones = Object.keys(STREAK_MESSAGES)
    .map(Number)
    .sort((a, b) => b - a);

  for (const milestone of milestones) {
    if (streakCount >= milestone) {
      return STREAK_MESSAGES[milestone];
    }
  }

  return STREAK_MESSAGES[0];
};

export const NAVIGATION_ITEMS = [
  { name: "Home", path: "/main", icon: "🏠" },
  { name: "Profile", path: "/profile", icon: "👤" },
  { name: "Settings", path: "/account-settings", icon: "⚙️" }
];

export const QUICK_ACTIONS = {
  WRITE_ARTICLE: {
    label: "Write Article",
    permission: PERMISSIONS.WRITE_ARTICLES,
    action: "writeArticle"
  },
  ADMIN_PANEL: {
    label: "Admin Panel",
    permission: PERMISSIONS.MANAGE_USERS,
    action: "adminPanel"
  },
  BECOME_WRITER: {
    label: "Become a Writer",
    role: ROLES.STUDENT,
    action: "becomeWriter"
  }
};