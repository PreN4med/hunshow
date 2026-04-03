/// <reference types="multer" />

import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class StreamService {
  constructor(private readonly redis: RedisService) {}

  // Start a new stream
  async startStream(
    streamId: string,
    userId: string,
    title: string,
  ): Promise<void> {
    await this.redis.hset(`stream:${streamId}`, {
      streamId,
      userId,
      title,
      startedAt: new Date().toISOString(),
      viewerCount: 0,
      status: 'live',
    });
    await this.redis.sadd('active-streams', streamId);
    await this.redis.expire(`stream:${streamId}`, 86400); // 24hr expiry
  }

  // Get all active streams
  async getActiveStreams(): Promise<any[]> {
    const streamIds = await this.redis.smembers('active-streams');
    if (!streamIds.length) return [];

    return Promise.all(
      streamIds.map(async (id) => {
        const stream = await this.redis.hgetall(`stream:${id}`);
        return stream;
      }),
    );
  }

  // Get a single stream
  async getStream(streamId: string): Promise<any> {
    return this.redis.hgetall(`stream:${streamId}`);
  }

  // End a stream
  async endStream(streamId: string): Promise<void> {
    await this.redis.hset(`stream:${streamId}`, 'status', 'ended');
    await this.redis.srem('active-streams', streamId);
  }

  // Add a viewer
  async addViewer(streamId: string): Promise<number> {
    const count = await this.redis.hincrby(
      `stream:${streamId}`,
      'viewerCount',
      1,
    );
    return count;
  }

  // Remove a viewer
  async removeViewer(streamId: string): Promise<number> {
    const count = await this.redis.hincrby(
      `stream:${streamId}`,
      'viewerCount',
      -1,
    );
    return Math.max(0, count);
  }

  // Save chat message
  async saveChatMessage(streamId: string, message: any): Promise<void> {
    await this.redis.lpush(`chat:${streamId}`, JSON.stringify(message));
    await this.redis.ltrim(`chat:${streamId}`, 0, 99);
    await this.redis.expire(`chat:${streamId}`, 86400);
  }

  // Get chat history
  async getChatHistory(streamId: string): Promise<any[]> {
    const messages = await this.redis.lrange(`chat:${streamId}`, 0, -1);
    return messages.map((m) => JSON.parse(m)).reverse();
  }

  async processChunk(
    streamId: string,
    chunk: Express.Multer.File,
  ): Promise<void> {
    console.log(
      `Received chunk for stream ${streamId}, size: ${chunk.size} bytes`,
    );
  }
}
