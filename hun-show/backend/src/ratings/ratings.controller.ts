import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { RatingsService } from './ratings.service';

@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  // POST /ratings — submit or update a rating
  @Post()
  async rateVideo(
    @Body() body: { userId: string; videoId: string; rating: number },
  ) {
    return this.ratingsService.rateVideo(
      body.userId,
      body.videoId,
      body.rating,
    );
  }

  // GET /ratings/video/:videoId — get average rating for a video
  @Get('video/:videoId')
  async getAverageRating(@Param('videoId') videoId: string) {
    return this.ratingsService.getAverageRating(videoId);
  }

  // GET /ratings/user/:userId — get all ratings by a user (for profile page)
  @Get('user/:userId')
  async getRatingsByUser(@Param('userId') userId: string) {
    return this.ratingsService.getRatingsByUser(userId);
  }

  // GET /ratings/user/:userId/video/:videoId — get a user's rating for a specific video
  @Get('user/:userId/video/:videoId')
  async getUserRatingForVideo(
    @Param('userId') userId: string,
    @Param('videoId') videoId: string,
  ) {
    return this.ratingsService.getUserRatingForVideo(userId, videoId);
  }
}
