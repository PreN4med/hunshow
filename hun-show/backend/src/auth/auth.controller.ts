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

  @Post('magic-link')
  async sendMagicLink(@Body('email') email: string) {
    if (!email) throw new UnauthorizedException('Email is required');
    return this.authService.sendMagicLink(email);
  }

  @Get('verify')
  async verify(@Query('token') token: string) {
    if (!token) throw new UnauthorizedException('Token is required');
    return this.authService.verifyAndLogin(token);
  }

  @Get('me')
  async getMe(@Query('accessToken') accessToken: string) {
    if (!accessToken)
      throw new UnauthorizedException('Access token is required');
    return this.authService.getUser(accessToken);
  }
}
