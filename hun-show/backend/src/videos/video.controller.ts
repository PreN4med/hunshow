import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  UploadedFiles,
  UseInterceptors,
  Body,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { VideosService } from './video.service';

@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Post('upload')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 },
      ],
      {
        limits: { fileSize: 500 * 1024 * 1024 },
      },
    ),
  )
  async uploadVideo(
    @UploadedFiles()
    files: { file?: Express.Multer.File[]; thumbnail?: Express.Multer.File[] },
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('uploadedBy') uploadedBy: string,
  ) {
    if (!files?.file?.[0]) throw new BadRequestException('No file uploaded');
    if (!title) throw new BadRequestException('Title is required');
    if (!uploadedBy) throw new BadRequestException('uploadedBy is required');

    return this.videosService.uploadVideo(
      files.file[0],
      files.thumbnail?.[0] ?? null,
      { title, description, uploadedBy },
    );
  }

  @Get('liked/:userId')
  async getLikedVideos(@Param('userId') userId: string) {
    return this.videosService.getLikedVideosByUser(userId);
  }

  @Get()
  async getAllVideos(@Query('q') query?: string) {
    return this.videosService.findAll(query);
  }

  // Get all videos uploaded by a specific user (for account page)
  @Get('user/:userId')
  async getVideosByUser(@Param('userId') userId: string) {
    return this.videosService.findByUser(userId);
  }

  @Get(':id')
  async getVideo(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.videosService.findOne(id, userId);
  }

  @Post(':id/like')
  async toggleLike(@Param('id') id: string, @Body('userId') userId: string) {
    if (!userId) throw new BadRequestException('userId is required');
    return this.videosService.toggleLike(id, userId);
  }

  @Patch(':id')
  async updateVideo(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Body('title') title?: string,
    @Body('description') description?: string,
  ) {
    if (!userId) throw new BadRequestException('userId is required');
    if (title === undefined && description === undefined) {
      throw new BadRequestException('Nothing to update');
    }
    return this.videosService.updateVideo(id, userId, title, description);
  }

  @Get(':id/url')
  async getVideoUrl(@Param('id') id: string) {
    return this.videosService.getSignedUrl(id);
  }

  @Get(':id/thumbnail')
  async getThumbnailUrl(@Param('id') id: string) {
    return this.videosService.getThumbnailUrl(id);
  }

  // Delete a video - requires userId to verify ownership.
  @Delete(':id')
  async deleteVideo(@Param('id') id: string, @Query('userId') userId: string) {
    if (!userId) throw new BadRequestException('userId is required');
    return this.videosService.delete(id, userId);
  }
}
