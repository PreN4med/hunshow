import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log('Redis connecting to:', redisUrl.substring(0, 30) + '...');
    super(redisUrl, {
      tls: redisUrl.startsWith('rediss://') ? {} : undefined,
    });
  }

  onModuleDestroy() {
    this.disconnect();
  }
}
