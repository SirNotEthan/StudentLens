import { Client, Account, Databases, Users, ID, Query } from 'node-appwrite';
import { EnvironmentVariables } from '@/types';
import { appLogger } from '@/services/logger';

const requiredEnvVars: (keyof EnvironmentVariables)[] = [
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT_ID',
  'APPWRITE_API_KEY',
  'APPWRITE_DATABASE_ID'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
  appLogger.error('Appwrite configuration error', new Error(errorMessage));
  throw new Error(errorMessage);
}

const client = new Client();

try {
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  appLogger.info('Appwrite client initialized successfully', {
    endpoint: process.env.APPWRITE_ENDPOINT,
    projectId: process.env.APPWRITE_PROJECT_ID
  });
} catch (error) {
  appLogger.error('Failed to initialize Appwrite client', error);
  throw error;
}

const account = new Account(client);
const databases = new Databases(client);
const users = new Users(client);

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!;
const USERS_COLLECTION_ID = process.env.APPWRITE_USERS_COLLECTION_ID || 'not-needed-for-appwrite-auth';

export const checkAppwriteConnection = async (): Promise<boolean> => {
  try {
    await users.list();
    appLogger.info('Appwrite connection health check passed');
    return true;
  } catch (error) {
    appLogger.error('Appwrite connection health check failed', error);
    return false;
  }
};

export const appwriteConfig = {
  endpoint: process.env.APPWRITE_ENDPOINT!,
  projectId: process.env.APPWRITE_PROJECT_ID!,
  databaseId: DATABASE_ID,
  usersCollectionId: USERS_COLLECTION_ID,
} as const;

export {
  client,
  account,
  databases,
  users,
  DATABASE_ID,
  USERS_COLLECTION_ID,
  ID,
  Query
};