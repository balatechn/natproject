import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import type { UpdateTimeEntryDto } from './dto/update-time-entry.dto';

const ENTRY_INCLUDE = {
  user: { select: { id: true, name: true, avatarUrl: true } },
  project: { select: { id: true, name: true, color: true } },
  task: { select: { id: true, title: true } },
} as const;

@Injectable()
export class TimeEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Create ──────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateTimeEntryDto) {
    return this.prisma.timeEntry.create({
      data: {
        userId,
        projectId: dto.projectId,
        taskId: dto.taskId ?? null,
        description: dto.description ?? null,
        hours: dto.hours,
        date: new Date(dto.date),
        billable: dto.billable ?? true,
      },
      include: ENTRY_INCLUDE,
    });
  }

  // ── List (paginated) ─────────────────────────────────────────────────────────

  async findAll(query: {
    organizationId: string;
    userId?: string;
    projectId?: string;
    taskId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    const {
      organizationId,
      userId,
      projectId,
      taskId,
      startDate,
      endDate,
      page = 1,
      pageSize = 50,
    } = query;

    const where: Record<string, unknown> = {
      project: { organizationId },
      ...(userId && { userId }),
      ...(projectId && { projectId }),
      ...(taskId && { taskId }),
      ...((startDate || endDate) && {
        date: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.timeEntry.findMany({
        where,
        include: ENTRY_INCLUDE,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.timeEntry.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ── By task (no pagination — for task drawer) ────────────────────────────────

  async findByTask(taskId: string) {
    return this.prisma.timeEntry.findMany({
      where: { taskId },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }

  // ── Summary / aggregation ────────────────────────────────────────────────────

  async summary(query: {
    organizationId: string;
    projectId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { organizationId, projectId, userId, startDate, endDate } = query;

    const where: Record<string, unknown> = {
      project: { organizationId },
      ...(projectId && { projectId }),
      ...(userId && { userId }),
      ...((startDate || endDate) && {
        date: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      }),
    };

    const entries = await this.prisma.timeEntry.findMany({
      where,
      include: ENTRY_INCLUDE,
    });

    // Aggregate by project
    const byProjectMap: Record<
      string,
      { projectId: string; projectName: string; color: string; hours: number }
    > = {};
    // Aggregate by user
    const byUserMap: Record<
      string,
      { userId: string; userName: string; avatarUrl: string | null; hours: number }
    > = {};
    // Aggregate by task
    const byTaskMap: Record<
      string,
      { taskId: string; taskTitle: string; hours: number }
    > = {};

    let totalHours = 0;
    let billableHours = 0;

    for (const e of entries) {
      totalHours += e.hours;
      if (e.billable) billableHours += e.hours;

      // by project
      if (!byProjectMap[e.projectId]) {
        byProjectMap[e.projectId] = {
          projectId: e.projectId,
          projectName: e.project.name,
          color: e.project.color,
          hours: 0,
        };
      }
      byProjectMap[e.projectId].hours += e.hours;

      // by user
      if (!byUserMap[e.userId]) {
        byUserMap[e.userId] = {
          userId: e.userId,
          userName: e.user.name,
          avatarUrl: e.user.avatarUrl,
          hours: 0,
        };
      }
      byUserMap[e.userId].hours += e.hours;

      // by task
      if (e.taskId && e.task) {
        if (!byTaskMap[e.taskId]) {
          byTaskMap[e.taskId] = {
            taskId: e.taskId,
            taskTitle: e.task.title,
            hours: 0,
          };
        }
        byTaskMap[e.taskId].hours += e.hours;
      }
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;

    return {
      totalHours: round2(totalHours),
      billableHours: round2(billableHours),
      entryCount: entries.length,
      byProject: Object.values(byProjectMap).sort((a, b) => b.hours - a.hours),
      byUser: Object.values(byUserMap).sort((a, b) => b.hours - a.hours),
      byTask: Object.values(byTaskMap).sort((a, b) => b.hours - a.hours),
    };
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  async update(id: string, userId: string, dto: UpdateTimeEntryDto) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Time entry not found');
    if (entry.userId !== userId)
      throw new ForbiddenException("Cannot edit another user's time entry");

    return this.prisma.timeEntry.update({
      where: { id },
      data: {
        ...(dto.projectId !== undefined && { projectId: dto.projectId }),
        ...(dto.taskId !== undefined && { taskId: dto.taskId ?? null }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.hours !== undefined && { hours: dto.hours }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.billable !== undefined && { billable: dto.billable }),
      },
      include: ENTRY_INCLUDE,
    });
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async remove(id: string, userId: string, isAdmin: boolean) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Time entry not found');
    if (entry.userId !== userId && !isAdmin)
      throw new ForbiddenException("Cannot delete another user's time entry");
    await this.prisma.timeEntry.delete({ where: { id } });
  }
}
