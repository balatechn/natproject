import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CrmService } from './crm.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LeadStatus } from '@prisma/client';

@ApiTags('crm')
@ApiBearerAuth()
@Controller('crm')
export class CrmController {
  constructor(private crmService: CrmService) {}

  // ── Leads ──────────────────────────────────────────────────────────────────

  @Get('leads/stats')
  getStats(@CurrentUser('organizationId') orgId: string) {
    return this.crmService.getStats(orgId);
  }

  @Get('leads')
  findLeads(
    @CurrentUser('organizationId') orgId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.crmService.findLeads(orgId, { search, status, assigneeId, page, limit, pageSize });
  }

  @Get('leads/:id')
  findLead(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.crmService.findLeadById(id, orgId);
  }

  @Post('leads')
  createLead(
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: {
      name: string; email?: string; phone?: string; company?: string;
      source?: string; status?: LeadStatus; priority?: string; notes?: string;
      assignedToId?: string; value?: number; customerId?: string;
    },
  ) {
    return this.crmService.createLead(orgId, dto);
  }

  @Patch('leads/:id')
  updateLead(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: Partial<{
      name: string; email: string; phone: string; company: string; source: string;
      status: LeadStatus; priority: string; notes: string; assignedToId: string; value: number;
    }>,
  ) {
    return this.crmService.updateLead(id, orgId, dto);
  }

  @Delete('leads/:id')
  @HttpCode(HttpStatus.OK)
  deleteLead(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.crmService.deleteLead(id, orgId);
  }

  // ── Lead Activities ────────────────────────────────────────────────────────

  @Get('leads/:id/activities')
  getLeadActivities(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.crmService.findLeadActivities(id, orgId);
  }

  @Post('leads/:id/activities')
  createLeadActivity(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: { type: string; note?: string; subject?: string },
  ) {
    return this.crmService.createLeadActivity(id, orgId, dto);
  }

  // ── WhatsApp ───────────────────────────────────────────────────────────────

  @Get('leads/:id/whatsapp/messages')
  getWhatsAppMessages(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.crmService.getWhatsAppMessages(id, orgId);
  }

  @Post('leads/:id/whatsapp/send')
  sendWhatsApp(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: { message: string },
  ) {
    return this.crmService.sendWhatsApp(id, orgId, dto.message);
  }

  // ── Customers ──────────────────────────────────────────────────────────────

  @Get('customers')
  findCustomers(
    @CurrentUser('organizationId') orgId: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.crmService.findCustomers(orgId, { search, page, limit, pageSize });
  }

  @Post('customers')
  createCustomer(
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: { name: string; email?: string; phone?: string; company?: string; industry?: string; website?: string; notes?: string },
  ) {
    return this.crmService.createCustomer(orgId, dto);
  }

  @Patch('customers/:id')
  updateCustomer(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: Partial<{ name: string; email: string; company: string }>,
  ) {
    return this.crmService.updateCustomer(id, orgId, dto);
  }

  // ── Opportunities ──────────────────────────────────────────────────────────

  @Get('opportunities')
  findOpportunities(
    @CurrentUser('organizationId') orgId: string,
    @Query('customerId') customerId?: string,
    @Query('stageId') stageId?: string,
    @Query('page') page?: number,
  ) {
    return this.crmService.findOpportunities(orgId, { customerId, stageId, page });
  }

  @Post('opportunities')
  createOpportunity(
    @Body() dto: { customerId: string; stageId: string; title: string; value?: number; expectedCloseDate?: string },
  ) {
    return this.crmService.createOpportunity(dto);
  }

  @Patch('opportunities/:id')
  updateOpportunity(
    @Param('id') id: string,
    @Body() dto: Partial<{ stageId: string; title: string; value: number; status: string }>,
  ) {
    return this.crmService.updateOpportunity(id, dto);
  }

  // ── Pipeline Stages ────────────────────────────────────────────────────────

  @Get('pipeline-stages')
  getPipelineStages() {
    return this.crmService.getPipelineStages();
  }
}