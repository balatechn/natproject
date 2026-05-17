import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Models tracked for automatic activity logging
const TRACKED_MODELS = new Set(['Task', 'Project', 'Comment', 'Attachment']);
const TRACKED_ACTIONS = new Set(['create', 'update', 'delete']);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });

    // Activity log middleware
    this.$use(async (params, next) => {
      const result = await next(params);

      if (
        params.model &&
        TRACKED_MODELS.has(params.model) &&
        TRACKED_ACTIONS.has(params.action)
      ) {
        try {
          const entityId: string =
            result?.id ??
            params.args?.where?.id ??
            params.args?.data?.id ??
            'unknown';

          const taskId: string | undefined =
            params.model === 'Task'
              ? entityId
              : (params.args?.data?.taskId as string | undefined);

          const projectId: string | undefined =
            params.model === 'Project'
              ? entityId
              : (params.args?.data?.projectId as string | undefined);

          await this.activityLog.create({
            data: {
              action: params.action,
              entityType: params.model,
              entityId,
              ...(taskId && { taskId }),
              ...(projectId && { projectId }),
              metadata: {
                model: params.model,
                action: params.action,
              } as object,
            },
          });
        } catch {
          // Never let activity logging break the main operation
        }
      }

      return result;
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('cleanDatabase is not allowed in production');
    }
    const tablenames = await this.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;
    for (const { tablename } of tablenames) {
      if (tablename !== '_prisma_migrations') {
        await this.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
      }
    }
  }
}
