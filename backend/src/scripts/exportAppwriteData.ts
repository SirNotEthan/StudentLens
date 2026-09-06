import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { databases, users, DATABASE_ID } from '@/config/appwrite';
import { Query } from 'node-appwrite';

const exportDir = process.env.STUDENTLENS_EXPORT_DIR || path.resolve(process.cwd(), 'exports', 'appwrite');

const collections = {
  posts: process.env.APPWRITE_POSTS_COLLECTION_ID || 'posts',
  comments: process.env.APPWRITE_COMMENTS_COLLECTION_ID || 'comments',
  bookmarks: process.env.APPWRITE_BOOKMARKS_COLLECTION_ID || 'bookmarks',
  writerApplications: process.env.APPWRITE_APPLICATIONS_COLLECTION_ID || 'writer_applications',
  analyticsEvents: process.env.APPWRITE_ANALYTICS_COLLECTION_ID || 'analytics_events',
  contactSubmissions: process.env.APPWRITE_CONTACT_SUBMISSIONS_COLLECTION_ID || 'contact_submissions',
  siteSettings: 'site_settings',
};

async function listAllDocuments(collectionId: string) {
  const documents: any[] = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const batch = await databases.listDocuments(DATABASE_ID, collectionId, [
      Query.limit(limit),
      Query.offset(offset),
    ]);

    documents.push(...batch.documents);

    if (batch.documents.length < limit) break;
    offset += limit;
  }

  return documents;
}

async function listAllUsers() {
  const allUsers: any[] = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const batch = await users.list([Query.limit(limit), Query.offset(offset)]);
    allUsers.push(...batch.users);

    if (batch.users.length < limit) break;
    offset += limit;
  }

  return allUsers;
}

async function writeJson(name: string, data: unknown) {
  const filePath = path.join(exportDir, `${name}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  console.log(`wrote ${filePath}`);
}

async function main() {
  await fs.mkdir(exportDir, { recursive: true });

  await writeJson('users', await listAllUsers());

  for (const [name, collectionId] of Object.entries(collections)) {
    try {
      await writeJson(name, await listAllDocuments(collectionId));
    } catch (error: any) {
      console.warn(`skipped ${name} (${collectionId}): ${error.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
