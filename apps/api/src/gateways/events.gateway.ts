import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

interface AuthSocket extends Socket {
  userId: string;
  organizationId: string;
}

@WebSocketGateway({ cors: { origin: '*', credentials: true }, namespace: '/' })
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');

    // Authenticate socket on handshake
    server.use(async (socket: any, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.split(' ')[1];
        if (!token) throw new UnauthorizedException('No token');

        const payload = this.jwtService.verify(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });

        socket.userId = payload.sub;
        socket.organizationId = payload.organizationId;
        next();
      } catch {
        next(new UnauthorizedException('Invalid token'));
      }
    });
  }

  async handleConnection(client: AuthSocket) {
    this.logger.log(`Client connected: ${client.id} (user=${client.userId})`);
    await client.join(`user:${client.userId}`);
    await client.join(`org:${client.organizationId}`);

    this.server.to(`org:${client.organizationId}`).emit('presence:join', {
      userId: client.userId,
      socketId: client.id,
    });
  }

  handleDisconnect(client: AuthSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    if (client.userId) {
      this.server.to(`org:${client.organizationId}`).emit('presence:leave', {
        userId: client.userId,
        socketId: client.id,
      });
    }
  }

  // ---- Public methods called by services ----

  notifyUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  notifyOrg(organizationId: string, event: string, payload: unknown) {
    this.server.to(`org:${organizationId}`).emit(event, payload);
  }

  broadcastTaskUpdate(organizationId: string, task: unknown) {
    this.notifyOrg(organizationId, 'task:updated', task);
  }

  broadcastTaskCreated(organizationId: string, task: unknown) {
    this.notifyOrg(organizationId, 'task:created', task);
  }

  // ---- Client events ----

  @SubscribeMessage('task:typing')
  handleTaskTyping(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { taskId: string },
  ) {
    client.to(`org:${client.organizationId}`).emit('task:typing', {
      userId: client.userId,
      taskId: data.taskId,
    });
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthSocket) {
    client.emit('pong', { ts: Date.now() });
  }
}
