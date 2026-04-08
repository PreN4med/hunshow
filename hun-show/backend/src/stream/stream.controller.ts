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
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StreamService } from './stream.service';
import { v4 as uuidv4 } from 'uuid';
import * as express from 'express';

const publicUrl = process.env.R2_PUBLIC_URL;

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

  @Get(':id/playlist.m3u8')
  async getPlaylist(
    @Param('id') streamId: string,
    @Res() res: express.Response,
  ) {
    const segments = await this.streamService.getPlaylistSegments(streamId);

    if (!segments || segments.length === 0) {
      return res.status(404).send('Stream not ready');
    }

    const manifest = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      '#EXT-X-TARGETDURATION:5',
      '#EXT-X-MEDIA-SEQUENCE:0',
    ];

    segments.forEach((seg) => {
      manifest.push('#EXTINF:4.0,');
      // IMPORTANT: Use your actual R2 Public URL here
      manifest.push(`${publicUrl}/streams/${streamId}/${seg}`);
    });

    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.set('Access-Control-Allow-Origin', '*');
    return res.send(manifest.join('\n'));
  }
}
