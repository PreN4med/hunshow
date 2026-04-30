import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Video, VideoSchema } from './video.schema';
import { VideosService } from './video.service';
import { VideosController } from './video.controller';
import { User } from '../users/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Video.name, schema: VideoSchema }]),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [VideosService],
  controllers: [VideosController],
  exports: [VideosService],
})
export class VideosModule {}