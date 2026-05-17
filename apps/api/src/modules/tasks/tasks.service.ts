import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import type {
  CreateTaskDto,
  UpdateTaskDto,
  AddDependencyDto,
  CreateCommentDto,
  BulkUpdateStatusDto,
} from './dto/task.dto';

const TASK_INCLUDE = {
  assignments: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
  milestone: true,
  dependencies: { include: { predecessorTask: { select: { id: true, title: true } } } },
  _count: { select: { subtasks: true, comments: true, attachments: true } },
} as const;

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    @Optional() private readonly events?: EventsGateway,
  ) {}

  async findAll(
    organizationId: string,
    query: {
      projectId?: string;
      status?: string;
      priority?: string;
      assigneeId?: string;
      search?: string;
      page?: number;
      pageSize?: number;
      parentId?: string | null;
    },
  ) {
    const { projectId, status, priority, assigneeId, search, page = 1, pageSize = 50, parentId } = query;
    const where: Record<string, unknown> = {
      project: { organizationId },
      ...(projectId && { projectId }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(assigneeId && { assignments: { some: { userId: assigneeId } } }),
      ...(search && { title: { contains: search, mode: 'insensitive' } }),
      ...(parentId !== undefined && { parentId }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        include: TASK_INCLUDE,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.task.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findById(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        ...TASK_INCLUDE,
        subtasks: { include: TASK_INCLUDE },
        comments: { include: { author: { select: { id: true, name: true, avatarUrl: true } } }, orderBy: { createdAt: 'asc' } },
        attachments: true,
        parent: true,
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(dto: CreateTaskDto) {
    const { assigneeIds, ...rest } = dto;
    const task = await this.prisma.task.create({
      data: {
        ...rest,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        ...(assigneeIds?.length && {
          assignments: { create: assigneeIds.map((userId) => ({ userId })) },
        }),
      },
      include: TASK_INCLUDE,
    });

    // Detect SLA breach potential
    if (task.slaHours && task.dueDate) {
      const hoursUntilDue = (new Date(task.dueDate).getTime() - Date.now()) / 3_600_000;
      if (hoursUntilDue < task.slaHours * 0.1) {
        await this.prisma.task.update({ where: { id: task.id }, data: { slaBreach: true } });
      }
    }

    // Broadcast
    const orgId = await this.getOrgId(task.projectId);
    this.events?.emitTaskCreated(orgId, task);

    return task;
  }

  async update(id: string, dto: UpdateTaskDto) {
    const { assigneeIds, ...rest } = dto;
    await this.assertExists(id);

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        ...rest,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        ...(dto.status === 'DONE' && { completedAt: new Date(), progress: 100 }),
        ...(assigneeIds !== undefined && {
          assignments: {
            deleteMany: {},
            create: assigneeIds.map((userId) => ({ userId })),
          },
        }),
      },
      include: TASK_INCLUDE,
    });

    const orgId = await this.getOrgId(task.projectId);
    this.events?.emitTaskUpdated(orgId, task);

    return task;
  }

  async delete(id: string) {
    const task = await this.assertExists(id);
    await this.prisma.task.delete({ where: { id } });
    const orgId = await this.getOrgId(task.projectId);
    this.events?.emitTaskDeleted(orgId, id);
    return { message: 'Task deleted' };
  }

  async bulkUpdateStatus(dto: BulkUpdateStatusDto) {
    await this.prisma.task.updateMany({
      where: { id: { in: dto.taskIds } },
      data: {
        status: dto.status,
        ...(dto.status === 'DONE' && { completedAt: new Date(), progress: 100 }),
      },
    });
    return { updated: dto.taskIds.length };
  }

  // ---- Dependencies ----
  async addDependency(taskId: string, dto: AddDependencyDto) {
    return this.prisma.taskDependency.upsert({
      where: {
        dependentTaskId_predecessorTaskId: {
          dependentTaskId: taskId,
          predecessorTaskId: dto.predecessorTaskId,
        },
      },
      create: {
        dependentTaskId: taskId,
        predecessorTaskId: dto.predecessorTaskId,
        type: dto.type ?? 'finish_to_start',
      },
      update: {},
    });
  }

  async removeDependency(taskId: string, predecessorTaskId: string) {
    await this.prisma.taskDependency.delete({
      where: {
        dependentTaskId_predecessorTaskId: { dependentTaskId: taskId, predecessorTaskId },
      },
    });
    return { message: 'Dependency removed' };
  }

  // ---- Comments ----
  async getComments(taskId: string) {
    return this.prisma.comment.findMany({
      where: { taskId },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addComment(taskId: string, authorId: string, dto: CreateCommentDto) {
    const task = await this.assertExists(taskId);
    const comment = await this.prisma.comment.create({
      data: { taskId, authorId, body: dto.body },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });
    const orgId = await this.getOrgId(task.projectId);
    this.events?.emitCommentCreated(orgId, { ...comment, taskId });
    return comment;
  }

  async deleteComment(commentId: string, authorId: string) {
    const comment = await this.prisma.comment.findUniqueOrThrow({ where: { id: commentId } });
    if (comment.authorId !== authorId) throw new NotFoundException('Comment not found');
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { message: 'Comment deleted' };
  }

  // ---- Kanban ----
  async getKanbanBoard(projectId: string) {
    const statuses = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'] as const;
    const tasks = await this.prisma.task.findMany({
      where: { projectId, parentId: null },
      include: TASK_INCLUDE,
      orderBy: { position: 'asc' },
    });
    const board = Object.fromEntries(statuses.map((s) => [s, [] as typeof tasks]));
    for (const task of tasks) board[task.status].push(task);
    return board;
  }

  // ---- Stats ----
  async getStats(organizationId: string) {
    const [total, byStatus, overdue, slaBreach] = await this.prisma.$transaction([
      this.prisma.task.count({ where: { project: { organizationId } } }),
      this.prisma.task.groupBy({
        by: ['status'],
        where: { project: { organizationId } },
        _count: true,
      }),
      this.prisma.task.count({
        where: {
          project: { organizationId },
          dueDate: { lt: new Date() },
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
      }),
      this.prisma.task.count({
        where: { project: { organizationId }, slaBreach: true, status: { not: 'DONE' } },
      }),
    ]);
    return { total, byStatus, overdue, slaBreach };
  }

  private async assertExists(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private async getOrgId(projectId: string): Promise<string> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });
    return project?.organizationId ?? '';
  }
}
