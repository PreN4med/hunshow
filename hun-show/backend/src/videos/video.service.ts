import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Video, VideoDocument } from './video.schema';
import { R2Service } from '../r2/r2.service';

@Injectable()
export class VideosService {
  constructor(
    @InjectModel(Video.name) private videoModel: Model<VideoDocument>,
    private readonly r2Service: R2Service,
  ) {}

  async uploadVideo(
    file: Express.Multer.File,
    metadata: {
      title: string;
      description?: string;
      genres?: string[];
      uploadedBy: string;
    },
  ): Promise<VideoDocument> {
    // Upload file to R2
    const videoUrl = await this.r2Service.uploadFile(file, 'videos');

    // Save metadata to MongoDB
    const video = new this.videoModel({
      title: metadata.title,
      description: metadata.description,
      genres: metadata.genres,
      uploadedBy: metadata.uploadedBy,
      videoUrl,
      duration: 0,
    });

    return video.save();
  }

  async findAll(): Promise<VideoDocument[]> {
    return this.videoModel.find().exec();
  }

  async findOne(id: string): Promise<VideoDocument | null> {
    return this.videoModel.findById(id).exec();
  }

  async delete(id: string): Promise<void> {
    const video = await this.videoModel.findById(id);
    if (video) {
      await this.r2Service.deleteFile(video.videoUrl);
      await this.videoModel.findByIdAndDelete(id);
    }
  }
}
