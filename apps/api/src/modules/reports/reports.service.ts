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
        tasks: { select: { status: true } },
        milestones: { select: { completed: true } },
      },
    });

    return projects.map((p) => {
      const done = p.tasks.filter((t) => t.status === 'DONE').length;
      const completionRate = p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0;
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        status: p.status,
        progress: p.progress,
        taskCount: p.tasks.length,
        tasksDone: done,
        completionRate,
        milestonesTotal: p.milestones.length,
        milestonesCompleted: p.milestones.filter((m) => m.completed).length,
        budget: p.budget,
        startDate: p.startDate,
        endDate: p.endDate,
      };
    });
  }

  async getTaskSummaryReport(organizationId: string) {
    const grouped = await this.prisma.task.groupBy({
      by: ['status'],
      where: { project: { organizationId } },
      _count: true,
    });
    const priorityGrouped = await this.prisma.task.groupBy({
      by: ['priority'],
      where: { project: { organizationId } },
      _count: true,
    });
    const total = grouped.reduce((s, g) => s + g._count, 0);
    return {
      total,
      byStatus: grouped.map((g) => ({ status: g.status, count: g._count })),
      byPriority: priorityGrouped.map((g) => ({ priority: g.priority, count: g._count })),
    };
  }

  async getTeamWorkloadReport(organizationId: string) {
    const users = await this.prisma.user.findMany({
      where: { organizationId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        jobTitle: true,
        assignedTasks: {
          select: { task: { select: { status: true, priority: true } } },
        },
      },
    });

    return users.map((u) => {
      const tasks = u.assignedTasks.map((a) => a.task);
      return {
        id: u.id,
        name: u.name,
        jobTitle: u.jobTitle,
        total: tasks.length,
        completed: tasks.filter((t) => t.status === 'DONE').length,
        inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
        todo: tasks.filter((t) => t.status === 'TODO').length,
        highPriority: tasks.filter((t) => t.priority === 'HIGH' || t.priority === 'URGENT').length,
      };
    });
  }

  async getResourceUtilizationReport(organizationId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const users = await this.prisma.user.findMany({
      where: { organizationId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        jobTitle: true,
        allocations: {
          where: { startDate: { gte: monthStart }, endDate: { lte: monthEnd } },
          select: { hours: true },
        },
        leaves: {
          where: { startDate: { gte: monthStart }, endDate: { lte: monthEnd }, status: 'APPROVED' },
          select: { startDate: true, endDate: true },
        },
      },
    });

    const workingDays = 22; // approx month working days
    const maxHours = workingDays * 8;

    return users.map((u) => {
      const allocatedHours = u.allocations.reduce((s, a) => s + a.hours, 0);
      const utilizationPct = Math.min(Math.round((allocatedHours / maxHours) * 100), 100);
      return {
        id: u.id,
        name: u.name,
        jobTitle: u.jobTitle,
        allocatedHours,
        maxHours,
        utilizationPct,
        leaveCount: u.leaves.length,
      };
    });
  }

  async getCrmPipelineReport(organizationId: string) {
    // Lead funnel by status
    const leadsByStatus = await this.prisma.lead.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: true,
      _sum: { value: true },
    });

    const stageOrder = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];
    const result = stageOrder.map((s) => {
      const row = leadsByStatus.find((r) => r.status === s);
      return { stage: s, count: row?._count ?? 0, totalValue: row?._sum?.value ?? 0 };
    });

    // Pipeline stages from opportunities
    const stages = await this.prisma.pipelineStage.findMany({
      orderBy: { position: 'asc' },
      include: { opportunities: { select: { value: true } } },
    });

    const pipeline = stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      count: stage.opportunities.length,
      totalValue: stage.opportunities.reduce((s, o) => s + (o.value ?? 0), 0),
    }));

    return { leadFunnel: result, pipeline };
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