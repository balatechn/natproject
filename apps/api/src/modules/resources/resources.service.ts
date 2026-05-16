import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  async getTeamAllocations(
    organizationId: string,
    query: { startDate?: string; endDate?: string; userId?: string },
  ) {
    const { startDate, endDate, userId } = query;
    const where = {
      user: { organizationId },
      ...(userId && { userId }),
      ...(startDate && endDate && {
        OR: [
          { startDate: { lte: new Date(endDate), gte: new Date(startDate) } },
          { endDate: { lte: new Date(endDate), gte: new Date(startDate) } },
        ],
      }),
    };
    return this.prisma.allocation.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, jobTitle: true } },
        resource: true,
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async createAllocation(dto: {
    userId: string;
    projectId?: string;
    taskId?: string;
    startDate: string;
    endDate: string;
    hours: number;
    notes?: string;
  }) {
    let resource = await this.prisma.resource.findUnique({ where: { userId: dto.userId } });
    if (!resource) {
      resource = await this.prisma.resource.create({ data: { userId: dto.userId } });
    }
    return this.prisma.allocation.create({
      data: {
        ...dto,
        resourceId: resource.id,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  async deleteAllocation(id: string) {
    await this.prisma.allocation.findUniqueOrThrow({ where: { id } });
    await this.prisma.allocation.delete({ where: { id } });
    return { message: 'Allocation removed' };
  }

  async getLeaves(organizationId: string, query: { userId?: string; startDate?: string; endDate?: string }) {
    const { userId, startDate, endDate } = query;
    return this.prisma.leave.findMany({
      where: {
        user: { organizationId },
        ...(userId && { userId }),
        ...(startDate && { startDate: { gte: new Date(startDate) } }),
        ...(endDate && { endDate: { lte: new Date(endDate) } }),
      },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { startDate: 'asc' },
    });
  }

  async createLeave(dto: {
    userId: string;
    type: string;
    startDate: string;
    endDate: string;
    reason?: string;
  }) {
    return this.prisma.leave.create({
      data: { ...dto, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate) },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async updateLeaveStatus(id: string, status: string) {
    return this.prisma.leave.update({ where: { id }, data: { status } });
  }

  async getWorkloadSummary(organizationId: string) {
    const now = new Date();
    const twoWeeksLater = new Date(now.getTime() + 14 * 86_400_000);

    const users = await this.prisma.user.findMany({
      where: { organizationId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        jobTitle: true,
        allocations: {
          where: { startDate: { lte: twoWeeksLater }, endDate: { gte: now } },
          select: { hours: true, startDate: true, endDate: true },
        },
        assignedTasks: {
          where: { task: { status: { notIn: ['DONE', 'CANCELLED'] } } },
          select: { task: { select: { id: true, title: true, dueDate: true, priority: true } } },
        },
      },
    });

    return users.map((u) => ({
      ...u,
      totalAllocatedHours: u.allocations.reduce((s, a) => s + a.hours, 0),
      activeTaskCount: u.assignedTasks.length,
      isOverAllocated: u.allocations.reduce((s, a) => s + a.hours, 0) > 80,
    }));
  }
}
