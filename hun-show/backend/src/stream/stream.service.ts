import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { R2Service } from '../r2/r2.service';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import ffmpeg = require('fluent-ffmpeg');

@Injectable()
export class StreamService {
  private activeProcesses: Map<string, ffmpeg.FfmpegCommand> = new Map();
  private chunkBuffers: Map<string, Buffer[]> = new Map();
  private streamHeaders: Map<string, Buffer> = new Map();
  private pendingSegments: Map<string, boolean> = new Map();

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

    fs.appendFileSync(inputFile, chunkBuffer);

    const chunkCount = await this.redis.hincrby(
      `stream:${streamId}`,
      'chunkCount',
      1,
    );

    if (chunkCount % 3 === 0) {
      if (!this.activeProcesses.has(streamId)) {
        await this.generateHLSSegment(streamId, tmpDir, inputFile);
        // If data accumulated while we were processing, do one more pass
        if (this.pendingSegments.get(streamId)) {
          this.pendingSegments.delete(streamId);
          await this.generateHLSSegment(streamId, tmpDir, inputFile);
        }
      } else {
        this.pendingSegments.set(streamId, true);
      }
    }
  }

  private extractWebMHeader(data: Buffer): Buffer {
    // WebM Cluster EBML ID: 0x1F43B675 — everything before this is the reusable header
    const clusterMarker = Buffer.from([0x1f, 0x43, 0xb6, 0x75]);
    const clusterIdx = data.indexOf(clusterMarker);
    if (clusterIdx > 0) {
      return data.slice(0, clusterIdx);
    }
    return data;
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

    if (!fs.existsSync(inputFile) || fs.statSync(inputFile).size === 0) return;

    const currentData: Buffer = fs.readFileSync(inputFile);

    // Extract and cache only the EBML/Tracks header bytes on first segment
    if (!this.streamHeaders.has(streamId)) {
      const header = this.extractWebMHeader(currentData);
      console.log(
        `[Stream] Cached WebM header for ${streamId}: ${header.length} bytes`,
      );
      this.streamHeaders.set(streamId, header);
    }

    const header = this.streamHeaders.get(streamId)!;

    // Clear input file before processing so new chunks accumulate cleanly
    fs.writeFileSync(inputFile, '');

    // Prepend EBML header so ffmpeg can decode this standalone chunk
    const validWebM: Buffer = Buffer.concat([header, currentData]);
    fs.writeFileSync(processingFile, validWebM);

    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg(processingFile)
        .on('start', (cmdLine) => {
          console.log(`[FFmpeg] ${streamId}: ${cmdLine}`);
          this.activeProcesses.set(streamId, command);
        })
        .outputOptions([
          '-c:v libx264',
          '-preset ultrafast',
          '-tune zerolatency',
          '-pix_fmt yuv420p',
          '-r 30',
          '-g 60',
          '-f mpegts',
        ])
        .output(outputPath)
        .on('end', () => {
          this.activeProcesses.delete(streamId);
          resolve();
        })
        .on('error', (err) => {
          this.activeProcesses.delete(streamId);
          console.error(`[FFmpeg] Error for ${streamId}:`, err.message);
          reject(err);
        });
      command.run();
    });

    if (fs.existsSync(outputPath)) {
      const buffer = fs.readFileSync(outputPath);
      await this.r2.uploadBuffer(
        buffer,
        `streams/${streamId}/${segmentName}`,
        'video/mp2t',
      );
      await this.redis.rpush(`playlist:${streamId}`, segmentName);
      console.log(`[Stream] Uploaded ${segmentName} for ${streamId}`);
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
    await this.cleanupR2Segments(streamId);

    const streamData = await this.redis.hgetall(`stream:${streamId}`);
    if (streamData?.tmpDir && fs.existsSync(streamData.tmpDir)) {
      try {
        fs.rmSync(streamData.tmpDir, { recursive: true, force: true });
      } catch (e) {
        console.error('Failed to delete temp directory', e);
      }
    }

    this.streamHeaders.delete(streamId);
    this.pendingSegments.delete(streamId);
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
