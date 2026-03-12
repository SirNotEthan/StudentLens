import { databases, DATABASE_ID, ID, Query } from '@/config/appwrite';
import { IContactSubmission, ContactSubmissionStatus } from '@/types';
import { AppError } from '@/utils/AppError';
import { appLogger } from '@/services/logger';

const COLLECTION_ID = process.env.APPWRITE_CONTACT_SUBMISSIONS_COLLECTION_ID || 'contact_submissions';

export class ContactSubmission implements IContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactSubmissionStatus;
  ipAddress?: string;
  createdAt: string;
  updatedAt: string;

  constructor(data: any) {
    this.id = data.$id || data.id;
    this.name = data.name;
    this.email = data.email;
    this.subject = data.subject;
    this.message = data.message;
    this.status = data.status || 'new';
    this.ipAddress = data.ipAddress;
    this.createdAt = data.$createdAt || data.createdAt || new Date().toISOString();
    this.updatedAt = data.$updatedAt || data.updatedAt || new Date().toISOString();
  }

  static async create(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
    ipAddress?: string;
  }): Promise<ContactSubmission> {
    try {
      const document = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        {
          name: data.name,
          email: data.email,
          subject: data.subject,
          message: data.message,
          status: 'new' as ContactSubmissionStatus,
          ipAddress: data.ipAddress || ''
        }
      );
      appLogger.logDatabase('create', 'contact_submissions', { email: data.email }, null);
      return new ContactSubmission(document);
    } catch (error: any) {
      appLogger.logDatabase('create', 'contact_submissions', { email: data.email }, error);
      throw AppError.internal(`Failed to save contact submission: ${error.message}`);
    }
  }

  static async findMany(options: {
    status?: ContactSubmissionStatus;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ submissions: ContactSubmission[]; total: number }> {
    try {
      const queries: string[] = [Query.orderDesc('$createdAt')];

      if (options.status) {
        queries.push(Query.equal('status', options.status));
      }
      if (options.limit) {
        queries.push(Query.limit(options.limit));
      }
      if (options.offset) {
        queries.push(Query.offset(options.offset));
      }

      const documents = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, queries);
      return {
        submissions: documents.documents.map(doc => new ContactSubmission(doc)),
        total: documents.total
      };
    } catch (error: any) {
      appLogger.logDatabase('findMany', 'contact_submissions', options, error);
      throw AppError.internal(`Failed to fetch contact submissions: ${error.message}`);
    }
  }

  static async findById(id: string): Promise<ContactSubmission | null> {
    try {
      const document = await databases.getDocument(DATABASE_ID, COLLECTION_ID, id);
      return new ContactSubmission(document);
    } catch (error: any) {
      if (error.code === 404) return null;
      throw AppError.internal(`Failed to find contact submission: ${error.message}`);
    }
  }

  async updateStatus(status: ContactSubmissionStatus): Promise<ContactSubmission> {
    try {
      const document = await databases.updateDocument(DATABASE_ID, COLLECTION_ID, this.id, { status });
      Object.assign(this, new ContactSubmission(document));
      return this;
    } catch (error: any) {
      throw AppError.internal(`Failed to update contact submission: ${error.message}`);
    }
  }

  async delete(): Promise<void> {
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, this.id);
      appLogger.logDatabase('delete', 'contact_submissions', { id: this.id }, null);
    } catch (error: any) {
      appLogger.logDatabase('delete', 'contact_submissions', { id: this.id }, error);
      throw AppError.internal(`Failed to delete contact submission: ${error.message}`);
    }
  }

  toJSON(): IContactSubmission {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      subject: this.subject,
      message: this.message,
      status: this.status,
      ipAddress: this.ipAddress,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export default ContactSubmission;
