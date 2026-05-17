import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MinioService } from './minio.service';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async upload(params: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    size: number;
    taskId?: string;
    projectId?: string;
    uploadedBy: string;
  }) {
    const { buffer, originalName, mimeType, size, taskId, projectId, uploadedBy } = params;

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(`File type "${mimeType}" is not allowed`);
    }

    if (size > MAX_FILE_SIZE) {
      throw new BadRequestException('File exceeds the 50 MB size limit');
    }

    if (!taskId && !projectId) {
      throw new BadRequestException('Either taskId or projectId must be provided');
    }

    const ext = originalName.includes('.') ? originalName.split('.').pop() ?? '' : '';
    const objectName = `${taskId ? 'tasks' : 'projects'}/${taskId ?? projectId}/${uuidv4()}${ext ? '.' + ext : ''}`;

    await this.minio.uploadBuffer(objectName, buffer, mimeType, size);

    const attachment = await this.prisma.attachment.create({
      data: {
        name: originalName,
        url: objectName,        // store object path; signed URL generated on read
        mimeType,
        size,
        uploadedBy,
        ...(taskId && { taskId }),
        ...(projectId && { projectId }),
      },
    });

    return { ...attachment, signedUrl: await this.minio.getPresignedUrl(objectName) };
  }

  async findByTask(taskId: string) {
    const attachments = await this.prisma.attachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(
      attachments.map(async (a) => ({
        ...a,
        signedUrl: await this.minio.getPresignedUrl(a.url),
      })),
    );
  }

  async findByProject(projectId: string) {
    const attachments = await this.prisma.attachment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(
      attachments.map(async (a) => ({
        ...a,
        signedUrl: await this.minio.getPresignedUrl(a.url),
      })),
    );
  }

  async getSignedUrl(id: string) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    if (!attachment) throw new NotFoundException('Attachment not found');
    const signedUrl = await this.minio.getPresignedUrl(attachment.url);
    return { ...attachment, signedUrl };
  }

  async delete(id: string, userId: string) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    if (!attachment) throw new NotFoundException('Attachment not found');
    if (attachment.uploadedBy !== userId) {
      throw new ForbiddenException('You can only delete your own attachments');
    }
    await this.minio.deleteObject(attachment.url);
    await this.prisma.attachment.delete({ where: { id } });
    return { message: 'Attachment deleted' };
  }
}
