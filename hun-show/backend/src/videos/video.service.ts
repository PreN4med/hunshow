import {
  Injectable,
  NotFoundException,
  ForbiddenException,
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
import { transcodeToCompatibleMp4 } from './transcode.util';

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
  ): Promise<VideoDocument> {
    const transcodedBuffer = await transcodeToCompatibleMp4(
      file.buffer,
      file.originalname,
    );
    const transcodedFile: Express.Multer.File = {
      ...file,
      buffer: transcodedBuffer,
      size: transcodedBuffer.length,
      mimetype: 'video/mp4',
      originalname: file.originalname.replace(/\.[^.]+$/, '.mp4'),
    };
    const videoUrl = await this.r2Service.uploadFile(transcodedFile, 'videos');

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
      likedBy: [],
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
        const user = await this.userRepo.findOne({
          where: { id: v.uploadedBy },
        });
        return {
          _id: v._id.toString(),
          title: v.title,
          description: v.description,
          videoUrl: v.videoUrl,
          uploadedBy: v.uploadedBy,
          creatorName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          createdAt: v.createdAt,
          duration: v.duration,
          likes: v.likedBy?.length || 0,
          thumbnailUrl: v.thumbnailUrl,
        };
      }),
    );
  }

  // Get all videos uploaded by a specific user
  async findByUser(userId: string) {
    const videos = await this.videoModel.find({ uploadedBy: userId }).exec();

    return Promise.all(
      videos.map(async (v) => {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        return {
          _id: v._id.toString(),
          title: v.title,
          description: v.description,
          videoUrl: v.videoUrl,
          uploadedBy: v.uploadedBy,
          creatorName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          createdAt: v.createdAt,
          duration: v.duration,
          likes: v.likedBy?.length || 0,
          thumbnailUrl: v.thumbnailUrl,
        };
      }),
    );
  }

  async findOne(
    id: string,
    currentUserId?: string,
  ): Promise<
    | VideoDocument
    | {
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
      }
  > {
    const video = await this.videoModel.findById(id).exec();
    if (!video) throw new NotFoundException('Video not found');

    const user = await this.userRepo.findOne({
      where: { id: video.uploadedBy },
    });
    const creatorName = user ? `${user.firstName} ${user.lastName}` : 'Unknown';
    const likedByCurrentUser = Boolean(
      currentUserId && video.likedBy?.includes(currentUserId),
    );

    return {
      _id: video._id.toString(),
      title: video.title,
      description: video.description,
      videoUrl: video.videoUrl,
      uploadedBy: video.uploadedBy,
      creatorName,
      createdAt: video.createdAt,
      duration: video.duration,
      likes: video.likedBy?.length || 0,
      likedByCurrentUser,
      thumbnailUrl: video.thumbnailUrl,
    };
  }

  async toggleLike(
    id: string,
    userId: string,
  ): Promise<{ likes: number; liked: boolean }> {
    const video = await this.videoModel.findById(id).exec();
    if (!video) throw new NotFoundException('Video not found');

    const likedBy = video.likedBy || [];
    const alreadyLiked = likedBy.includes(userId);
    if (alreadyLiked) {
      video.likedBy = likedBy.filter((id) => id !== userId);
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

  async updateVideo(
    id: string,
    requestingUserId: string,
    title?: string,
    description?: string,
  ) {
    const video = await this.videoModel.findById(id).exec();
    if (!video) throw new NotFoundException('Video not found');

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

  // Delete a video - checks ownership before deleting
  async delete(
    id: string,
    requestingUserId: string,
  ): Promise<{ message: string }> {
    const video = await this.videoModel.findById(id);
    if (!video) throw new NotFoundException('Video not found');

    // Edge case: only the uploader can delete their own video
    if (video.uploadedBy !== requestingUserId) {
      throw new ForbiddenException('You can only delete your own videos');
    }

    await this.r2Service.deleteFile(video.videoUrl);
    if (video.thumbnailUrl) await this.r2Service.deleteFile(video.thumbnailUrl);
    await this.videoModel.findByIdAndDelete(id);
    return { message: 'Video deleted successfully' };
  }

  async getLikedVideosByUser(userId: string) {
    const videos = await this.videoModel.find({ likedBy: userId }).exec();

    return Promise.all(
      videos.map(async (v) => {
        const user = await this.userRepo.findOne({
          where: { id: v.uploadedBy },
        });
        return {
          _id: v._id.toString(),
          title: v.title,
          description: v.description,
          videoUrl: v.videoUrl,
          uploadedBy: v.uploadedBy,
          creatorName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          createdAt: v.createdAt,
          likes: v.likedBy?.length || 0,
          thumbnailUrl: v.thumbnailUrl,
        };
      }),
    );
  }
}
