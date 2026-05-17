import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/events',
  cors: {
    origin: (origin: string, cb: (err: Error | null, allow?: boolean) => void) => cb(null, true),
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.headers?.authorization?.replace('Bearer ', '') as string | undefined);

      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = this.jwt.verify<{ sub: string; organizationId: string }>(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });

      client.data.userId = payload.sub;
      client.data.orgId = payload.organizationId;

      await client.join(`user:${payload.sub}`);
      await client.join(`org:${payload.organizationId}`);

      this.logger.debug(`Client connected: ${client.id} (user=${payload.sub})`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() _data: unknown) {
    client.emit('pong', { timestamp: Date.now() });
  }

  // ── Broadcast helpers (called from other services) ──────────────────────

  emitToUser(userId: string, event: string, data: unknown): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToOrg(orgId: string, event: string, data: unknown): void {
    this.server.to(`org:${orgId}`).emit(event, data);
  }

  emitTaskUpdated(orgId: string, task: unknown): void {
    this.emitToOrg(orgId, 'task.updated', task);
  }

  emitTaskCreated(orgId: string, task: unknown): void {
    this.emitToOrg(orgId, 'task.created', task);
  }

  emitTaskDeleted(orgId: string, taskId: string): void {
    this.emitToOrg(orgId, 'task.deleted', { id: taskId });
  }

  emitProjectUpdated(orgId: string, project: unknown): void {
    this.emitToOrg(orgId, 'project.updated', project);
  }

  emitCommentCreated(orgId: string, comment: unknown): void {
    this.emitToOrg(orgId, 'comment.created', comment);
  }

  emitNotification(userId: string, notification: unknown): void {
    this.emitToUser(userId, 'notification.new', notification);
  }
}
