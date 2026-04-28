/// <reference types="multer" />
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  Res,
  InternalServerErrorException,
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
    try {
      await this.streamService.processChunk(streamId, chunk.buffer);
      return { success: true };
    } catch {
      throw new InternalServerErrorException('Failed to process video chunk');
    }
  }

  @Get('active')
  async getActiveStreams() {
    return this.streamService.getActiveStreams();
  }

  @Get(':id')
  async getStream(@Param('id') id: string) {
    return this.streamService.getStream(id);
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
    if (!segments || segments.length === 0)
      return res.status(404).send('No segments yet');
    if (!publicUrl) return res.status(500).send('R2_PUBLIC_URL not set');

    const baseUrl = publicUrl.endsWith('/')
      ? publicUrl.slice(0, -1)
      : publicUrl;
    const windowSize = 6;
    const window = segments.slice(-windowSize);
    const mediaSequence = Math.max(0, segments.length - windowSize);

    const manifest = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      '#EXT-X-TARGETDURATION:2', // Matches StreamService
      `#EXT-X-MEDIA-SEQUENCE:${mediaSequence}`,
    ];

    window.forEach((seg) => {
      manifest.push('#EXTINF:2.0,');
      manifest.push(`${baseUrl}/streams/${streamId}/${seg}`);
    });

    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.send(manifest.join('\n'));
  }

  @Post(':id/end')
    async endStreamByParam(@Param('id') streamId: string) {
      if (!streamId) {
        throw new BadRequestException('streamId is required');
      }

      await this.streamService.endStream(streamId);

      return {
        success: true,
        message: 'Stream ended',
      };
    }

    @Delete(':id')
    async deleteStream(@Param('id') streamId: string) {
      if (!streamId) {
        throw new BadRequestException('streamId is required');
      }

      await this.streamService.endStream(streamId);

      return {
        success: true,
        message: 'Stream deleted',
      };
    }
}
