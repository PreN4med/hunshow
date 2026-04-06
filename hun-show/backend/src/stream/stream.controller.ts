/// <reference types="multer" />
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StreamService } from './stream.service';
import { v4 as uuidv4 } from 'uuid';

@Controller('stream')
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  @Post('start')
  async startStream(
    @Body('userId') userId: string,
    @Body('title') title: string,
  ) {
    if (!userId || !title)
      throw new BadRequestException('userId and title are required');
    const streamId = uuidv4();
    await this.streamService.startStream(streamId, userId, title);
    return { streamId };
  }

  @Post('chunk')
  @UseInterceptors(FileInterceptor('chunk'))
  async receiveChunk(
    @UploadedFile() chunk: Express.Multer.File,
    @Body('streamId') streamId: string,
  ) {
    if (!chunk || !streamId)
      throw new BadRequestException('chunk and streamId are required');
    await this.streamService.processChunk(streamId, chunk.buffer);
    return { success: true };
  }

  @Get('active')
  async getActiveStreams() {
    return this.streamService.getActiveStreams();
  }

  @Get(':id')
  async getStream(@Param('id') id: string) {
    return this.streamService.getStream(id);
  }

  @Get(':id/playlist')
  async getPlaylistUrl(@Param('id') id: string) {
    const url = await this.streamService.getPlaylistUrl(id);
    return { url };
  }

  @Get(':id/chat')
  async getChatHistory(@Param('id') id: string) {
    return this.streamService.getChatHistory(id);
  }
}
