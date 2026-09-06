import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/config/database';
import { AuthProvider, PostStatus, UserRole } from '@prisma/client';

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
        profileImage: prefs.profileImage || '',
        bio: prefs.bio || '',
        needsSetup: prefs.needsSetup || false,
        provider: (prefs.provider || (prefs.googleId ? 'google' : 'email')) as AuthProvider,
        googleId: prefs.googleId || undefined,
        profileVisibility: prefs.profileVisibility ?? true,
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
        profileImage: prefs.profileImage || '',
        bio: prefs.bio || '',
        needsSetup: prefs.needsSetup || false,
        provider: (prefs.provider || (prefs.googleId ? 'google' : 'email')) as AuthProvider,
        googleId: prefs.googleId || undefined,
        profileVisibility: prefs.profileVisibility ?? true,
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
        content: post.content,
        excerpt: post.excerpt || '',
        authorId: post.authorId,
        authorName: post.authorName,
        authorUsername: post.authorUsername || undefined,
        category: post.category,
        tags: asStringArray(post.tags),
        status: (post.status || 'draft') as PostStatus,
        featuredImage: post.featuredImage || undefined,
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
        content: post.content,
        excerpt: post.excerpt || '',
        authorId: post.authorId,
        authorName: post.authorName,
        authorUsername: post.authorUsername || undefined,
        category: post.category,
        tags: asStringArray(post.tags),
        status: (post.status || 'draft') as PostStatus,
        featuredImage: post.featuredImage || undefined,
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

async function main() {
  await importUsers();
  await importPosts();

  console.log('local import foundation complete; comments/bookmarks/applications are next migration targets');
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
