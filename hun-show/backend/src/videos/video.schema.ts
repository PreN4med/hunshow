import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VideoDocument = Video & Document;

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
  videoUrl: string; // MinIO path

  @Prop([{ language: String, url: String }])
  subtitles: { language: string; url: string }[];

  @Prop({ required: true })
  uploadedBy: string; // PostgreSQL user id

  @Prop({ default: 0 })
  duration: number; // in seconds
}

export const VideoSchema = SchemaFactory.createForClass(Video);
