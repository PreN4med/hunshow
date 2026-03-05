import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('firstName') firstName: string,
    @Body('lastName') lastName: string,
  ) {
    if (!email || !password || !firstName || !lastName) {
      throw new UnauthorizedException('All fields are required');
    }
    return this.authService.register(email, password, firstName, lastName);
  }

  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    if (!email || !password) {
      throw new UnauthorizedException('Email and password are required');
    }
    return this.authService.login(email, password);
  }

  // GET /auth/me?accessToken=xxx
  @Get('me')
  async getMe(@Query('accessToken') accessToken: string) {
    if (!accessToken)
      throw new UnauthorizedException('Access token is required');
    return this.authService.getUser(accessToken);
  }
}
