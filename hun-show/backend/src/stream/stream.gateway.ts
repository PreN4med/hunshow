import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { StreamService } from './stream.service';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'https://fall-capstone-499-group-7.vercel.app',
      'https://hunshow.vercel.app',
    ],
    credentials: true,
  },
  namespace: '/stream',
})
export class StreamGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly streamService: StreamService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-stream')
  async handleJoinStream(
    @MessageBody() data: { streamId: string },
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(data.streamId);
    const viewerCount = await this.streamService.addViewer(data.streamId);
    this.server.to(data.streamId).emit('viewer-count', { count: viewerCount });
    return { success: true };
  }

  @SubscribeMessage('leave-stream')
  async handleLeaveStream(
    @MessageBody() data: { streamId: string },
    @ConnectedSocket() client: Socket,
  ) {
    await client.leave(data.streamId);
    const viewerCount = await this.streamService.removeViewer(data.streamId);
    this.server.to(data.streamId).emit('viewer-count', { count: viewerCount });
  }

  @SubscribeMessage('chat-message')
  async handleChatMessage(
    @MessageBody()
    data: { streamId: string; message: string; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    const chatMessage = {
      id: client.id,
      username: data.username,
      message: data.message,
      timestamp: new Date().toISOString(),
    };

    await this.streamService.saveChatMessage(data.streamId, chatMessage);
    this.server.to(data.streamId).emit('chat-message', chatMessage);
  }

  @SubscribeMessage('end-stream')
  async handleEndStream(@MessageBody() data: { streamId: string }) {
    await this.streamService.endStream(data.streamId);
    this.server.to(data.streamId).emit('stream-ended');
  }

  @SubscribeMessage('stream-chunk')
  handleStreamChunk(
    @MessageBody() data: { streamId: string; chunk: ArrayBuffer },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.streamId).emit('stream-chunk', data.chunk);
  }
}
