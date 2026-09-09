import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { Client, Databases, Query, Storage, Users } from 'node-appwrite';

const exportDir = process.env.STUDENTLENS_EXPORT_DIR || path.resolve(process.cwd(), 'exports', 'appwrite');
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!;

const requiredConfig = [
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT_ID',
  'APPWRITE_API_KEY',
  'APPWRITE_DATABASE_ID',
];

const missingConfig = requiredConfig.filter((key) => !process.env[key]);
if (missingConfig.length > 0) {
  throw new Error(`Missing Appwrite export configuration: ${missingConfig.join(', ')}`);
}

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT!)
  .setProject(process.env.APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const users = new Users(client);
const storage = new Storage(client);

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

const safePathSegment = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

async function exportStorage() {
  const exportedFiles: Array<{
    bucketId: string;
    bucketName: string;
    fileId: string;
    originalName: string;
    storedName: string;
    mimeType: string;
    sizeBytes: number;
    publicPath: string;
  }> = [];

  const configuredBucket = process.env.APPWRITE_STORAGE_BUCKET_ID;
  const buckets = configuredBucket
    ? [{ $id: configuredBucket, name: configuredBucket }]
    : (await storage.listBuckets({ queries: [Query.limit(100)] })).buckets;

  for (const bucket of buckets) {
    const bucketId = bucket.$id;
    const bucketDir = path.join(exportDir, 'storage', safePathSegment(bucketId));
    await fs.mkdir(bucketDir, { recursive: true });

    let offset = 0;
    const limit = 100;

    while (true) {
      const batch = await storage.listFiles({
        bucketId,
        queries: [Query.limit(limit), Query.offset(offset)],
      });

      for (const file of batch.files) {
        const extension = path.extname(file.name || '');
        const storedName = `${safePathSegment(file.$id)}${safePathSegment(extension)}`;
        const relativePath = path.posix.join('appwrite', safePathSegment(bucketId), storedName);
        const contents = await storage.getFileDownload({ bucketId, fileId: file.$id });

        await fs.writeFile(path.join(bucketDir, storedName), Buffer.from(contents));
        exportedFiles.push({
          bucketId,
          bucketName: bucket.name,
          fileId: file.$id,
          originalName: file.name,
          storedName,
          mimeType: file.mimeType,
          sizeBytes: file.sizeOriginal,
          publicPath: `/uploads/${relativePath}`,
        });
      }

      if (batch.files.length < limit) break;
      offset += limit;
    }
  }

  await writeJson('storageFiles', exportedFiles);
  console.log(`exported ${exportedFiles.length} storage files`);
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

  try {
    await exportStorage();
  } catch (error: any) {
    console.warn(`storage export failed: ${error.message}`);
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
