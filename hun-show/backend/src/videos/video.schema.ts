import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VideoDocument = Video & Document;

export type VideoStatus = 'processing' | 'ready' | 'failed';

@Schema({ timestamps: true })
export class Video {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop([String])
  genres: string[];

  @Prop()
  thumbnailUrl: string;

  @Prop()
  videoUrl: string;

  @Prop()
  originalVideoUrl: string;

  @Prop({
    enum: ['processing', 'ready', 'failed'],
    default: 'ready',
  })
  status: VideoStatus;

  @Prop()
  processingError: string;

  @Prop([{ language: String, url: String }])
  subtitles: { language: string; url: string }[];

  @Prop({ required: true })
  uploadedBy: string;

  @Prop({ type: [String], default: [] })
  likedBy: string[];

  @Prop({ default: 0 })
  duration: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const VideoSchema = SchemaFactory.createForClass(Video);