import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/user.module';
import { SessionsModule } from './sessions/session.module';
import { WatchpartyModule } from './watchparty/watchparty.module';
import { PlaybackModule } from './playback/playback.module';

@Module({
  imports: [
    // Loads .env globally
    ConfigModule.forRoot({ isGlobal: true }),

    // Redis placeholder
    RedisModule,

    // PostgreSQL, for users, sessions, watchparty metadata, playback progress
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('POSTGRES_HOST'),
        port: config.get<number>('POSTGRES_PORT'),
        username: config.get<string>('POSTGRES_USER'),
        password: config.get<string>('POSTGRES_PASSWORD'),
        database: config.get<string>('POSTGRES_DB'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // Auto-creates tables from entities, REMEMBER TO SET TO FALSE IN WHEN IN PROD
      }),
      inject: [ConfigService],
    }),

    // MongoDB, for video metadata, genres, subtitles
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),

    UsersModule,
    SessionsModule,
    WatchpartyModule,
    PlaybackModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
