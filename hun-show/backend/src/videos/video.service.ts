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

type VideoProbe = {
  videoCodec: string;
  audioCodec: string | null;
  pixelFormat: string | null;
  formatName: string;
  duration: number;
};

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
    /*
      Hybrid upload flow:

      1. Probe the uploaded video.
      2. If it is already web-safe MP4/H.264/AAC, save it as ready immediately.
      3. If it is not web-safe, save the original, create a processing record,
         return quickly, and convert in the background.

      Important:
      We never save videoUrl as an empty string.
      For processing videos, videoUrl starts as originalVideoUrl.
      When conversion finishes, videoUrl gets replaced by the converted MP4.
    */

    const probe = await this.probeVideo(file).catch((err) => {
      console.warn('Video probe failed:', err?.message || err);
      return null;
    });

    const isWebSafe = probe
      ? this.isWebSafeVideo(probe, file.originalname)
      : false;

    if (isWebSafe) {
      return this.saveReadyVideo(file, thumbnail, metadata, probe);
    }

    return this.saveProcessingVideo(file, thumbnail, metadata, probe);
  }

  private async saveReadyVideo(
    file: Express.Multer.File,
    thumbnail: Express.Multer.File | null,
    metadata: {
      title: string;
      description?: string;
      uploadedBy: string;
    },
    probe: VideoProbe | null,
  ): Promise<{
    _id: string;
    title: string;
    description?: string;
    uploadedBy: string;
    status: string;
    message: string;
  }> {
    const uploadedVideoUrl = await this.r2Service.uploadFile(file, 'videos');

    let thumbnailUrl: string | undefined;

    if (thumbnail) {
      thumbnailUrl = await this.r2Service.uploadFile(thumbnail, 'thumbnails');
    } else {
      thumbnailUrl = await this.generateThumbnail(file).catch((err) => {
        console.warn('Thumbnail generation failed:', err?.message || err);
        return undefined;
      });
    }

    const duration =
      Math.round(probe?.duration || 0) ||
      (await this.getVideoDuration(file).catch((err) => {
        console.warn('Duration detection failed:', err?.message || err);
        return 0;
      }));

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
      status: 'ready',
      message: 'Video uploaded successfully.',
    };
  }

  private async saveProcessingVideo(
    file: Express.Multer.File,
    thumbnail: Express.Multer.File | null,
    metadata: {
      title: string;
      description?: string;
      uploadedBy: string;
    },
    probe: VideoProbe | null,
  ): Promise<{
    _id: string;
    title: string;
    description?: string;
    uploadedBy: string;
    status: string;
    message: string;
  }> {
    const originalVideoUrl = await this.r2Service.uploadFile(
      file,
      'videos-original',
    );

    let thumbnailUrl: string | undefined;

    if (thumbnail) {
      thumbnailUrl = await this.r2Service.uploadFile(thumbnail, 'thumbnails');
    }

    const tmpOriginalPath = this.writeFileToTemp(file, 'background-original');

    const video = new this.videoModel({
      title: metadata.title,
      description: metadata.description,
      uploadedBy: metadata.uploadedBy,

      originalVideoUrl,

      // Important: never leave this empty.
      // This gives the video a fallback URL while the converted version is prepared.
      videoUrl: originalVideoUrl,

      thumbnailUrl,
      likedBy: [],
      duration: Math.round(probe?.duration || 0),

      status: 'processing',
      processingError: '',
    });

    const savedVideo = await video.save();
    const videoId = savedVideo._id.toString();

    setImmediate(() => {
      this.processVideoInBackground(videoId, tmpOriginalPath).catch((err) => {
        console.error(`Background processing failed for ${videoId}:`, err);
      });
    });

    return {
      _id: videoId,
      title: savedVideo.title,
      description: savedVideo.description,
      uploadedBy: savedVideo.uploadedBy,
      status: 'processing',
      message: 'Video uploaded. HunShow is processing it now.',
    };
  }

  private async processVideoInBackground(
    videoId: string,
    inputPath: string,
  ): Promise<void> {
    console.log(`Processing started for video ${videoId}`);

    try {
      await this.videoModel.findByIdAndUpdate(videoId, {
        status: 'processing',
        processingError: '',
      });

      const convertedVideo = await this.transcodePathToWebMp4(inputPath);

      const convertedVideoUrl = await this.r2Service.uploadFile(
        convertedVideo,
        'videos',
      );

      const duration = await this.getVideoDuration(convertedVideo).catch(
        () => 0,
      );

      const currentVideo = await this.videoModel.findById(videoId).exec();

      if (!currentVideo) {
        console.warn(`Video disappeared before processing finished: ${videoId}`);
        return;
      }

      let thumbnailUrl = currentVideo.thumbnailUrl;

      if (!thumbnailUrl) {
        thumbnailUrl = await this.generateThumbnail(convertedVideo).catch(
          (err) => {
            console.warn(
              `Thumbnail generation failed for ${videoId}:`,
              err?.message || err,
            );
            return undefined;
          },
        );
      }

      currentVideo.videoUrl = convertedVideoUrl;
      currentVideo.thumbnailUrl = thumbnailUrl;
      currentVideo.duration = duration || currentVideo.duration || 0;
      currentVideo.status = 'ready';
      currentVideo.processingError = '';

      await currentVideo.save();

      console.log(`Processing finished for video ${videoId}`);
    } catch (err: any) {
      const message = err?.message || 'Video processing failed';

      await this.videoModel.findByIdAndUpdate(videoId, {
        status: 'failed',
        processingError: message,
      });

      console.error(`Processing failed for video ${videoId}:`, message);
    } finally {
      try {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      } catch {
        // Ignore temp cleanup errors
      }
    }
  }

  private async probeVideo(file: Express.Multer.File): Promise<VideoProbe> {
    const tmpPath = this.writeFileToTemp(file, 'probe');

    try {
      return await new Promise<VideoProbe>((resolve, reject) => {
        ffmpeg.ffprobe(tmpPath, (err, metadata) => {
          if (err) {
            reject(err);
            return;
          }

          const streams = metadata.streams || [];

          const videoStream: any = streams.find(
            (stream: any) => stream.codec_type === 'video',
          );

          const audioStream: any = streams.find(
            (stream: any) => stream.codec_type === 'audio',
          );

          if (!videoStream) {
            reject(new Error('No video stream found'));
            return;
          }

          resolve({
            videoCodec: String(videoStream.codec_name || '').toLowerCase(),
            audioCodec: audioStream?.codec_name
              ? String(audioStream.codec_name).toLowerCase()
              : null,
            pixelFormat: videoStream.pix_fmt
              ? String(videoStream.pix_fmt).toLowerCase()
              : null,
            formatName: String(metadata.format?.format_name || '').toLowerCase(),
            duration: Number(metadata.format?.duration || 0),
          });
        });
      });
    } finally {
      try {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      } catch {
        // Ignore temp cleanup errors
      }
    }
  }

  private isWebSafeVideo(probe: VideoProbe, originalName = ''): boolean {
    const ext = path.extname(originalName).toLowerCase();

    const isMp4Container =
      ext === '.mp4' ||
      ext === '.m4v' ||
      probe.formatName.includes('mp4') ||
      probe.formatName.includes('m4v');

    const isH264 = probe.videoCodec === 'h264' || probe.videoCodec === 'avc1';

    const isAacOrNoAudio = !probe.audioCodec || probe.audioCodec === 'aac';

    const isSafePixelFormat =
      !probe.pixelFormat ||
      probe.pixelFormat === 'yuv420p' ||
      probe.pixelFormat === 'yuvj420p';

    return isMp4Container && isH264 && isAacOrNoAudio && isSafePixelFormat;
  }

  private writeFileToTemp(
    file: Express.Multer.File,
    label: string,
  ): string {
    const tmpDir = os.tmpdir();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname || '') || '.upload';
    const tmpPath = path.join(tmpDir, `${unique}-${label}${extension}`);

    fs.writeFileSync(tmpPath, file.buffer);

    return tmpPath;
  }

  private async transcodePathToWebMp4(
    inputPath: string,
  ): Promise<Express.Multer.File> {
    const tmpDir = os.tmpdir();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const outputPath = path.join(tmpDir, `${unique}-web.mp4`);

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
        originalname: `video-${Date.now()}.mp4`,
        mimetype: 'video/mp4',
        size: outputBuffer.length,
        fieldname: 'file',
        encoding: '7bit',
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
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch {
        // Ignore temp cleanup errors
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
        // Ignore temp cleanup errors
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
        // Ignore temp cleanup errors
      }
    }
  }

  private async getCreatorName(userId: string): Promise<string> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
  }

  private getSafeStatus(video: VideoDocument): string {
    if (video.status) {
      return video.status;
    }

    if (video.videoUrl || video.originalVideoUrl) {
      return 'ready';
    }

    return 'failed';
  }

  private getPlayableVideoUrl(video: VideoDocument): string {
    return video.videoUrl || video.originalVideoUrl || '';
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