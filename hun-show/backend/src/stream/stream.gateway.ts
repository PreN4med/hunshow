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

  private broadcasterBySocket = new Map<string, string>();
  private socketByStream = new Map<string, string>();

  constructor(private readonly streamService: StreamService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    const streamId = this.broadcasterBySocket.get(client.id);

    if (streamId) {
      console.log(`Broadcaster disconnected. Ending stream: ${streamId}`);
      await this.endStreamAndNotify(streamId, client.id);
    }
  }

  private async endStreamAndNotify(streamId: string, socketId?: string) {
    const broadcasterSocketId = socketId || this.socketByStream.get(streamId);

    if (broadcasterSocketId) {
      this.broadcasterBySocket.delete(broadcasterSocketId);
    }

    this.socketByStream.delete(streamId);

    await this.streamService.endStream(streamId);

    this.server.to(streamId).emit('stream-ended', { streamId });
  }

  @SubscribeMessage('broadcast-started')
  async handleBroadcastStarted(
    @MessageBody() data: { streamId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data.streamId) {
      return { success: false };
    }

    this.broadcasterBySocket.set(client.id, data.streamId);
    this.socketByStream.set(data.streamId, client.id);

    await client.join(data.streamId);

    return { success: true };
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
  async handleEndStream(
    @MessageBody() data: { streamId: string },
    @ConnectedSocket() client: Socket,
  ) {
    await this.endStreamAndNotify(data.streamId, client.id);
  }

  @SubscribeMessage('stream-chunk')
  handleStreamChunk(
    @MessageBody() data: { streamId: string; chunk: ArrayBuffer },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.streamId).emit('stream-chunk', data.chunk);
  }
}