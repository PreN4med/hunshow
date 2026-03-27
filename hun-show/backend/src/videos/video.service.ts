import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Video, VideoDocument } from './video.schema';
import { R2Service } from '../r2/r2.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

@Injectable()
export class VideosService {
  constructor(
    @InjectModel(Video.name) private videoModel: Model<VideoDocument>,
    private readonly r2Service: R2Service,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async uploadVideo(
    file: Express.Multer.File,
    metadata: {
      title: string;
      description?: string;
      uploadedBy: string;
    },
  ): Promise<VideoDocument> {
    const videoUrl = await this.r2Service.uploadFile(file, 'videos');

    const video = new this.videoModel({
      title: metadata.title,
      description: metadata.description,
      uploadedBy: metadata.uploadedBy,
      videoUrl,
      duration: 0,
    });

    return video.save();
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
          createdAt: (v as any).createdAt,
          duration: v.duration,
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

  async delete(id: string): Promise<{ message: string }> {
    const video = await this.videoModel.findById(id);
    if (!video) throw new NotFoundException('Video not found');
    await this.r2Service.deleteFile(video.videoUrl);
    await this.videoModel.findByIdAndDelete(id);
    return { message: 'Video deleted successfully' };
  }
}
