import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const endpointRaw = this.config.get<string>('MINIO_ENDPOINT', 'localhost');
    // strip protocol prefix so Minio client only gets the hostname
    const endpoint = endpointRaw.replace(/^https?:\/\//, '');
    const useSSL = endpointRaw.startsWith('https://') || this.config.get<string>('MINIO_USE_SSL') === 'true';

    this.client = new Minio.Client({
      endPoint: endpoint,
      port: this.config.get<number>('MINIO_PORT', 9000),
      useSSL,
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.config.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
    });

    this.bucket = this.config.get<string>('MINIO_BUCKET', 'natproject-files');
  }

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1');
        this.logger.log(`Created MinIO bucket: ${this.bucket}`);
      }
    } catch (err) {
      this.logger.warn(`MinIO init warning: ${(err as Error).message}`);
    }
  }

  async uploadBuffer(
    objectName: string,
    buffer: Buffer,
    mimeType: string,
    size: number,
  ): Promise<void> {
    await this.client.putObject(this.bucket, objectName, buffer, size, {
      'Content-Type': mimeType,
    });
  }

  async getPresignedUrl(objectName: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, objectName, expirySeconds);
  }

  async deleteObject(objectName: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectName);
  }
}
