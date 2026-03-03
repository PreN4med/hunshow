import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async sendMagicLink(email: string): Promise<{ message: string }> {
    const { error } = await this.supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.FRONTEND_URL}/auth/verify`,
      },
    });

    if (error) throw new UnauthorizedException(error.message);

    return { message: 'Magic link sent! Check your email.' };
  }

  async verifyAndLogin(
    token: string,
  ): Promise<{ user: User; accessToken: string }> {
    const { data, error } = await this.supabase.auth.verifyOtp({
      token_hash: token,
      type: 'magiclink',
    });

    if (error || !data.user || !data.session)
      throw new UnauthorizedException('Invalid or expired link');

    const supabaseUser = data.user;

    let user = await this.userRepo.findOne({
      where: { supabaseId: supabaseUser.id },
    });

    if (!user) {
      user = this.userRepo.create({
        supabaseId: supabaseUser.id,
        email: supabaseUser.email,
        username: supabaseUser.email?.split('@')[0] ?? supabaseUser.id,
      });
      await this.userRepo.save(user);
    }

    return {
      user,
      accessToken: data.session.access_token,
    };
  }

  async getUser(accessToken: string): Promise<User> {
    const { data, error } = await this.supabase.auth.getUser(accessToken);

    if (error || !data.user) throw new UnauthorizedException('Invalid token');

    const user = await this.userRepo.findOne({
      where: { supabaseId: data.user.id },
    });

    if (!user) throw new UnauthorizedException('User not found');

    return user;
  }
}
