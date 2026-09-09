import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '@/config/database';

const uploadRoot = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
const publicBasePath = '/uploads';

const safeExt = (filename: string): string => {
  const ext = path.extname(filename).toLowerCase();
  return /^[a-z0-9.]+$/.test(ext) ? ext : '';
};

export const saveUploadedFile = async (
  file: Express.Multer.File,
  options: { ownerId?: string; purpose: string }
): Promise<{ id: string; url: string }> => {
  const id = crypto.randomUUID();
  const storedName = `${id}${safeExt(file.originalname)}`;
  const purposeDir = options.purpose.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
  const targetDir = path.join(uploadRoot, purposeDir);
  const targetPath = path.join(targetDir, storedName);

  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(targetPath, file.buffer);

  const publicPath = `${publicBasePath}/${purposeDir}/${storedName}`;

  await prisma.uploadedFile.create({
    data: {
      id,
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      publicPath,
      ownerId: options.ownerId,
      purpose: options.purpose,
    },
  });

  return { id, url: publicPath };
};

export const deleteUploadedFileByPublicPath = async (publicPath?: string): Promise<void> => {
  if (!publicPath || !publicPath.startsWith(`${publicBasePath}/`)) {
    return;
  }

  const relativePath = publicPath.slice(publicBasePath.length + 1);
  const targetPath = path.resolve(uploadRoot, relativePath);
  const rootPath = path.resolve(uploadRoot);

  if (!targetPath.startsWith(rootPath)) {
    return;
  }

  await fs.rm(targetPath, { force: true }).catch(() => undefined);
  await prisma.uploadedFile.deleteMany({ where: { publicPath } });
};

export const uploadsDirectory = uploadRoot;
