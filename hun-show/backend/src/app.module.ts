import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/user.module';
import { WatchpartyModule } from './watchparty/watchparty.module';
import { PlaybackModule } from './playback/playback.module';
import { AuthModule } from './auth/auth.module';
import { VideosModule } from './videos/video.module';
import { R2Module } from './r2/r2.module';
import { CommentsModule } from './comments/comments.module';
import { RatingsModule } from './ratings/ratings.module';
import { StreamModule } from './stream/stream.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('POSTGRES_HOST'),
        port: Number(config.get<number>('POSTGRES_PORT') || 5432),
        username: config.get<string>('POSTGRES_USER'),
        password: config.get<string>('POSTGRES_PASSWORD'),
        database: config.get<string>('POSTGRES_DB'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],

        // Do not auto-sync schema in production.
        synchronize: process.env.NODE_ENV !== 'production',

        // Important for Supabase/Render pooler limits.
        extra: {
          max: 5,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        },
      }),
      inject: [ConfigService],
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),

    UsersModule,
    WatchpartyModule,
    PlaybackModule,
    AuthModule,
    VideosModule,
    R2Module,
    CommentsModule,
    RatingsModule,
    StreamModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}