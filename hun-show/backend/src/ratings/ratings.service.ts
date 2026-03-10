import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rating } from './rating.entity';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(Rating)
    private ratingsRepository: Repository<Rating>,
  ) {}

  // Submit or update a rating for a video
  async rateVideo(
    userId: string,
    videoId: string,
    rating: number,
  ): Promise<Rating> {
    // Check if user already rated this video
    const existing = await this.ratingsRepository.findOne({
      where: { user_id: userId, video_id: videoId },
    });

    if (existing) {
      // Update the existing rating
      existing.rating = rating;
      return this.ratingsRepository.save(existing);
    }

    // Create a new rating
    const newRating = this.ratingsRepository.create({
      user_id: userId,
      video_id: videoId,
      rating,
    });
    return this.ratingsRepository.save(newRating);
  }

  // Get the average rating for a video
  async getAverageRating(
    videoId: string,
  ): Promise<{ average: number; total: number }> {
    const result = await this.ratingsRepository
      .createQueryBuilder('rating')
      .select('AVG(rating.rating)', 'average')
      .addSelect('COUNT(rating.id)', 'total')
      .where('rating.video_id = :videoId', { videoId })
      .getRawOne();

    return {
      average: parseFloat(String(result.average)) || 0,
      total: parseInt(String(result.total)) || 0,
    };
  }

  // Get all ratings by a specific user (for profile page)
  async getRatingsByUser(userId: string): Promise<Rating[]> {
    return this.ratingsRepository.find({
      where: { user_id: userId },
      order: { updated_at: 'DESC' },
    });
  }

  // Get a specific user's rating for a specific video
  async getUserRatingForVideo(
    userId: string,
    videoId: string,
  ): Promise<Rating | null> {
    return this.ratingsRepository.findOne({
      where: { user_id: userId, video_id: videoId },
    });
  }
}
