import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
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

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
  ): Promise<{
    _id: string;
    title: string;
    description?: string;
    uploadedBy: string;
    status: string;
    message: string;
  }> {

    const webSafeVideo = await this.transcodeToWebMp4(file);

    const uploadedVideoUrl = await this.r2Service.uploadFile(
      webSafeVideo,
      'videos',
    );

    let thumbnailUrl: string | undefined;

    if (thumbnail) {
      thumbnailUrl = await this.r2Service.uploadFile(thumbnail, 'thumbnails');
    } else {
      thumbnailUrl = await this.generateThumbnail(webSafeVideo).catch((err) => {
        console.warn('Thumbnail generation failed:', err?.message || err);
        return undefined;
      });
    }

    const duration = await this.getVideoDuration(webSafeVideo).catch((err) => {
      console.warn('Duration detection failed:', err?.message || err);
      return 0;
    });

    const video = new this.videoModel({
      title: metadata.title,
      description: metadata.description,
      uploadedBy: metadata.uploadedBy,
      originalVideoUrl: uploadedVideoUrl,
      videoUrl: uploadedVideoUrl,

      thumbnailUrl,
      likedBy: [],
      duration,

      status: 'ready',
      processingError: '',
    });

    const savedVideo = await video.save();

    return {
      _id: savedVideo._id.toString(),
      title: savedVideo.title,
      description: savedVideo.description,
      uploadedBy: savedVideo.uploadedBy,
      status: savedVideo.status || 'ready',
      message: 'Video uploaded successfully.',
    };
  }

  private async transcodeToWebMp4(
    file: Express.Multer.File,
  ): Promise<Express.Multer.File> {
    const tmpDir = os.tmpdir();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    const inputExtension = path.extname(file.originalname || '') || '.mp4';
    const inputPath = path.join(tmpDir, `${unique}-input${inputExtension}`);
    const outputPath = path.join(tmpDir, `${unique}-web.mp4`);

    fs.writeFileSync(inputPath, file.buffer);

    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .outputOptions([
            '-c:v libx264',
            '-preset veryfast',
            '-profile:v baseline',
            '-level 3.1',
            '-pix_fmt yuv420p',

            '-c:a aac',
            '-b:a 128k',
            '-ar 44100',

            '-movflags +faststart',
          ])
          .format('mp4')
          .save(outputPath)
          .on('end', () => resolve())
          .on('error', (err: Error) => reject(err));
      });

      const outputBuffer = fs.readFileSync(outputPath);

      return {
        buffer: outputBuffer,
        originalname: `${path.parse(file.originalname || 'video').name}.mp4`,
        mimetype: 'video/mp4',
        size: outputBuffer.length,
        fieldname: file.fieldname,
        encoding: file.encoding,
        stream: Readable.from(outputBuffer),
        destination: '',
        filename: '',
        path: '',
      };
    } catch (err: any) {
      throw new BadRequestException(
        `Video conversion failed: ${err?.message || 'Unsupported video file'}`,
      );
    } finally {
      try {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch {
        // Ignore temporary file cleanup errors
      }
    }
  }

  private async generateThumbnail(file: Express.Multer.File): Promise<string> {
    const tmpDir = os.tmpdir();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    const tmpVideo = path.join(tmpDir, `${unique}-input.mp4`);
    const tmpThumb = path.join(tmpDir, `${unique}-thumb.jpg`);

    fs.writeFileSync(tmpVideo, file.buffer);

    try {
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

      return this.r2Service.uploadFile(thumbFile, 'thumbnails');
    } finally {
      try {
        if (fs.existsSync(tmpVideo)) fs.unlinkSync(tmpVideo);
        if (fs.existsSync(tmpThumb)) fs.unlinkSync(tmpThumb);
      } catch {
        // Ignore temporary file cleanup errors
      }
    }
  }

  private async getVideoDuration(file: Express.Multer.File): Promise<number> {
    const tmpDir = os.tmpdir();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const tmpVideo = path.join(tmpDir, `${unique}-duration.mp4`);

    fs.writeFileSync(tmpVideo, file.buffer);

    try {
      return await new Promise<number>((resolve, reject) => {
        ffmpeg.ffprobe(tmpVideo, (err, metadata) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(Math.round(metadata.format.duration || 0));
        });
      });
    } finally {
      try {
        if (fs.existsSync(tmpVideo)) fs.unlinkSync(tmpVideo);
      } catch {
        // Ignore temporary file cleanup errors
      }
    }
  }

  private async getCreatorName(userId: string): Promise<string> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
  }

  private getPlayableVideoUrl(video: VideoDocument): string {
    return video.videoUrl || video.originalVideoUrl || '';
  }

  private getSafeStatus(video: VideoDocument): string {
    if (video.status) return video.status;

    if (this.getPlayableVideoUrl(video)) {
      return 'ready';
    }

    return 'failed';
  }

  async findAll(search?: string) {
    const filter: Record<string, any> = {};

    if (search?.trim()) {
      const cleaned = search.trim();
      const regex = new RegExp(escapeRegex(cleaned), 'i');

      const matchedUsers = await this.userRepo
        .createQueryBuilder('user')
        .where('LOWER(user.firstName) LIKE LOWER(:q)', { q: `%${cleaned}%` })
        .orWhere('LOWER(user.lastName) LIKE LOWER(:q)', { q: `%${cleaned}%` })
        .getMany();

      const creatorIds = matchedUsers.map((user) => user.id);

      filter.$or = [
        { title: regex },
        { description: regex },
        { genres: { $elemMatch: { $regex: cleaned, $options: 'i' } } },
      ];

      if (creatorIds.length) {
        filter.$or.push({ uploadedBy: { $in: creatorIds } });
      }
    }

    const videos = await this.videoModel.find(filter).exec();

    return Promise.all(
      videos.map(async (v) => {
        const creatorName = await this.getCreatorName(v.uploadedBy);

        return {
          _id: v._id.toString(),
          title: v.title,
          description: v.description,
          videoUrl: this.getPlayableVideoUrl(v),
          uploadedBy: v.uploadedBy,
          creatorName,
          createdAt: v.createdAt,
          duration: v.duration || 0,
          likes: v.likedBy?.length || 0,
          thumbnailUrl: v.thumbnailUrl,
          status: this.getSafeStatus(v),
          processingError: v.processingError || '',
        };
      }),
    );
  }

  async findByUser(userId: string) {
    const videos = await this.videoModel.find({ uploadedBy: userId }).exec();

    return Promise.all(
      videos.map(async (v) => {
        const creatorName = await this.getCreatorName(v.uploadedBy);

        return {
          _id: v._id.toString(),
          title: v.title,
          description: v.description,
          videoUrl: this.getPlayableVideoUrl(v),
          uploadedBy: v.uploadedBy,
          creatorName,
          createdAt: v.createdAt,
          duration: v.duration || 0,
          likes: v.likedBy?.length || 0,
          thumbnailUrl: v.thumbnailUrl,
          status: this.getSafeStatus(v),
          processingError: v.processingError || '',
        };
      }),
    );
  }

  async findOne(
    id: string,
    currentUserId?: string,
  ): Promise<{
    _id: string;
    title: string;
    description?: string;
    videoUrl: string;
    uploadedBy: string;
    creatorName: string;
    createdAt?: Date;
    duration: number;
    likes: number;
    likedByCurrentUser: boolean;
    thumbnailUrl?: string;
    status: string;
    processingError?: string;
  }> {
    const video = await this.videoModel.findById(id).exec();

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const creatorName = await this.getCreatorName(video.uploadedBy);

    const likedByCurrentUser = Boolean(
      currentUserId && video.likedBy?.includes(currentUserId),
    );

    return {
      _id: video._id.toString(),
      title: video.title,
      description: video.description,
      videoUrl: this.getPlayableVideoUrl(video),
      uploadedBy: video.uploadedBy,
      creatorName,
      createdAt: video.createdAt,
      duration: video.duration || 0,
      likes: video.likedBy?.length || 0,
      likedByCurrentUser,
      thumbnailUrl: video.thumbnailUrl,
      status: this.getSafeStatus(video),
      processingError: video.processingError || '',
    };
  }

  async getProcessingStatus(id: string): Promise<{
    _id: string;
    status: string;
    processingError?: string;
  }> {
    const video = await this.videoModel.findById(id).exec();

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    return {
      _id: video._id.toString(),
      status: this.getSafeStatus(video),
      processingError: video.processingError || '',
    };
  }

  async toggleLike(
    id: string,
    userId: string,
  ): Promise<{ likes: number; liked: boolean }> {
    const video = await this.videoModel.findById(id).exec();

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const likedBy = video.likedBy || [];
    const alreadyLiked = likedBy.includes(userId);

    if (alreadyLiked) {
      video.likedBy = likedBy.filter((likedUserId) => likedUserId !== userId);
    } else {
      video.likedBy = [...likedBy, userId];
    }

    await video.save();

    return {
      likes: video.likedBy.length,
      liked: !alreadyLiked,
    };
  }

  async getSignedUrl(id: string): Promise<{ url: string }> {
    const video = await this.videoModel.findById(id).exec();

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const playableUrl = this.getPlayableVideoUrl(video);

    if (!playableUrl) {
      throw new BadRequestException('Video file is not ready');
    }

    if (!video.videoUrl && video.originalVideoUrl) {
      video.videoUrl = video.originalVideoUrl;
      video.status = 'ready';
      video.processingError = '';
      await video.save();
    }

    const url = await this.r2Service.getSignedUrl(playableUrl);

    return { url };
  }

  async getThumbnailUrl(id: string): Promise<{ url: string } | { url: null }> {
    const video = await this.videoModel.findById(id).exec();

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (!video.thumbnailUrl) {
      return { url: null };
    }

    const url = await this.r2Service.getSignedUrl(video.thumbnailUrl);

    return { url };
  }

  async updateVideo(
    id: string,
    requestingUserId: string,
    title?: string,
    description?: string,
  ) {
    const video = await this.videoModel.findById(id).exec();

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (video.uploadedBy !== requestingUserId) {
      throw new ForbiddenException('You can only edit your own videos');
    }

    if (title !== undefined) {
      video.title = title;
    }

    if (description !== undefined) {
      video.description = description;
    }

    await video.save();

    return this.findOne(id, requestingUserId);
  }

  async delete(
    id: string,
    requestingUserId: string,
  ): Promise<{ message: string }> {
    const video = await this.videoModel.findById(id);

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (video.uploadedBy !== requestingUserId) {
      throw new ForbiddenException('You can only delete your own videos');
    }

    const keysToDelete = new Set<string>();

    if (video.videoUrl) {
      keysToDelete.add(video.videoUrl);
    }

    if (video.originalVideoUrl) {
      keysToDelete.add(video.originalVideoUrl);
    }

    if (video.thumbnailUrl) {
      keysToDelete.add(video.thumbnailUrl);
    }

    for (const key of keysToDelete) {
      await this.r2Service.deleteFile(key).catch(() => {
        console.warn(`Could not delete R2 file: ${key}`);
      });
    }

    await this.videoModel.findByIdAndDelete(id);

    return { message: 'Video deleted successfully' };
  }

  async getLikedVideosByUser(userId: string) {
    const videos = await this.videoModel.find({ likedBy: userId }).exec();

    return Promise.all(
      videos.map(async (v) => {
        const creatorName = await this.getCreatorName(v.uploadedBy);

        return {
          _id: v._id.toString(),
          title: v.title,
          description: v.description,
          videoUrl: this.getPlayableVideoUrl(v),
          uploadedBy: v.uploadedBy,
          creatorName,
          createdAt: v.createdAt,
          duration: v.duration || 0,
          likes: v.likedBy?.length || 0,
          thumbnailUrl: v.thumbnailUrl,
          status: this.getSafeStatus(v),
          processingError: v.processingError || '',
        };
      }),
    );
  }
}