import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaybackProgress } from './playback-progress.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PlaybackProgress])],
  exports: [TypeOrmModule],
})
export class PlaybackModule {}
