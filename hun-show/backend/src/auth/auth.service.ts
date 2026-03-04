import {
  Injectable,
  Inject,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
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

  // Register: create user in Supabase Auth + save to PostgreSQL
  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ): Promise<{ message: string }> {
    // Check if user already exists in our DB
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');

    // Create user in Supabase Auth (sends confirmation email automatically)
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { firstName, lastName },
        emailRedirectTo: `${process.env.FRONTEND_URL}/auth/verify`,
      },
    });

    if (error) throw new ConflictException(error.message);

    // Save user in our PostgreSQL DB
    const user = this.userRepo.create({
      supabaseId: data.user!.id,
      email,
      firstName,
      lastName,
    });
    await this.userRepo.save(user);

    return {
      message:
        'Registration successful! Please check your email to confirm your account.',
    };
  }

  // Login: verify credentials via Supabase, return access token
  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; user: User }> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new UnauthorizedException('Invalid email or password');

    if (!data.user.email_confirmed_at) {
      throw new UnauthorizedException(
        'Please confirm your email before logging in',
      );
    }

    const user = await this.userRepo.findOne({
      where: { supabaseId: data.user.id },
    });

    if (!user) throw new UnauthorizedException('User not found');

    return {
      accessToken: data.session.access_token,
      user,
    };
  }

  // Get current user from access token
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
