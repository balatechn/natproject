import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WorkflowTrigger } from '@prisma/client';

@Injectable()
export class WorkflowsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, query: { page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 20 } = query;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.workflow.findMany({
        where: { organizationId },
        include: { steps: { orderBy: { position: 'asc' } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workflow.count({ where: { organizationId } }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findById(id: string, organizationId: string) {
    const wf = await this.prisma.workflow.findFirst({
      where: { id, organizationId },
      include: {
        steps: { orderBy: { position: 'asc' } },
        approvals: {
          include: { approver: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!wf) throw new NotFoundException('Workflow not found');
    return wf;
  }

  async create(
    organizationId: string,
    dto: {
      name: string;
      description?: string;
      trigger?: string;
      nodes?: unknown[];
      edges?: unknown[];
      steps?: Array<{ name: string; type: string; config?: Record<string, unknown>; position: number }>;
    },
  ) {
    const { steps, nodes, edges, trigger, ...rest } = dto;
    return this.prisma.workflow.create({
      data: {
        ...rest,
        organizationId,
        trigger: (trigger ?? 'MANUAL') as WorkflowTrigger,
        nodes: nodes ?? [],
        edges: edges ?? [],
        ...(steps?.length && {
          steps: {
            create: steps.map((s, i) => ({
              name: s.name,
              type: s.type,
              config: s.config ?? {},
              position: s.position ?? i,
            })),
          },
        }),
      },
      include: { steps: { orderBy: { position: 'asc' } } },
    });
  }

  async update(
    id: string,
    organizationId: string,
    dto: Partial<{
      name: string;
      description: string;
      isActive: boolean;
      nodes: unknown[];
      edges: unknown[];
      trigger: string;
    }>,
  ) {
    await this.assertExists(id, organizationId);
    const { trigger, ...rest } = dto;
    return this.prisma.workflow.update({
      where: { id },
      data: {
        ...rest,
        ...(trigger && { trigger: trigger as WorkflowTrigger }),
      },
    });
  }

  async delete(id: string, organizationId: string) {
    await this.assertExists(id, organizationId);
    await this.prisma.workflow.delete({ where: { id } });
    return { message: 'Workflow deleted' };
  }

  async toggle(id: string, organizationId: string) {
    const wf = await this.assertExists(id, organizationId);
    return this.prisma.workflow.update({ where: { id }, data: { isActive: !wf.isActive } });
  }

  async getPendingApprovals(userId: string) {
    return this.prisma.approval.findMany({
      where: { approverId: userId, status: 'PENDING' },
      include: { workflow: { select: { id: true, name: true } }, approver: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async respondToApproval(id: string, approverId: string, status: 'APPROVED' | 'REJECTED', notes?: string) {
    const approval = await this.prisma.approval.findFirst({ where: { id, approverId } });
    if (!approval) throw new NotFoundException('Approval not found');
    return this.prisma.approval.update({
      where: { id },
      data: { status, decidedAt: new Date(), notes },
    });
  }

  private async assertExists(id: string, organizationId: string) {
    const wf = await this.prisma.workflow.findFirst({ where: { id, organizationId } });
    if (!wf) throw new NotFoundException('Workflow not found');
    return wf;
  }
}