import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { R2Service } from '../r2/r2.service';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PassThrough } from 'stream';
import ffmpeg = require('fluent-ffmpeg');

@Injectable()
export class StreamService {
  private activeStreams: Map<
    string,
    { command: ffmpeg.FfmpegCommand; stdin: PassThrough }
  > = new Map();
  private uploadIntervals: Map<string, NodeJS.Timeout> = new Map();
  private uploadedSegments: Map<string, number> = new Map();

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
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

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

    const stdinStream = new PassThrough();
    this.uploadedSegments.set(streamId, -1);

    const command = ffmpeg()
      .input(stdinStream)
      .inputOptions(['-re'])
      .outputOptions([
        '-c:v copy', // Use browser-encoded H.264
        '-c:a aac', // Ensure audio compatibility
        '-f hls',
        '-hls_time 2',
        '-hls_list_size 10',
        '-hls_flags delete_segments',
        '-hls_segment_filename',
        path.join(tmpDir, 'seg-%d.ts'),
      ])
      .output(path.join(tmpDir, 'playlist.m3u8'))
      .on('start', (cmd) =>
        console.log(`FFmpeg started for ${streamId}. Command: ${cmd}`),
      )
      .on('error', (err) => console.error(`FFmpeg error: ${err.message}`));

    command.run();
    this.activeStreams.set(streamId, { command, stdin: stdinStream });
    this.startUploader(streamId, tmpDir);
  }

  async processChunk(streamId: string, chunkBuffer: Buffer): Promise<void> {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.stdin.write(chunkBuffer);
    }
  }

  private startUploader(streamId: string, tmpDir: string) {
    const interval = setInterval(() => {
      (async () => {
        if (!fs.existsSync(tmpDir)) return;

        const files = fs
          .readdirSync(tmpDir)
          .filter((f) => f.endsWith('.ts'))
          .sort((a, b) => {
            return (
              parseInt(a.match(/\d+/)?.[0] || '0') -
              parseInt(b.match(/\d+/)?.[0] || '0')
            );
          });

        const currentMaxSeq = this.uploadedSegments.get(streamId) ?? -1;

        for (const file of files) {
          const seq = parseInt(file.match(/seg-(\d+)\.ts/)?.[1] || '-1');

          if (seq > currentMaxSeq && files.includes(`seg-${seq + 1}.ts`)) {
            const filePath = path.join(tmpDir, file);
            const buffer = fs.readFileSync(filePath);

            await this.r2.uploadBuffer(
              buffer,
              `streams/${streamId}/${file}`,
              'video/mp2t',
            );
            await this.redis.rpush(`playlist:${streamId}`, file);

            this.uploadedSegments.set(streamId, seq);
            try {
              fs.unlinkSync(filePath);
            } catch {
              // Silently ignore cleanup errors
            }
          }
        }
      })().catch((err) => {
        console.error(`Uploader error for stream ${streamId}:`, err);
      });
    }, 1000);

    this.uploadIntervals.set(streamId, interval);
  }

  async endStream(streamId: string): Promise<void> {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.stdin.end();
      stream.command.kill('SIGKILL');
      this.activeStreams.delete(streamId);
    }

    const interval = this.uploadIntervals.get(streamId);
    if (interval) clearInterval(interval);

    await this.redis.hset(`stream:${streamId}`, 'status', 'ended');
    await this.redis.srem('active-streams', streamId);

    setTimeout(() => {
      this.cleanupR2Segments(streamId).catch((err) => {
        console.error(`Cleanup failed for stream ${streamId}:`, err);
      });
    }, 10000); // maybe extend this to 30000 for 30 seconds of delay
  }

  private async cleanupR2Segments(streamId: string): Promise<void> {
    const keys = await this.r2.listFiles(`streams/${streamId}/`);
    for (const key of keys) await this.r2.deleteFile(key);
  }

  // Common methods
  async getPlaylistSegments(id: string) {
    return this.redis.lrange(`playlist:${id}`, 0, -1);
  }
  async getActiveStreams() {
    const ids = await this.redis.smembers('active-streams');
    return ids.length
      ? Promise.all(ids.map((id) => this.redis.hgetall(`stream:${id}`)))
      : [];
  }
  async getStream(id: string) {
    return this.redis.hgetall(`stream:${id}`);
  }
  async addViewer(id: string) {
    return this.redis.hincrby(`stream:${id}`, 'viewerCount', 1);
  }
  async removeViewer(id: string) {
    const c = await this.redis.hincrby(`stream:${id}`, 'viewerCount', -1);
    return Math.max(0, c);
  }
  async saveChatMessage(id: string, msg: any) {
    await this.redis.lpush(`chat:${id}`, JSON.stringify(msg));
    await this.redis.ltrim(`chat:${id}`, 0, 99);
  }
  async getChatHistory(id: string) {
    const msgs = await this.redis.lrange(`chat:${id}`, 0, -1);
    return msgs.map((m) => JSON.parse(m)).reverse();
  }
}
