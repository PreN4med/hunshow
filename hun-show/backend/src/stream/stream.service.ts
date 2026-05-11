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
  private uploadLocks: Map<string, boolean> = new Map();

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

    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    await this.redis.hset(`stream:${streamId}`, {
      streamId,
      userId,
      title,
      startedAt: new Date().toISOString(),
      viewerCount: 0,
      status: 'live',
      tmpDir,
    });

    // Clear any stale playlist data from a previous stream with this id
    await this.redis.del(`playlist:${streamId}`);
    await this.redis.sadd('active-streams', streamId);

    const stdinStream = new PassThrough();

    this.uploadedSegments.set(streamId, -1);
    this.uploadLocks.set(streamId, false);

    const command = ffmpeg()
      .input(stdinStream)
      .inputFormat('webm')
      .inputOptions([
        '-fflags +genpts',
      ])
      .outputOptions([
        '-c:v libx264',
        '-preset veryfast',
        '-tune zerolatency',
        '-pix_fmt yuv420p',
        '-profile:v baseline',
        '-level 3.1',

        '-g 60',
        '-keyint_min 60',
        '-sc_threshold 0',

        '-c:a aac',
        '-ar 44100',
        '-b:a 128k',

        '-f hls',
        '-hls_time 2',
        '-hls_list_size 10',
        '-hls_segment_filename',
        path.join(tmpDir, 'seg-%d.ts'),
      ])
      .output(path.join(tmpDir, 'playlist.m3u8'))
      .on('start', (commandLine) => {
        console.log(`FFmpeg started for ${streamId}`);
        console.log(commandLine);
      })
      .on('error', (err) => {
        console.error(`FFmpeg error for ${streamId}: ${err.message}`);
      })
      .on('end', () => {
        console.log(`FFmpeg ended for ${streamId}`);
      });

    command.run();

    this.activeStreams.set(streamId, {
      command,
      stdin: stdinStream,
    });

    this.startUploader(streamId, tmpDir);
  }

  async processChunk(streamId: string, chunkBuffer: Buffer): Promise<void> {
    const stream = this.activeStreams.get(streamId);

    if (!stream) {
      console.warn(`Received chunk for inactive stream: ${streamId}`);
      return;
    }

    stream.stdin.write(chunkBuffer);
  }

  private startUploader(streamId: string, tmpDir: string) {
    const interval = setInterval(() => {
      if (this.uploadLocks.get(streamId)) return;
      this.uploadLocks.set(streamId, true);

      (async () => {
        if (!fs.existsSync(tmpDir)) return;

        const m3u8Path = path.join(tmpDir, 'playlist.m3u8');
        if (!fs.existsSync(m3u8Path)) return;

        const m3u8Content = fs.readFileSync(m3u8Path, 'utf8');
        const lines = m3u8Content.split('\n');

        const durationMap = new Map<string, string>();
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('#EXTINF:')) {
            const extinf = lines[i].trim();
            const segLine = lines[i + 1]?.trim();
            if (segLine && segLine.endsWith('.ts')) {
              const segFile = path.basename(segLine);
              durationMap.set(segFile, extinf);
            }
          }
        }

        const files = fs
          .readdirSync(tmpDir)
          .filter((f) => f.endsWith('.ts'))
          .sort(
            (a, b) =>
              parseInt(a.match(/\d+/)?.[0] || '0') -
              parseInt(b.match(/\d+/)?.[0] || '0'),
          );

        const currentMaxSeq = this.uploadedSegments.get(streamId) ?? -1;

        for (const file of files) {
          const seq = parseInt(file.match(/seg-(\d+)\.ts/)?.[1] || '-1');

          if (seq !== currentMaxSeq + 1) continue;

          if (!files.includes(`seg-${seq + 1}.ts`)) continue;

          if (!durationMap.has(file)) continue;

          const filePath = path.join(tmpDir, file);
          const buffer = fs.readFileSync(filePath);

          await this.r2.uploadBuffer(
            buffer,
            `streams/${streamId}/${file}`,
            'video/mp2t',
          );

          const extinf = durationMap.get(file)!;
          await this.redis.rpush(`playlist:${streamId}`, `${extinf}|${file}`);
          this.uploadedSegments.set(streamId, seq);

          try {
            fs.unlinkSync(filePath);
          } catch {
            /* ignore */
          }
        }
      })()
        .catch((err) => console.error(`Uploader error:`, err))
        .finally(() => this.uploadLocks.set(streamId, false));
    }, 1000);

    this.uploadIntervals.set(streamId, interval);
  }

  async endStream(streamId: string): Promise<void> {
    const stream = this.activeStreams.get(streamId);

    if (stream) {
      try {
        stream.stdin.end();
      } catch {
        // Ignore stdin close errors
      }

      try {
        stream.command.kill('SIGKILL');
      } catch {
        // Ignore ffmpeg kill errors
      }

      this.activeStreams.delete(streamId);
    }

    const interval = this.uploadIntervals.get(streamId);
    if (interval) clearInterval(interval);
    this.uploadIntervals.delete(streamId);
    this.uploadLocks.delete(streamId);
    this.uploadedSegments.delete(streamId);

    await this.redis.hset(`stream:${streamId}`, 'status', 'ended');
    await this.redis.srem('active-streams', streamId);

    setTimeout(() => {
      this.cleanupR2Segments(streamId).catch((err) => {
        console.error('Cleanup error:', err);
      });
    }, 10000);
  }

  private async cleanupR2Segments(streamId: string): Promise<void> {
    const keys = await this.r2.listFiles(`streams/${streamId}/`);

    for (const key of keys) {
      await this.r2.deleteFile(key);
    }
  }

  async getPlaylistSegments(streamId: string) {
    return this.redis.lrange(`playlist:${streamId}`, 0, -1);
  }

  async getActiveStreams() {
    const ids = await this.redis.smembers('active-streams');

    if (!ids.length) {
      return [];
    }

    return Promise.all(ids.map((id) => this.redis.hgetall(`stream:${id}`)));
  }

  async getStream(streamId: string) {
    return this.redis.hgetall(`stream:${streamId}`);
  }

  async addViewer(streamId: string) {
    return this.redis.hincrby(`stream:${streamId}`, 'viewerCount', 1);
  }

  async removeViewer(streamId: string) {
    const count = await this.redis.hincrby(
      `stream:${streamId}`,
      'viewerCount',
      -1,
    );

    return Math.max(0, Number(count));
  }

  async saveChatMessage(streamId: string, message: any) {
    await this.redis.lpush(`chat:${streamId}`, JSON.stringify(message));
    await this.redis.ltrim(`chat:${streamId}`, 0, 99);
  }

  async getChatHistory(streamId: string) {
    const messages = await this.redis.lrange(`chat:${streamId}`, 0, -1);

    return messages.map((message) => JSON.parse(message)).reverse();
  }
}