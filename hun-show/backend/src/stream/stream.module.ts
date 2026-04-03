import { Module } from '@nestjs/common';
import { StreamGateway } from './stream.gateway';
import { StreamService } from './stream.service';
import { StreamController } from './stream.controller';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [StreamGateway, StreamService],
  controllers: [StreamController],
})
export class StreamModule {}
