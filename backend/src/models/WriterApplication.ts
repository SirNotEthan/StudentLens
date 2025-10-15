import { databases, DATABASE_ID, ID, Query } from '@/config/appwrite';
import { IWriterApplication, CreateApplicationRequest, UpdateApplicationRequest, ApplicationStatus } from '@/types';
import { AppError } from '@/utils/AppError';
import { appLogger } from '@/services/logger';

const APPLICATIONS_COLLECTION_ID = process.env.APPWRITE_APPLICATIONS_COLLECTION_ID || 'writer_applications';

export class WriterApplication implements IWriterApplication {
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

  constructor(data: any) {
    this.id = data.$id || data.id;
    this.userId = data.userId;
    this.userName = data.userName;
    this.userEmail = data.userEmail;
    this.reason = data.reason;
    this.writingSample = data.writingSample;
    this.status = data.status || 'pending';
    this.submittedAt = data.submittedAt || new Date().toISOString();
    this.reviewedAt = data.reviewedAt;
    this.reviewedBy = data.reviewedBy;
    this.reviewerName = data.reviewerName;
    this.createdAt = data.$createdAt || data.createdAt || new Date().toISOString();
    this.updatedAt = data.$updatedAt || data.updatedAt || new Date().toISOString();
  }

  static async create(applicationData: CreateApplicationRequest, userId: string, userName: string, userEmail: string): Promise<WriterApplication> {
    const startTime = Date.now();

    try {
      appLogger.debug('Creating new writer application', { userId, userName });

      const existingApplication = await this.findByUserId(userId);
      if (existingApplication && existingApplication.status === 'pending') {
        throw AppError.conflict('You already have a pending writer application');
      }

      const now = new Date().toISOString();

      const documentData = {
        userId,
        userName,
        userEmail,
        reason: applicationData.reason,
        writingSample: applicationData.writingSample || '',
        status: 'pending' as ApplicationStatus,
        submittedAt: now,
        reviewedAt: '',
        reviewedBy: '',
        reviewerName: ''
      };

      const document = await databases.createDocument(
        DATABASE_ID,
        APPLICATIONS_COLLECTION_ID,
        ID.unique(),
        documentData
      );

      const duration = Date.now() - startTime;
      appLogger.logPerformance('WriterApplication.create', duration, { applicationId: document.$id });
      appLogger.logDatabase('create', 'writer_applications', { userId }, null);

      return new WriterApplication(document);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('create', 'writer_applications', { userId }, error);
      appLogger.logPerformance('WriterApplication.create', duration, { error: true });
      throw AppError.internal(`Failed to create writer application: ${error.message}`);
    }
  }

  static async findById(id: string): Promise<WriterApplication | null> {
    const startTime = Date.now();

    try {
      appLogger.debug('Finding writer application by ID', { id });

      const document = await databases.getDocument(DATABASE_ID, APPLICATIONS_COLLECTION_ID, id);

      const duration = Date.now() - startTime;
      appLogger.logPerformance('WriterApplication.findById', duration, { id, found: !!document });

      return new WriterApplication(document);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logPerformance('WriterApplication.findById', duration, { id, error: true });

      if (error.code === 404) {
        return null;
      }

      appLogger.logDatabase('findById', 'writer_applications', { id }, error);
      throw AppError.internal(`Failed to find writer application: ${error.message}`);
    }
  }

  static async findByUserId(userId: string): Promise<WriterApplication | null> {
    const startTime = Date.now();

    try {
      appLogger.debug('Finding writer application by user ID', { userId });

      const documents = await databases.listDocuments(
        DATABASE_ID,
        APPLICATIONS_COLLECTION_ID,
        [Query.equal('userId', userId), Query.orderDesc('$createdAt'), Query.limit(1)]
      );

      const duration = Date.now() - startTime;
      appLogger.logPerformance('WriterApplication.findByUserId', duration, { userId, found: documents.documents.length > 0 });

      if (documents.documents.length === 0) {
        return null;
      }

      return new WriterApplication(documents.documents[0]);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('findByUserId', 'writer_applications', { userId }, error);
      appLogger.logPerformance('WriterApplication.findByUserId', duration, { userId, error: true });
      throw AppError.internal(`Failed to find writer application by user ID: ${error.message}`);
    }
  }

  static async findMany(options: {
    status?: ApplicationStatus;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ applications: WriterApplication[]; total: number }> {
    const startTime = Date.now();

    try {
      appLogger.debug('Finding writer applications with options', options);

      const queries: string[] = [];

      if (options.status) {
        queries.push(Query.equal('status', options.status));
      }

      queries.push(Query.orderDesc('$createdAt'));

      if (options.limit) {
        queries.push(Query.limit(options.limit));
      }
      if (options.offset) {
        queries.push(Query.offset(options.offset));
      }

      const documents = await databases.listDocuments(
        DATABASE_ID,
        APPLICATIONS_COLLECTION_ID,
        queries
      );

      const applications = documents.documents.map(doc => new WriterApplication(doc));

      const duration = Date.now() - startTime;
      appLogger.logPerformance('WriterApplication.findMany', duration, {
        count: applications.length,
        total: documents.total
      });

      return {
        applications,
        total: documents.total
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('findMany', 'writer_applications', options, error);
      appLogger.logPerformance('WriterApplication.findMany', duration, { error: true });
      throw AppError.internal(`Failed to find writer applications: ${error.message}`);
    }
  }

  async updateStatus(updateData: UpdateApplicationRequest): Promise<WriterApplication> {
    const startTime = Date.now();

    try {
      appLogger.debug('Updating writer application status', { id: this.id, updateData });

      const now = new Date().toISOString();
      const documentData: any = {
        status: updateData.status,
        reviewedAt: now,
        reviewedBy: updateData.reviewedBy || '',
        reviewerName: updateData.reviewerName || ''
      };

      const document = await databases.updateDocument(
        DATABASE_ID,
        APPLICATIONS_COLLECTION_ID,
        this.id,
        documentData
      );

      const duration = Date.now() - startTime;
      appLogger.logPerformance('WriterApplication.updateStatus', duration, { id: this.id });
      appLogger.logDatabase('updateStatus', 'writer_applications', { id: this.id }, null);

      Object.assign(this, new WriterApplication(document));
      return this;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('updateStatus', 'writer_applications', { id: this.id }, error);
      appLogger.logPerformance('WriterApplication.updateStatus', duration, { id: this.id, error: true });
      throw AppError.internal(`Failed to update writer application status: ${error.message}`);
    }
  }

  async delete(): Promise<void> {
    const startTime = Date.now();

    try {
      appLogger.debug('Deleting writer application', { id: this.id });

      await databases.deleteDocument(DATABASE_ID, APPLICATIONS_COLLECTION_ID, this.id);

      const duration = Date.now() - startTime;
      appLogger.logPerformance('WriterApplication.delete', duration, { id: this.id });
      appLogger.logDatabase('delete', 'writer_applications', { id: this.id }, null);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      appLogger.logDatabase('delete', 'writer_applications', { id: this.id }, error);
      appLogger.logPerformance('WriterApplication.delete', duration, { id: this.id, error: true });
      throw AppError.internal(`Failed to delete writer application: ${error.message}`);
    }
  }

  toJSON(): IWriterApplication {
    return {
      id: this.id,
      userId: this.userId,
      userName: this.userName,
      userEmail: this.userEmail,
      reason: this.reason,
      writingSample: this.writingSample,
      status: this.status,
      submittedAt: this.submittedAt,
      reviewedAt: this.reviewedAt,
      reviewedBy: this.reviewedBy,
      reviewerName: this.reviewerName,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export default WriterApplication;