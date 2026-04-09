import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { R2Service } from '../r2/r2.service';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import ffmpeg = require('fluent-ffmpeg');

@Injectable()
export class StreamService {
  // Map to track active FFmpeg processes so we can kill them if they leak or overlap
  private activeProcesses: Map<string, ffmpeg.FfmpegCommand> = new Map();
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
      chunkCount: 0,
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
    const chunkCount = await this.redis.hincrby(
      `stream:${streamId}`,
      'chunkCount',
      1,
    );

    // Process every 6 chunks, but ONLY if another process isn't already running for this stream
    if (chunkCount % 6 === 0) {
      if (this.activeProcesses.has(streamId)) {
        console.warn(
          `[Stream] Transcode in progress for ${streamId}. Skipping this cycle to prevent OOM.`,
        );
        return;
      }
      await this.generateHLSSegment(streamId, tmpDir, inputFile);
    }
  }

  private async generateHLSSegment(
    streamId: string,
    tmpDir: string,
    inputFile: string,
  ): Promise<void> {
    const chunkCountStr =
      (await this.redis.hget(`stream:${streamId}`, 'chunkCount')) || '0';
    const segmentName = `seg-${chunkCountStr}.ts`;
    const outputPath = path.join(tmpDir, segmentName);

    const processingFile = path.join(
      tmpDir,
      `processing-${chunkCountStr}.webm`,
    );

    if (!fs.existsSync(inputFile) || fs.statSync(inputFile).size === 0) {
      return;
    }

    fs.renameSync(inputFile, processingFile);

    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg(processingFile)
        .on('start', (cmdLine) => {
          console.log('FFmpeg spawned with command: ' + cmdLine);
          this.activeProcesses.set(streamId, command);
        })
        .on('stderr', (line) => console.log('FFmpeg output: ' + line))
        .outputOptions([
          '-c:v libx264',
          '-preset ultrafast',
          '-tune zerolatency',
          '-pix_fmt yuv420p',
          '-f mpegts',
        ])
        .output(outputPath)
        .on('end', () => {
          this.activeProcesses.delete(streamId);
          resolve();
        })
        .on('error', (err) => {
          this.activeProcesses.delete(streamId);
          console.error(`FFmpeg Error for ${streamId}:`, err.message);
          reject(err);
        });

      command.run();
    });

    // Read and upload the generated segment
    if (fs.existsSync(outputPath)) {
      const buffer = fs.readFileSync(outputPath);
      await this.r2.uploadBuffer(
        buffer,
        `streams/${streamId}/${segmentName}`,
        'video/mp2t',
      );

      await this.redis.rpush(`playlist:${streamId}`, segmentName);

      // Cleanup segment and processing file
      fs.unlinkSync(outputPath);
    }

    if (fs.existsSync(processingFile)) {
      fs.unlinkSync(processingFile);
    }
  }

  async getPlaylistSegments(streamId: string): Promise<string[]> {
    return this.redis.lrange(`playlist:${streamId}`, 0, -1);
  }

  async getPlaylistUrl(streamId: string): Promise<string> {
    return this.r2.getSignedUrl(`streams/${streamId}/playlist.m3u8`);
  }

  async endStream(streamId: string): Promise<void> {
    // Force kill any remaining FFmpeg process
    const activeProc = this.activeProcesses.get(streamId);
    if (activeProc) {
      console.log(`[Cleanup] Killing active FFmpeg process for ${streamId}`);
      try {
        activeProc.kill('SIGKILL');
      } catch (e) {
        console.error('Error killing process:', e);
      }
      this.activeProcesses.delete(streamId);
    }

    await this.redis.hset(`stream:${streamId}`, 'status', 'ended');
    await this.redis.srem('active-streams', streamId);

    // Clean up R2 segments
    await this.cleanupR2Segments(streamId);

    // Clean up temp directory
    const streamData = await this.redis.hgetall(`stream:${streamId}`);
    if (streamData?.tmpDir && fs.existsSync(streamData.tmpDir)) {
      try {
        fs.rmSync(streamData.tmpDir, { recursive: true, force: true });
      } catch (e) {
        console.error('Failed to delete temp directory', e);
      }
    }

    this.chunkBuffers.delete(streamId);
  }

  private async cleanupR2Segments(streamId: string): Promise<void> {
    try {
      const keys = await this.r2.listFiles(`streams/${streamId}/`);
      for (const key of keys) {
        await this.r2.deleteFile(key);
      }
    } catch (e) {
      console.error('R2 Cleanup failed:', e);
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
