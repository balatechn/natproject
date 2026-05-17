import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import type { CreateProjectDto, UpdateProjectDto, CreateMilestoneDto } from './dto/project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    @Optional() private readonly events?: EventsGateway,
  ) {}

  async findAll(
    organizationId: string,
    query: {
      search?: string;
      status?: string;
      page?: number;
      pageSize?: number;
      teamId?: string;
    },
  ) {
    const { search, status, page = 1, pageSize = 20, teamId } = query;
    const where = {
      organizationId,
      isTemplate: false,
      ...(status && { status: status as never }),
      ...(teamId && { teamId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { code: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        include: {
          team: true,
          _count: { select: { tasks: true, milestones: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.project.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findById(id: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId },
      include: {
        team: { include: { members: { include: { user: true } } } },
        milestones: { orderBy: { dueDate: 'asc' } },
        _count: { select: { tasks: true, attachments: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(organizationId: string, createdById: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        ...dto,
        organizationId,
        createdById,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: { team: true },
    });
  }

  async update(id: string, organizationId: string, dto: UpdateProjectDto) {
    await this.assertExists(id, organizationId);
    const project = await this.prisma.project.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: { team: true },
    });
    this.events?.emitProjectUpdated(organizationId, project);
    return project;
  }

  async delete(id: string, organizationId: string) {
    await this.assertExists(id, organizationId);
    await this.prisma.project.delete({ where: { id } });
    return { message: 'Project deleted' };
  }

  // ---- Milestones ----
  async getMilestones(projectId: string, organizationId: string) {
    await this.assertExists(projectId, organizationId);
    return this.prisma.milestone.findMany({
      where: { projectId },
      orderBy: { dueDate: 'asc' },
    });
  }

  async createMilestone(projectId: string, organizationId: string, dto: CreateMilestoneDto) {
    await this.assertExists(projectId, organizationId);
    return this.prisma.milestone.create({
      data: { ...dto, projectId, dueDate: new Date(dto.dueDate) },
    });
  }

  async completeMilestone(id: string, projectId: string, organizationId: string) {
    await this.assertExists(projectId, organizationId);
    return this.prisma.milestone.update({
      where: { id },
      data: { completed: true, completedAt: new Date() },
    });
  }

  // ---- Baselines ----
  async createBaseline(projectId: string, organizationId: string, name: string) {
    const project = await this.findById(projectId, organizationId);
    const tasks = await this.prisma.task.findMany({ where: { projectId } });
    return this.prisma.baseline.create({
      data: {
        projectId,
        name,
        data: { project, tasks, capturedAt: new Date() },
      },
    });
  }

  async getBaselines(projectId: string, organizationId: string) {
    await this.assertExists(projectId, organizationId);
    return this.prisma.baseline.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } });
  }

  // ---- Stats ----
  async getStats(organizationId: string) {
    const [total, byStatus, overdue] = await this.prisma.$transaction([
      this.prisma.project.count({ where: { organizationId, isTemplate: false } }),
      this.prisma.project.groupBy({
        by: ['status'],
        where: { organizationId, isTemplate: false },
        _count: true,
      }),
      this.prisma.project.count({
        where: {
          organizationId,
          isTemplate: false,
          endDate: { lt: new Date() },
          status: { notIn: ['COMPLETED', 'CANCELLED', 'ARCHIVED'] },
        },
      }),
    ]);
    return { total, byStatus, overdue };
  }

  private async assertExists(id: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({ where: { id, organizationId } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }
}
