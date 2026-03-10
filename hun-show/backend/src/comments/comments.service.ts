import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './comment.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
  ) {}

  // Add a comment to a video
  async addComment(
    userId: string,
    videoId: string,
    content: string,
  ): Promise<Comment> {
    const comment = this.commentsRepository.create({
      user_id: userId,
      video_id: videoId,
      content,
    });
    return this.commentsRepository.save(comment);
  }

  // Get all comments for a specific video
  async getCommentsByVideo(videoId: string): Promise<Comment[]> {
    return this.commentsRepository.find({
      where: { video_id: videoId },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  // Get all comments made by a specific user (for profile page)
  async getCommentsByUser(userId: string): Promise<Comment[]> {
    return this.commentsRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  // Delete a comment (only the user who made it can delete it)
  async deleteComment(commentId: string, userId: string): Promise<void> {
    await this.commentsRepository.delete({ id: commentId, user_id: userId });
  }
}
