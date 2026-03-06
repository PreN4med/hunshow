import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class R2Service {
  private client: S3Client;
  private bucket: string;
  private readonly MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB limit on upload

  constructor(private config: ConfigService) {
    this.bucket = this.config.get<string>('R2_BUCKET')!;
    this.client = new S3Client({
      region: 'auto',
      endpoint: this.config.get<string>('R2_ENDPOINT')!,
      credentials: {
        accessKeyId: this.config.get<string>('R2_ACCESS_KEY')!,
        secretAccessKey: this.config.get<string>('R2_SECRET_KEY')!,
      },
    });
  }

  // Upload a file to R2
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'videos',
  ): Promise<string> {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is 500MB`);
    }

    const key = `${folder}/${Date.now()}-${file.originalname}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return key;
  }

  // Get a temporary signed URL to access a file (expires in 1 hour)
  async getSignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  // Delete a file from R2
  async deleteFile(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}
