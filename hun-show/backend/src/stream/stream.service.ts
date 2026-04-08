import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { R2Service } from '../r2/r2.service';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import ffmpeg = require('fluent-ffmpeg');

@Injectable()
export class StreamService {
  private activeProcesses: Map<string, any> = new Map();
  private chunkBuffers: Map<string, Buffer[]> = new Map();

  constructor(
    private readonly redis: RedisService,
    private readonly r2: R2Service,
  ) {}

  async startStream(
    streamId: string,
    userId: string,
    title: string,
  ): Promise<void> {
    // Create temp directory for HLS segments
    const tmpDir = path.join(os.tmpdir(), `stream-${streamId}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    this.chunkBuffers.set(streamId, []);

    await this.redis.hset(`stream:${streamId}`, {
      streamId,
      userId,
      title,
      startedAt: new Date().toISOString(),
      viewerCount: 0,
      status: 'live',
      tmpDir,
    });
    await this.redis.sadd('active-streams', streamId);
    await this.redis.expire(`stream:${streamId}`, 86400);
  }

  async processChunk(streamId: string, chunkBuffer: Buffer): Promise<void> {
    const streamData = await this.redis.hgetall(`stream:${streamId}`);
    if (!streamData?.tmpDir) return;

    const tmpDir = streamData.tmpDir;
    const inputFile = path.join(tmpDir, 'input.webm');

    // Append chunk to the growing input file
    fs.appendFileSync(inputFile, chunkBuffer);

    // Track chunk count in redis
    await this.redis.hincrby(`stream:${streamId}`, 'chunkCount', 1);
    const chunkCount = parseInt(
      (await this.redis.hget(`stream:${streamId}`, 'chunkCount')) || '0',
    );

    // Process every 3 chunks (~6 seconds of video)
    if (chunkCount % 3 === 0) {
      await this.generateHLSSegment(streamId, tmpDir, inputFile);
    }
  }

  private async generateHLSSegment(
    streamId: string,
    tmpDir: string,
    inputFile: string,
  ): Promise<void> {
    const segmentPattern = path.join(tmpDir, 'segment%03d.ts');
    const playlistFile = path.join(tmpDir, 'playlist.m3u8');

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputFile)
        .outputOptions([
          '-c:v libx264',
          '-preset superfast',
          '-tune zerolatency',
          '-c:a aac',
          '-hls_time 4',
          '-hls_list_size 10',
          '-hls_flags append_list+delete_segments',
          `-hls_segment_filename ${segmentPattern}`,
        ])
        .output(playlistFile)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });

    await this.uploadHLSToR2(streamId, tmpDir);
  }

  private async uploadHLSToR2(streamId: string, tmpDir: string): Promise<void> {
    const files = fs.readdirSync(tmpDir);

    for (const file of files) {
      if (file.endsWith('.ts') || file.endsWith('.m3u8')) {
        const filePath = path.join(tmpDir, file);
        const buffer = fs.readFileSync(filePath);
        const key = `streams/${streamId}/${file}`;

        const mimetype = file.endsWith('.m3u8')
          ? 'application/vnd.apple.mpegurl'
          : 'video/mp2t';

        await this.r2.uploadBuffer(buffer, key, mimetype);
      }
    }
  }

  async getPlaylistUrl(streamId: string): Promise<string> {
    return this.r2.getSignedUrl(`streams/${streamId}/playlist.m3u8`);
  }

  async endStream(streamId: string): Promise<void> {
    await this.redis.hset(`stream:${streamId}`, 'status', 'ended');
    await this.redis.srem('active-streams', streamId);

    // Clean up R2 segments
    await this.cleanupR2Segments(streamId);

    // Clean up temp directory
    const streamData = await this.redis.hgetall(`stream:${streamId}`);
    if (streamData?.tmpDir && fs.existsSync(streamData.tmpDir)) {
      fs.rmSync(streamData.tmpDir, { recursive: true });
    }

    this.chunkBuffers.delete(streamId);
    this.activeProcesses.delete(streamId);
  }

  private async cleanupR2Segments(streamId: string): Promise<void> {
    // List and delete all segments for this stream
    const keys = await this.r2.listFiles(`streams/${streamId}/`);
    for (const key of keys) {
      await this.r2.deleteFile(key);
    }
  }

  async getActiveStreams(): Promise<any[]> {
    const streamIds = await this.redis.smembers('active-streams');
    if (!streamIds.length) return [];
    return Promise.all(
      streamIds.map(async (id) => this.redis.hgetall(`stream:${id}`)),
    );
  }

  async getStream(streamId: string): Promise<any> {
    return this.redis.hgetall(`stream:${streamId}`);
  }

  async addViewer(streamId: string): Promise<number> {
    return this.redis.hincrby(`stream:${streamId}`, 'viewerCount', 1);
  }

  async removeViewer(streamId: string): Promise<number> {
    const count = await this.redis.hincrby(
      `stream:${streamId}`,
      'viewerCount',
      -1,
    );
    return Math.max(0, count);
  }

  async saveChatMessage(streamId: string, message: any): Promise<void> {
    await this.redis.lpush(`chat:${streamId}`, JSON.stringify(message));
    await this.redis.ltrim(`chat:${streamId}`, 0, 99);
    await this.redis.expire(`chat:${streamId}`, 86400);
  }

  async getChatHistory(streamId: string): Promise<any[]> {
    const messages = await this.redis.lrange(`chat:${streamId}`, 0, -1);
    return messages.map((m) => JSON.parse(m)).reverse();
  }
}
