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
import { StreamService } from './stream.service';
import { v4 as uuidv4 } from 'uuid';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('stream')
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  // POST /stream/start
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

  // GET /stream/active
  @Get('active')
  async getActiveStreams() {
    return this.streamService.getActiveStreams();
  }

  // GET /stream/:id
  @Get(':id')
  async getStream(@Param('id') id: string) {
    return this.streamService.getStream(id);
  }

  // GET /stream/:id/chat
  @Get(':id/chat')
  async getChatHistory(@Param('id') id: string) {
    return this.streamService.getChatHistory(id);
  }

  @Post('chunk')
  @UseInterceptors(FileInterceptor('chunk'))
  async receiveChunk(
    @UploadedFile() chunk: Express.Multer.File,
    @Body('streamId') streamId: string,
  ) {
    if (!chunk || !streamId)
      throw new BadRequestException('chunk and streamId are required');
    await this.streamService.processChunk(streamId, chunk);
    return { success: true };
  }
}
