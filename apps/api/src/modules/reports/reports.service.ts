import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getProjectStatusReport(organizationId: string) {
    const projects = await this.prisma.project.findMany({
      where: { organizationId, isTemplate: false },
      include: {
        _count: { select: { tasks: true } },
        tasks: {
          select: { status: true },
        },
        milestones: { select: { completed: true } },
      },
    });

    return projects.map((p) => {
      const done = p.tasks.filter((t) => t.status === 'DONE').length;
      const completionRate = p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0;
      const milestonesTotal = p.milestones.length;
      const milestonesCompleted = p.milestones.filter((m) => m.completed).length;

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        status: p.status,
        progress: p.progress,
        taskCount: p.tasks.length,
        tasksDone: done,
        completionRate,
        milestonesTotal,
        milestonesCompleted,
        budget: p.budget,
        actualCost: p.actualCost,
        startDate: p.startDate,
        endDate: p.endDate,
      };
    });
  }

  async getResourceUtilizationReport(organizationId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return this.prisma.user.findMany({
      where: { organizationId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        jobTitle: true,
        allocations: {
          where: {
            startDate: { gte: monthStart },
            endDate: { lte: monthEnd },
          },
          select: { hours: true, startDate: true, endDate: true },
        },
        leaves: {
          where: {
            startDate: { gte: monthStart },
            endDate: { lte: monthEnd },
            status: 'APPROVED',
          },
          select: { startDate: true, endDate: true },
        },
      },
    });
  }

  async getCrmPipelineReport(organizationId: string) {
    const stages = await this.prisma.pipelineStage.findMany({
      where: { organizationId },
      orderBy: { position: 'asc' },
      include: {
        opportunities: {
          select: { value: true, status: true },
        },
      },
    });

    return stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      count: stage.opportunities.length,
      totalValue: stage.opportunities.reduce((s, o) => s + (o.value ?? 0), 0),
    }));
  }

  async getTaskSlaReport(organizationId: string) {
    const [total, breached, atRisk] = await this.prisma.$transaction([
      this.prisma.task.count({ where: { project: { organizationId } } }),
      this.prisma.task.count({
        where: { project: { organizationId }, slaBreach: true, status: { not: 'DONE' } },
      }),
      this.prisma.task.count({
        where: {
          project: { organizationId },
          dueDate: { lt: new Date(Date.now() + 24 * 3_600_000) },
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
      }),
    ]);

    return { total, breached, atRisk, complianceRate: total ? Math.round(((total - breached) / total) * 100) : 100 };
  }
}
