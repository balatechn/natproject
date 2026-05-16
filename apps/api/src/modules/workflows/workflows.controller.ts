import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('workflows')
@ApiBearerAuth()
@Controller('workflows')
export class WorkflowsController {
  constructor(private workflowsService: WorkflowsService) {}

  @Get()
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.workflowsService.findAll(orgId, { page, pageSize });
  }

  @Get('approvals/pending')
  @ApiOperation({ summary: 'Get my pending approvals' })
  getPendingApprovals(@CurrentUser('id') userId: string) {
    return this.workflowsService.getPendingApprovals(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.workflowsService.findById(id, orgId);
  }

  @Post()
  create(
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: {
      name: string;
      description?: string;
      trigger?: string;
      nodes?: unknown[];
      edges?: unknown[];
      steps?: Array<{ name: string; type: string; config?: Record<string, unknown>; position: number }>;
    },
  ) {
    return this.workflowsService.create(orgId, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: Partial<{ name: string; description: string; isActive: boolean; trigger: string; nodes: unknown[]; edges: unknown[] }>,
  ) {
    return this.workflowsService.update(id, orgId, dto);
  }

  @Post(':id/toggle')
  @ApiOperation({ summary: 'Toggle workflow active/inactive' })
  toggle(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.workflowsService.toggle(id, orgId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.workflowsService.delete(id, orgId);
  }

  @Post('approvals/:id/respond')
  @ApiOperation({ summary: 'Approve or reject a workflow approval' })
  respondApproval(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED'; notes?: string },
  ) {
    return this.workflowsService.respondToApproval(id, userId, body.status, body.notes);
  }
}
