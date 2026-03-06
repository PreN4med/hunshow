import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideosService } from './video.service';

@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  // POST /videos/upload
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit for upload
      fileFilter: (req, file, cb) => {
        const allowed = [
          'video/mp4',
          'video/mkv',
          'video/webm',
          'video/quicktime',
        ];
        if (!allowed.includes(file.mimetype)) {
          cb(new BadRequestException('Only video files are allowed'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('genres') genres: string,
    @Body('uploadedBy') uploadedBy: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!title) throw new BadRequestException('Title is required');
    if (!uploadedBy) throw new BadRequestException('uploadedBy is required');

    const genreList = genres ? genres.split(',').map((g) => g.trim()) : [];

    return this.videosService.uploadVideo(file, {
      title,
      description,
      genres: genreList,
      uploadedBy,
    });
  }
}
