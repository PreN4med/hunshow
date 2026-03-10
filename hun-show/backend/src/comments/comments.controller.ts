import { Controller, Post, Get, Delete, Body, Param } from '@nestjs/common';
import { CommentsService } from './comments.service';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  // POST /comments — add a comment to a video
  @Post()
  async addComment(
    @Body() body: { userId: string; videoId: string; content: string },
  ) {
    return this.commentsService.addComment(
      body.userId,
      body.videoId,
      body.content,
    );
  }

  // GET /comments/video/:videoId — get all comments for a video
  @Get('video/:videoId')
  async getCommentsByVideo(@Param('videoId') videoId: string) {
    return this.commentsService.getCommentsByVideo(videoId);
  }

  // GET /comments/user/:userId — get all comments by a user (for profile page)
  @Get('user/:userId')
  async getCommentsByUser(@Param('userId') userId: string) {
    return this.commentsService.getCommentsByUser(userId);
  }

  // DELETE /comments/:commentId/:userId — delete a comment
  @Delete(':commentId/:userId')
  async deleteComment(
    @Param('commentId') commentId: string,
    @Param('userId') userId: string,
  ) {
    return this.commentsService.deleteComment(commentId, userId);
  }
}
