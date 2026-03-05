import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Watchparty } from './watchparty.entity';
import { WatchpartyMember } from './watchparty-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Watchparty, WatchpartyMember])],
  exports: [TypeOrmModule],
})
export class WatchpartyModule {}
