import { Controller, Patch, Param, Body, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch(':id')
  async updateName(
    @Param('id') id: string,
    @Body('firstName') firstName: string,
    @Body('lastName') lastName: string,
  ) {
    if (!firstName && !lastName) throw new BadRequestException('Name is required');
    return this.usersService.updateName(id, firstName || '', lastName || '');
  }
}