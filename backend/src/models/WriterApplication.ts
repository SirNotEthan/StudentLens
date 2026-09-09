import crypto from 'crypto';
import { prisma } from '@/config/database';
import { IWriterApplication, CreateApplicationRequest, UpdateApplicationRequest, ApplicationStatus } from '@/types';
import { AppError } from '@/utils/AppError';

const toIso = (value?: Date | string | null): string | undefined => value ? (value instanceof Date ? value.toISOString() : new Date(value).toISOString()) : undefined;

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
    this.writingSample = data.writingSample || undefined;
    this.status = data.status || 'pending';
    this.submittedAt = toIso(data.submittedAt) || new Date().toISOString();
    this.reviewedAt = toIso(data.reviewedAt);
    this.reviewedBy = data.reviewedBy || undefined;
    this.reviewerName = data.reviewerName || undefined;
    this.createdAt = data.$createdAt || toIso(data.createdAt) || new Date().toISOString();
    this.updatedAt = data.$updatedAt || toIso(data.updatedAt) || new Date().toISOString();
  }

  static async create(applicationData: CreateApplicationRequest, userId: string, userName: string, userEmail: string): Promise<WriterApplication> {
    const existing = await this.findByUserId(userId);
    if (existing && existing.status === 'pending') throw AppError.conflict('You already have a pending writer application');
    const app = await prisma.writerApplication.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        userName,
        userEmail,
        reason: applicationData.reason,
        writingSample: applicationData.writingSample || undefined,
      },
    });
    return new WriterApplication(app);
  }

  static async findById(id: string): Promise<WriterApplication | null> {
    const app = await prisma.writerApplication.findUnique({ where: { id } });
    return app ? new WriterApplication(app) : null;
  }

  static async findByUserId(userId: string): Promise<WriterApplication | null> {
    const app = await prisma.writerApplication.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return app ? new WriterApplication(app) : null;
  }

  static async findMany(options: { status?: ApplicationStatus; limit?: number; offset?: number } = {}): Promise<{ applications: WriterApplication[]; total: number }> {
    const where: any = {};
    if (options.status) where.status = options.status;
    const [applications, total] = await prisma.$transaction([
      prisma.writerApplication.findMany({ where, orderBy: { createdAt: 'desc' }, take: options.limit, skip: options.offset }),
      prisma.writerApplication.count({ where }),
    ]);
    return { applications: applications.map(item => new WriterApplication(item)), total };
  }

  async updateStatus(updateData: UpdateApplicationRequest): Promise<WriterApplication> {
    const updated = await prisma.writerApplication.update({
      where: { id: this.id },
      data: {
        status: updateData.status as any,
        reviewedAt: new Date(),
        reviewedBy: updateData.reviewedBy || undefined,
        reviewerName: updateData.reviewerName || undefined,
      },
    });
    Object.assign(this, new WriterApplication(updated));
    return this;
  }

  async delete(): Promise<void> {
    await prisma.writerApplication.delete({ where: { id: this.id } });
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
