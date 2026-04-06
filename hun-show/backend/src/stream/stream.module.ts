import { Module } from '@nestjs/common';
import { StreamGateway } from './stream.gateway';
import { StreamService } from './stream.service';
import { StreamController } from './stream.controller';
import { RedisModule } from '../redis/redis.module';
import { R2Module } from '../r2/r2.module';

@Module({
  imports: [RedisModule, R2Module],
  providers: [StreamGateway, StreamService],
  controllers: [StreamController],
})
export class StreamModule {}
