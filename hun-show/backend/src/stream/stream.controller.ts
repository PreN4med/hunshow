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

  @Get(':id/chat')
  async getChatHistory(@Param('id') id: string) {
    return this.streamService.getChatHistory(id);
  }

  @Get(':id/playlist.m3u8')
  async getPlaylist(
    @Param('id') streamId: string,
    @Res() res: express.Response,
  ) {
    const entries = await this.streamService.getPlaylistSegments(streamId);
    if (!entries || entries.length === 0)
      return res.status(404).send('No segments yet');
    if (!publicUrl) return res.status(500).send('R2_PUBLIC_URL not set');

    const baseUrl = publicUrl.endsWith('/')
      ? publicUrl.slice(0, -1)
      : publicUrl;

    const windowSize = 6;
    const window = entries.slice(-windowSize);
    const mediaSequence = Math.max(0, entries.length - windowSize);

    let maxDuration = 2;
    const parsed = window.map((entry) => {
      const pipeIdx = entry.indexOf('|');
      const extinf = entry.slice(0, pipeIdx); // "#EXTINF:2.001600,"
      const file = entry.slice(pipeIdx + 1); // "seg-5.ts"
      const dur = parseFloat(extinf.replace('#EXTINF:', '').replace(',', ''));
      if (!isNaN(dur) && dur > maxDuration) maxDuration = dur;
      return { extinf, file };
    });

    const manifest = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      `#EXT-X-TARGETDURATION:${Math.ceil(maxDuration)}`,
      `#EXT-X-MEDIA-SEQUENCE:${mediaSequence}`,
    ];

    parsed.forEach(({ extinf, file }) => {
      manifest.push(extinf);
      manifest.push(`${baseUrl}/streams/${streamId}/${file}`);
    });

    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.send(manifest.join('\n'));
  }

  @Get(':id')
  async getStream(@Param('id') id: string) {
    return this.streamService.getStream(id);
  }
}
