import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/config/database';
import { ApplicationStatus, AuthProvider, ContactSubmissionStatus, PostStatus, UserRole } from '@prisma/client';

const exportDir = process.env.STUDENTLENS_EXPORT_DIR || path.resolve(process.cwd(), 'exports', 'appwrite');

const readJson = async <T>(name: string, fallback: T): Promise<T> => {
  try {
    const raw = await fs.readFile(path.join(exportDir, `${name}.json`), 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const toDate = (value?: string | null) => (value ? new Date(value) : undefined);

const asStringArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const documentId = (document: any): string => document.$id || document.id;

type ExportedStorageFile = {
  bucketId: string;
  fileId: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  publicPath: string;
};

let storageFilesById = new Map<string, ExportedStorageFile>();

const localizeStorageUrls = (value: unknown): string => {
  const text = String(value || '');
  return text.replace(
    /https?:\/\/[^\s"']+\/storage\/buckets\/([^/]+)\/files\/([^/]+)\/(?:view|download|preview)[^\s"']*/g,
    (original, bucketId, fileId) => storageFilesById.get(`${bucketId}:${fileId}`)?.publicPath || original,
  );
};

async function importUsers() {
  const users = await readJson<any[]>('users', []);

  for (const user of users) {
    const prefs = user.prefs || {};
    const firstName = prefs.firstName || user.name?.split(' ')?.[0] || '';
    const lastName = prefs.lastName || user.name?.split(' ')?.slice(1).join(' ') || '';
    const username = prefs.username || user.email?.split('@')?.[0] || user.$id;

    await prisma.user.upsert({
      where: { id: user.$id },
      update: {
        email: user.email,
        name: user.name || username,
        username,
        firstName,
        lastName,
        role: (prefs.role || 'Student') as UserRole,
        permissions: asStringArray(prefs.permissions),
        isActive: prefs.isActive ?? user.status ?? true,
        profileImage: localizeStorageUrls(prefs.profileImage),
        bio: prefs.bio || '',
        needsSetup: prefs.needsSetup || false,
        provider: (prefs.provider || (prefs.googleId ? 'google' : 'email')) as AuthProvider,
        googleId: prefs.googleId || undefined,
        profileVisibility: prefs.profileVisibility ?? true,
        passwordHash: user.hash === 'bcrypt' ? user.password : undefined,
        appwritePrefs: prefs,
      },
      create: {
        id: user.$id,
        email: user.email,
        name: user.name || username,
        username,
        firstName,
        lastName,
        role: (prefs.role || 'Student') as UserRole,
        permissions: asStringArray(prefs.permissions),
        isActive: prefs.isActive ?? user.status ?? true,
        profileImage: localizeStorageUrls(prefs.profileImage),
        bio: prefs.bio || '',
        needsSetup: prefs.needsSetup || false,
        provider: (prefs.provider || (prefs.googleId ? 'google' : 'email')) as AuthProvider,
        googleId: prefs.googleId || undefined,
        profileVisibility: prefs.profileVisibility ?? true,
        passwordHash: user.hash === 'bcrypt' ? user.password : undefined,
        prefs,
        appwritePrefs: prefs,
        createdAt: toDate(user.$createdAt),
        updatedAt: toDate(user.$updatedAt),
      },
    });
  }

  console.log(`imported ${users.length} users`);
}

async function importPosts() {
  const posts = await readJson<any[]>('posts', []);

  for (const post of posts) {
    await prisma.post.upsert({
      where: { id: post.$id },
      update: {
        title: post.title,
        content: localizeStorageUrls(post.content),
        excerpt: post.excerpt || '',
        authorId: post.authorId,
        authorName: post.authorName,
        authorUsername: post.authorUsername || undefined,
        category: post.category,
        tags: asStringArray(post.tags),
        status: (post.status || 'draft') as PostStatus,
        featuredImage: post.featuredImage ? localizeStorageUrls(post.featuredImage) : undefined,
        publishedAt: toDate(post.publishedAt),
        viewCount: post.viewCount || 0,
        likes: post.likes || 0,
        likedUsers: asStringArray(post.likedUsers),
        slug: post.slug,
        editorId: post.editorId || undefined,
        editorName: post.editorName || undefined,
        reviewerId: post.reviewerId || undefined,
        reviewerName: post.reviewerName || undefined,
        submittedAt: toDate(post.submittedAt),
        reviewedAt: toDate(post.reviewedAt),
        rejectionComment: post.rejectionComment || undefined,
      },
      create: {
        id: post.$id,
        title: post.title,
        content: localizeStorageUrls(post.content),
        excerpt: post.excerpt || '',
        authorId: post.authorId,
        authorName: post.authorName,
        authorUsername: post.authorUsername || undefined,
        category: post.category,
        tags: asStringArray(post.tags),
        status: (post.status || 'draft') as PostStatus,
        featuredImage: post.featuredImage ? localizeStorageUrls(post.featuredImage) : undefined,
        publishedAt: toDate(post.publishedAt),
        viewCount: post.viewCount || 0,
        likes: post.likes || 0,
        likedUsers: asStringArray(post.likedUsers),
        slug: post.slug,
        editorId: post.editorId || undefined,
        editorName: post.editorName || undefined,
        reviewerId: post.reviewerId || undefined,
        reviewerName: post.reviewerName || undefined,
        submittedAt: toDate(post.submittedAt),
        reviewedAt: toDate(post.reviewedAt),
        rejectionComment: post.rejectionComment || undefined,
        createdAt: toDate(post.$createdAt),
        updatedAt: toDate(post.$updatedAt),
      },
    });
  }

  console.log(`imported ${posts.length} posts`);
}

async function importComments() {
  const comments = await readJson<any[]>('comments', []);

  // Import the rows first, then link replies. Appwrite does not guarantee that
  // parent comments are returned before their children.
  for (const comment of comments) {
    await prisma.comment.upsert({
      where: { id: documentId(comment) },
      update: {
        postId: comment.postId,
        authorId: comment.authorId,
        authorName: comment.authorName,
        content: comment.content,
        parentId: undefined,
        isDeleted: comment.isDeleted || false,
        likes: comment.likes || 0,
        likedUsers: asStringArray(comment.likedUsers),
      },
      create: {
        id: documentId(comment),
        postId: comment.postId,
        authorId: comment.authorId,
        authorName: comment.authorName,
        content: comment.content,
        parentId: undefined,
        isDeleted: comment.isDeleted || false,
        likes: comment.likes || 0,
        likedUsers: asStringArray(comment.likedUsers),
        createdAt: toDate(comment.$createdAt),
        updatedAt: toDate(comment.$updatedAt),
      },
    });
  }

  for (const comment of comments) {
    if (!comment.parentId) continue;
    await prisma.comment.update({
      where: { id: documentId(comment) },
      data: { parentId: comment.parentId },
    });
  }

  console.log(`imported ${comments.length} comments`);
}

async function importBookmarks() {
  const bookmarks = await readJson<any[]>('bookmarks', []);
  const validUsers = new Set((await prisma.user.findMany({ select: { id: true } })).map(({ id }) => id));
  const validPosts = new Set((await prisma.post.findMany({ select: { id: true } })).map(({ id }) => id));
  let skipped = 0;

  for (const bookmark of bookmarks) {
    if (!validUsers.has(bookmark.userId) || !validPosts.has(bookmark.postId)) {
      skipped += 1;
      continue;
    }

    await prisma.bookmark.upsert({
      where: { id: documentId(bookmark) },
      update: {
        userId: bookmark.userId,
        postId: bookmark.postId,
      },
      create: {
        id: documentId(bookmark),
        userId: bookmark.userId,
        postId: bookmark.postId,
        createdAt: toDate(bookmark.$createdAt),
      },
    });
  }

  console.log(`imported ${bookmarks.length - skipped} bookmarks; skipped ${skipped} orphaned legacy bookmarks`);
}

async function importWriterApplications() {
  const applications = await readJson<any[]>('writerApplications', []);

  for (const application of applications) {
    await prisma.writerApplication.upsert({
      where: { id: documentId(application) },
      update: {
        userId: application.userId,
        userName: application.userName,
        userEmail: application.userEmail,
        reason: application.reason,
        writingSample: application.writingSample || undefined,
        status: (application.status || 'pending') as ApplicationStatus,
        submittedAt: toDate(application.submittedAt) || new Date(),
        reviewedAt: toDate(application.reviewedAt),
        reviewedBy: application.reviewedBy || undefined,
        reviewerName: application.reviewerName || undefined,
      },
      create: {
        id: documentId(application),
        userId: application.userId,
        userName: application.userName,
        userEmail: application.userEmail,
        reason: application.reason,
        writingSample: application.writingSample || undefined,
        status: (application.status || 'pending') as ApplicationStatus,
        submittedAt: toDate(application.submittedAt) || toDate(application.$createdAt) || new Date(),
        reviewedAt: toDate(application.reviewedAt),
        reviewedBy: application.reviewedBy || undefined,
        reviewerName: application.reviewerName || undefined,
        createdAt: toDate(application.$createdAt),
        updatedAt: toDate(application.$updatedAt),
      },
    });
  }

  console.log(`imported ${applications.length} writer applications`);
}

async function importAnalyticsEvents() {
  const events = await readJson<any[]>('analyticsEvents', []);

  for (const event of events) {
    await prisma.analyticsEvent.upsert({
      where: { id: documentId(event) },
      update: {
        userId: event.userId || undefined,
        eventType: event.eventType,
        eventData: event.eventData || {},
        page: event.page || event.pageUrl || undefined,
        pageUrl: event.pageUrl || event.page || undefined,
        pageTitle: event.pageTitle || undefined,
        referrer: event.referrer || undefined,
        browser: event.browser || undefined,
        browserVersion: event.browserVersion || undefined,
        deviceType: event.deviceType || undefined,
        operatingSystem: event.operatingSystem || undefined,
        osVersion: event.osVersion || undefined,
        postId: event.postId || undefined,
        commentId: event.commentId || undefined,
        searchQuery: event.searchQuery || undefined,
        featureName: event.featureName || undefined,
        userAgent: event.userAgent || undefined,
        ipAddress: event.ipAddress || undefined,
        sessionId: event.sessionId || undefined,
        timestamp: toDate(event.timestamp) || toDate(event.$createdAt) || new Date(),
      },
      create: {
        id: documentId(event),
        userId: event.userId || undefined,
        eventType: event.eventType,
        eventData: event.eventData || {},
        page: event.page || event.pageUrl || undefined,
        pageUrl: event.pageUrl || event.page || undefined,
        pageTitle: event.pageTitle || undefined,
        referrer: event.referrer || undefined,
        browser: event.browser || undefined,
        browserVersion: event.browserVersion || undefined,
        deviceType: event.deviceType || undefined,
        operatingSystem: event.operatingSystem || undefined,
        osVersion: event.osVersion || undefined,
        postId: event.postId || undefined,
        commentId: event.commentId || undefined,
        searchQuery: event.searchQuery || undefined,
        featureName: event.featureName || undefined,
        userAgent: event.userAgent || undefined,
        ipAddress: event.ipAddress || undefined,
        sessionId: event.sessionId || undefined,
        timestamp: toDate(event.timestamp) || toDate(event.$createdAt) || new Date(),
        createdAt: toDate(event.$createdAt),
        updatedAt: toDate(event.$updatedAt),
      },
    });
  }

  console.log(`imported ${events.length} analytics events`);
}

async function importContactSubmissions() {
  const submissions = await readJson<any[]>('contactSubmissions', []);

  for (const submission of submissions) {
    await prisma.contactSubmission.upsert({
      where: { id: documentId(submission) },
      update: {
        name: submission.name,
        email: submission.email,
        subject: submission.subject,
        message: submission.message,
        status: (submission.status || 'new') as ContactSubmissionStatus,
        ipAddress: submission.ipAddress || undefined,
      },
      create: {
        id: documentId(submission),
        name: submission.name,
        email: submission.email,
        subject: submission.subject,
        message: submission.message,
        status: (submission.status || 'new') as ContactSubmissionStatus,
        ipAddress: submission.ipAddress || undefined,
        createdAt: toDate(submission.$createdAt),
        updatedAt: toDate(submission.$updatedAt),
      },
    });
  }

  console.log(`imported ${submissions.length} contact submissions`);
}

async function importSiteSettings() {
  const settings = await readJson<any[]>('siteSettings', []);
  const latest = settings[settings.length - 1];

  if (!latest) {
    console.log('imported 0 site settings');
    return;
  }

  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: {
      siteName: latest.siteName || 'STUDENT LENS',
      siteDescription: latest.siteDescription || '',
      tagline: latest.tagline || 'Your Student News Hub',
      allowRegistration: latest.allowRegistration ?? true,
      requireWriterApproval: latest.requireWriterApproval ?? true,
      maintenanceMode: latest.maintenanceMode ?? false,
      contactEmail: latest.contactEmail || 'contact@studentlens.com',
      contactRoom: latest.contactRoom || 'S-21',
      contactRoomFullName: latest.contactRoomFullName || 'Room S-21',
      officeHours: latest.officeHours || 'Monday-Friday 9AM-5PM',
      gamesImage: localizeStorageUrls(latest.gamesImage),
      featuredNewsImage: localizeStorageUrls(latest.featuredNewsImage),
      aboutMission: latest.aboutMission || '',
      aboutWhatWeDo: latest.aboutWhatWeDo || '',
      aboutValues: latest.aboutValues || '',
      aboutLegacy: latest.aboutLegacy || '',
      aboutLegacyIntro: latest.aboutLegacyIntro || '',
      aboutGetInvolved: latest.aboutGetInvolved || '',
      applyIntro: latest.applyIntro || '',
      applyBenefits: latest.applyBenefits || '',
      applyTimeline: latest.applyTimeline || '',
      termsOfService: latest.termsOfService || '',
      privacyPolicy: latest.privacyPolicy || '',
      metadata: latest.metadata || {},
    },
    create: {
      id: 'singleton',
      siteName: latest.siteName || 'STUDENT LENS',
      siteDescription: latest.siteDescription || '',
      tagline: latest.tagline || 'Your Student News Hub',
      allowRegistration: latest.allowRegistration ?? true,
      requireWriterApproval: latest.requireWriterApproval ?? true,
      maintenanceMode: latest.maintenanceMode ?? false,
      contactEmail: latest.contactEmail || 'contact@studentlens.com',
      contactRoom: latest.contactRoom || 'S-21',
      contactRoomFullName: latest.contactRoomFullName || 'Room S-21',
      officeHours: latest.officeHours || 'Monday-Friday 9AM-5PM',
      gamesImage: localizeStorageUrls(latest.gamesImage),
      featuredNewsImage: localizeStorageUrls(latest.featuredNewsImage),
      aboutMission: latest.aboutMission || '',
      aboutWhatWeDo: latest.aboutWhatWeDo || '',
      aboutValues: latest.aboutValues || '',
      aboutLegacy: latest.aboutLegacy || '',
      aboutLegacyIntro: latest.aboutLegacyIntro || '',
      aboutGetInvolved: latest.aboutGetInvolved || '',
      applyIntro: latest.applyIntro || '',
      applyBenefits: latest.applyBenefits || '',
      applyTimeline: latest.applyTimeline || '',
      termsOfService: latest.termsOfService || '',
      privacyPolicy: latest.privacyPolicy || '',
      metadata: latest.metadata || {},
      createdAt: toDate(latest.$createdAt),
      updatedAt: toDate(latest.$updatedAt),
    },
  });

  console.log(`imported ${settings.length} site settings documents into singleton settings`);
}

async function importStorageFiles() {
  const files = [...storageFilesById.values()];

  for (const file of files) {
    await prisma.uploadedFile.upsert({
      where: { id: `appwrite:${file.bucketId}:${file.fileId}` },
      update: {
        originalName: file.originalName,
        storedName: file.storedName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        publicPath: file.publicPath,
        purpose: file.bucketId,
        appwriteFileId: file.fileId,
      },
      create: {
        id: `appwrite:${file.bucketId}:${file.fileId}`,
        originalName: file.originalName,
        storedName: file.storedName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        publicPath: file.publicPath,
        purpose: file.bucketId,
        appwriteFileId: file.fileId,
      },
    });
  }

  console.log(`imported ${files.length} storage file records`);
}

async function main() {
  const storageFiles = await readJson<ExportedStorageFile[]>('storageFiles', []);
  storageFilesById = new Map(storageFiles.map((file) => [`${file.bucketId}:${file.fileId}`, file]));

  await importUsers();
  await importPosts();
  await importComments();
  await importBookmarks();
  await importWriterApplications();
  await importAnalyticsEvents();
  await importContactSubmissions();
  await importSiteSettings();
  await importStorageFiles();

  console.log('local import complete');
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
