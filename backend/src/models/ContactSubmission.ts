import crypto from 'crypto';
import { prisma } from '@/config/database';
import { IContactSubmission, ContactSubmissionStatus } from '@/types';

const toIso = (value?: Date | string | null): string => value ? (value instanceof Date ? value.toISOString() : new Date(value).toISOString()) : new Date().toISOString();

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
    this.ipAddress = data.ipAddress || undefined;
    this.createdAt = data.$createdAt || toIso(data.createdAt);
    this.updatedAt = data.$updatedAt || toIso(data.updatedAt);
  }

  static async create(data: { name: string; email: string; subject: string; message: string; ipAddress?: string }): Promise<ContactSubmission> {
    const submission = await prisma.contactSubmission.create({
      data: {
        id: crypto.randomUUID(),
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
        ipAddress: data.ipAddress,
      },
    });
    return new ContactSubmission(submission);
  }

  static async findMany(options: { status?: ContactSubmissionStatus; limit?: number; offset?: number } = {}): Promise<{ submissions: ContactSubmission[]; total: number }> {
    const where: any = {};
    if (options.status) where.status = options.status;
    const [submissions, total] = await prisma.$transaction([
      prisma.contactSubmission.findMany({ where, orderBy: { createdAt: 'desc' }, take: options.limit, skip: options.offset }),
      prisma.contactSubmission.count({ where }),
    ]);
    return { submissions: submissions.map(item => new ContactSubmission(item)), total };
  }

  static async findById(id: string): Promise<ContactSubmission | null> {
    const submission = await prisma.contactSubmission.findUnique({ where: { id } });
    return submission ? new ContactSubmission(submission) : null;
  }

  async updateStatus(status: ContactSubmissionStatus): Promise<ContactSubmission> {
    const updated = await prisma.contactSubmission.update({ where: { id: this.id }, data: { status: status as any } });
    Object.assign(this, new ContactSubmission(updated));
    return this;
  }

  async delete(): Promise<void> {
    await prisma.contactSubmission.delete({ where: { id: this.id } });
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
