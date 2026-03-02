import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async register(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ): Promise<Omit<User, 'password_hash'>> {
    // Check if email already exists
    const existing = await this.usersRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    // Generate username from first + last name
    const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}`;

    // Hash the password
    const password_hash = await bcrypt.hash(password, 10);

    // Create and save the user
    const user = this.usersRepository.create({
      username,
      email,
      password_hash,
      first_name: firstName,
      last_name: lastName,
    });

    const saved = await this.usersRepository.save(user);

    // Return user without password_hash
    const { password_hash: _, ...result } = saved;
    return result;
  }
}
