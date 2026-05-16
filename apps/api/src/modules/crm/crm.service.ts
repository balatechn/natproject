import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LeadStatus } from '@prisma/client';

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private config: ConfigService,
  ) {}

  async findLeads(
    organizationId: string,
    query: { search?: string; status?: string; assigneeId?: string; page?: number; limit?: number; pageSize?: number },
  ) {
    const { search, status, assigneeId, page = 1 } = query;
    const take = query.limit ?? query.pageSize ?? 50;
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
        skip: (page - 1) * take,
        take,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.lead.count({ where }),
    ]);
    return { data, total, page, pageSize: take, totalPages: Math.ceil(total / take) };
  }

  async findLeadById(id: string, organizationId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, organizationId },
      include: {
        assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        interactions: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async createLead(organizationId: string, dto: {
    name: string; email?: string; phone?: string; company?: string;
    source?: string; status?: LeadStatus; priority?: string; notes?: string;
    assignedToId?: string; value?: number; customerId?: string;
  }) {
    return this.prisma.lead.create({ data: { ...dto, organizationId } });
  }

  async updateLead(id: string, organizationId: string, dto: Partial<{
    name: string; email: string; phone: string; company: string; source: string;
    status: LeadStatus; priority: string; notes: string; assignedToId: string; value: number;
  }>) {
    await this.assertLeadExists(id, organizationId);
    return this.prisma.lead.update({ where: { id }, data: dto });
  }

  async deleteLead(id: string, organizationId: string) {
    await this.assertLeadExists(id, organizationId);
    await this.prisma.lead.delete({ where: { id } });
    return { message: 'Lead deleted' };
  }

  async findLeadActivities(leadId: string, organizationId: string) {
    await this.assertLeadExists(leadId, organizationId);
    const data = await this.prisma.interaction.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });
    return { data };
  }

  async createLeadActivity(leadId: string, organizationId: string, dto: { type: string; note?: string; subject?: string }) {
    await this.assertLeadExists(leadId, organizationId);
    return this.prisma.interaction.create({
      data: { leadId, type: dto.type, subject: dto.subject ?? dto.type, notes: dto.note },
    });
  }

  async findCustomers(organizationId: string, query: { search?: string; page?: number; pageSize?: number; limit?: number }) {
    const { search, page = 1 } = query;
    const take = query.limit ?? query.pageSize ?? 20;
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
        skip: (page - 1) * take,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { data, total, page, pageSize: take, totalPages: Math.ceil(total / take) };
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

  async findOpportunities(organizationId: string, query: { customerId?: string; stageId?: string; page?: number; pageSize?: number }) {
    const { customerId, stageId, page = 1, pageSize = 20 } = query;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.opportunity.findMany({
        where: { customer: { organizationId }, ...(customerId && { customerId }), ...(stageId && { stageId }) },
        include: { customer: { select: { id: true, name: true } }, stage: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.opportunity.count({ where: { customer: { organizationId }, ...(customerId && { customerId }) } }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createOpportunity(dto: { customerId: string; stageId: string; title: string; value?: number; expectedCloseDate?: string; assignedToId?: string }) {
    return this.prisma.opportunity.create({
      data: { ...dto, expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined },
      include: { customer: true, stage: true },
    });
  }

  async updateOpportunity(id: string, dto: Partial<{ stageId: string; title: string; value: number; expectedCloseDate: string; status: string }>) {
    return this.prisma.opportunity.update({
      where: { id },
      data: { ...dto, expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined },
    });
  }

  async getPipelineStages() {
    return this.prisma.pipelineStage.findMany({ orderBy: { position: 'asc' } });
  }

  async getStats(organizationId: string) {
    const [totalLeads, byLeadStatus, totalCustomers] = await this.prisma.$transaction([
      this.prisma.lead.count({ where: { organizationId } }),
      this.prisma.lead.groupBy({ by: ['status'], where: { organizationId }, _count: true }),
      this.prisma.customer.count({ where: { organizationId } }),
    ]);
    const wonLeads = byLeadStatus.find((s) => s.status === 'WON')?._count ?? 0;
    const pipelineValue = await this.prisma.lead.aggregate({
      where: { organizationId, status: { notIn: ['WON', 'LOST'] } },
      _sum: { value: true },
    });
    return { totalLeads, wonLeads, totalCustomers, byLeadStatus, pipelineValue: pipelineValue._sum.value ?? 0 };
  }

  async getWhatsAppMessages(leadId: string, organizationId: string) {
    const lead = await this.assertLeadExists(leadId, organizationId);
    if (!lead.phone) return { messages: [] };

    const evolutionUrl = this.config.get<string>('EVOLUTION_API_URL');
    const evolutionKey = this.config.get<string>('EVOLUTION_API_KEY');
    const instanceName = this.config.get<string>('EVOLUTION_INSTANCE_NAME') ?? 'default';

    if (evolutionUrl && evolutionKey) {
      try {
        const phone = lead.phone.replace(/\D/g, '');
        const res = await firstValueFrom(
          this.httpService.get(`${evolutionUrl}/chat/findMessages/${instanceName}`, {
            params: { where: { key: { remoteJid: `${phone}@s.whatsapp.net` } } },
            headers: { apikey: evolutionKey },
          }),
        );
        const messages = (res.data?.messages?.records ?? []).map((m: any) => ({
          id: m.key?.id,
          fromMe: m.key?.fromMe,
          body: m.message?.conversation ?? m.message?.extendedTextMessage?.text ?? '',
          timestamp: m.messageTimestamp,
        }));
        return { messages };
      } catch (err) {
        this.logger.warn(`Evolution API unavailable: ${(err as Error).message}`);
      }
    }

    const logs = await this.prisma.whatsAppLog.findMany({
      where: { phone: lead.phone },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    return {
      messages: logs.map((l) => ({
        id: l.id,
        fromMe: l.direction === 'outbound',
        body: l.message,
        timestamp: l.createdAt,
      })),
    };
  }

  async sendWhatsApp(leadId: string, organizationId: string, message: string) {
    const lead = await this.assertLeadExists(leadId, organizationId);
    if (!lead.phone) throw new NotFoundException('Lead has no phone number');

    const phone = lead.phone.replace(/\D/g, '');
    const evolutionUrl = this.config.get<string>('EVOLUTION_API_URL');
    const evolutionKey = this.config.get<string>('EVOLUTION_API_KEY');
    const instanceName = this.config.get<string>('EVOLUTION_INSTANCE_NAME') ?? 'default';

    let externalId: string | undefined;
    let status = 'SENT';

    if (evolutionUrl && evolutionKey) {
      try {
        const res = await firstValueFrom(
          this.httpService.post(
            `${evolutionUrl}/message/sendText/${instanceName}`,
            { number: `${phone}@s.whatsapp.net`, options: { delay: 0 }, textMessage: { text: message } },
            { headers: { apikey: evolutionKey, 'Content-Type': 'application/json' } },
          ),
        );
        externalId = res.data?.key?.id;
      } catch (err) {
        this.logger.warn(`Evolution API send failed: ${(err as Error).message}`);
        status = 'FAILED';
      }
    } else {
      status = 'PENDING';
    }

    const log = await this.prisma.whatsAppLog.create({
      data: { direction: 'outbound', phone: lead.phone, message, status, externalId, entityType: 'lead', entityId: leadId },
    });
    return { id: log.id, status, message };
  }

  private async assertLeadExists(id: string, organizationId: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, organizationId } });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }
}