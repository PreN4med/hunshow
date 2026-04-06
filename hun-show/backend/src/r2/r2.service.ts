import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class R2Service {
  private client: S3Client;
  private bucket: string;
  private readonly MAX_FILE_SIZE = 500 * 1024 * 1024;

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

  async getSignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  async listFiles(prefix: string): Promise<string[]> {
    const response = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      }),
    );
    return (response.Contents || []).map((obj) => obj.Key!);
  }
}
