import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LeadStatus } from '@prisma/client';

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  // ---- Leads ----
  async findLeads(
    organizationId: string,
    query: { search?: string; status?: string; assigneeId?: string; page?: number; pageSize?: number },
  ) {
    const { search, status, assigneeId, page = 1, pageSize = 20 } = query;
    const where = {
      organizationId,
      ...(status && { status: status as LeadStatus }),
      ...(assigneeId && { assignedToId: assigneeId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { company: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        include: { assignedTo: { select: { id: true, name: true, avatarUrl: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.lead.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findLeadById(id: string, organizationId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId },
      include: {
        assignedTo: { select: { id: true, name: true } },
        interactions: { orderBy: { occurredAt: 'desc' } },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async createLead(organizationId: string, dto: {
    name: string; email?: string; phone?: string; company?: string;
    source?: string; status?: LeadStatus; notes?: string; assignedToId?: string;
    value?: number;
  }) {
    return this.prisma.lead.create({ data: { ...dto, organizationId } });
  }

  async updateLead(id: string, organizationId: string, dto: Partial<{
    name: string; email: string; phone: string; company: string;
    status: LeadStatus; notes: string; assignedToId: string; value: number;
  }>) {
    await this.assertLeadExists(id, organizationId);
    return this.prisma.lead.update({ where: { id }, data: dto });
  }

  async deleteLead(id: string, organizationId: string) {
    await this.assertLeadExists(id, organizationId);
    await this.prisma.lead.delete({ where: { id } });
    return { message: 'Lead deleted' };
  }

  // ---- Customers ----
  async findCustomers(
    organizationId: string,
    query: { search?: string; page?: number; pageSize?: number },
  ) {
    const { search, page = 1, pageSize = 20 } = query;
    const where = {
      organizationId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        include: { _count: { select: { opportunities: true, interactions: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createCustomer(organizationId: string, dto: {
    name: string; email?: string; phone?: string; company?: string;
    industry?: string; website?: string; notes?: string;
  }) {
    return this.prisma.customer.create({ data: { ...dto, organizationId } });
  }

  async updateCustomer(id: string, organizationId: string, dto: Partial<{
    name: string; email: string; phone: string; company: string;
    industry: string; website: string; notes: string;
  }>) {
    await this.prisma.customer.findFirstOrThrow({ where: { id, organizationId } });
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  // ---- Opportunities ----
  async findOpportunities(organizationId: string, query: { customerId?: string; stageId?: string; page?: number; pageSize?: number }) {
    const { customerId, stageId, page = 1, pageSize = 20 } = query;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.opportunity.findMany({
        where: {
          customer: { organizationId },
          ...(customerId && { customerId }),
          ...(stageId && { stageId }),
        },
        include: {
          customer: { select: { id: true, name: true } },
          stage: true,
          assignedTo: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.opportunity.count({
        where: { customer: { organizationId }, ...(customerId && { customerId }) },
      }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createOpportunity(dto: {
    customerId: string; stageId: string; title: string;
    value?: number; expectedCloseDate?: string; assignedToId?: string;
  }) {
    return this.prisma.opportunity.create({
      data: {
        ...dto,
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
      },
      include: { customer: true, stage: true },
    });
  }

  async updateOpportunity(id: string, dto: Partial<{
    stageId: string; title: string; value: number;
    expectedCloseDate: string; assignedToId: string; status: string;
  }>) {
    return this.prisma.opportunity.update({
      where: { id },
      data: {
        ...dto,
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
      },
    });
  }

  // ---- Pipeline Stages ----
  async getPipelineStages(organizationId: string) {
    return this.prisma.pipelineStage.findMany({
      where: { organizationId },
      orderBy: { position: 'asc' },
    });
  }

  // ---- Interactions ----
  async createInteraction(dto: {
    type: string; notes?: string; occurredAt: string;
    leadId?: string; customerId?: string; createdById: string;
  }) {
    return this.prisma.interaction.create({
      data: { ...dto, occurredAt: new Date(dto.occurredAt) },
    });
  }

  // ---- Stats ----
  async getStats(organizationId: string) {
    const [totalLeads, byLeadStatus, totalCustomers, totalOpportunities] =
      await this.prisma.$transaction([
        this.prisma.lead.count({ where: { organizationId } }),
        this.prisma.lead.groupBy({ by: ['status'], where: { organizationId }, _count: true }),
        this.prisma.customer.count({ where: { organizationId } }),
        this.prisma.opportunity.count({ where: { customer: { organizationId } } }),
      ]);
    return { totalLeads, byLeadStatus, totalCustomers, totalOpportunities };
  }

  private async assertLeadExists(id: string, organizationId: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, organizationId } });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }
}
