import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Video, VideoDocument } from './video.schema';
import { R2Service } from '../r2/r2.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import ffmpeg = require('fluent-ffmpeg');
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';

@Injectable()
export class VideosService {
  constructor(
    @InjectModel(Video.name) private videoModel: Model<VideoDocument>,
    private readonly r2Service: R2Service,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async uploadVideo(
    file: Express.Multer.File,
    thumbnail: Express.Multer.File | null,
    metadata: {
      title: string;
      description?: string;
      uploadedBy: string;
    },
  ): Promise<VideoDocument> {
    const videoUrl = await this.r2Service.uploadFile(file, 'videos');

    let thumbnailUrl: string | undefined;
    if (thumbnail) {
      thumbnailUrl = await this.r2Service.uploadFile(thumbnail, 'thumbnails');
    } else {
      thumbnailUrl = await this.generateThumbnail(file);
    }

    const video = new this.videoModel({
      title: metadata.title,
      description: metadata.description,
      uploadedBy: metadata.uploadedBy,
      videoUrl,
      thumbnailUrl,
      duration: 0,
    });

    return video.save();
  }

  private async generateThumbnail(file: Express.Multer.File): Promise<string> {
    const tmpDir = os.tmpdir();
    const tmpVideo = path.join(tmpDir, `${Date.now()}-input.mp4`);
    const tmpThumb = path.join(tmpDir, `${Date.now()}-thumb.jpg`);

    fs.writeFileSync(tmpVideo, file.buffer);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(tmpVideo)
        .screenshots({
          timestamps: ['00:00:01'],
          filename: path.basename(tmpThumb),
          folder: tmpDir,
          size: '640x360',
        })
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err));
    });

    const thumbBuffer = fs.readFileSync(tmpThumb);
    const thumbFile: Express.Multer.File = {
      buffer: thumbBuffer,
      originalname: `thumb-${Date.now()}.jpg`,
      mimetype: 'image/jpeg',
      size: thumbBuffer.length,
      fieldname: 'thumbnail',
      encoding: '7bit',
      stream: Readable.from(thumbBuffer),
      destination: '',
      filename: '',
      path: '',
    };

    fs.unlinkSync(tmpVideo);
    fs.unlinkSync(tmpThumb);

    return this.r2Service.uploadFile(thumbFile, 'thumbnails');
  }

  async findAll() {
    const videos = await this.videoModel.find().exec();

    return Promise.all(
      videos.map(async (v) => {
        const user = await this.userRepo.findOne({
          where: { id: v.uploadedBy },
        });
        return {
          _id: v._id,
          title: v.title,
          description: v.description,
          videoUrl: v.videoUrl,
          uploadedBy: v.uploadedBy,
          creatorName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          createdAt: v.createdAt,
          duration: v.duration,
          thumbnailUrl: v.thumbnailUrl,
        };
      }),
    );
  }

  async findOne(id: string): Promise<VideoDocument> {
    const video = await this.videoModel.findById(id).exec();
    if (!video) throw new NotFoundException('Video not found');
    return video;
  }

  async getSignedUrl(id: string): Promise<{ url: string }> {
    const video = await this.findOne(id);
    const url = await this.r2Service.getSignedUrl(video.videoUrl);
    return { url };
  }

  async getThumbnailUrl(id: string): Promise<{ url: string } | { url: null }> {
    const video = await this.findOne(id);
    if (!video.thumbnailUrl) return { url: null };
    const url = await this.r2Service.getSignedUrl(video.thumbnailUrl);
    return { url };
  }

  async delete(id: string): Promise<{ message: string }> {
    const video = await this.videoModel.findById(id);
    if (!video) throw new NotFoundException('Video not found');
    await this.r2Service.deleteFile(video.videoUrl);
    if (video.thumbnailUrl) await this.r2Service.deleteFile(video.thumbnailUrl);
    await this.videoModel.findByIdAndDelete(id);
    return { message: 'Video deleted successfully' };
  }
}
