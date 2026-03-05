import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SupabaseProvider } from './supabase.provider';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [AuthService, SupabaseProvider],
  controllers: [AuthController],
  exports: [AuthService, SupabaseProvider],
})
export class AuthModule {}
