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
    @CurrentUser('id') userId: string,
    @Body() dto: {
      name: string;
      description?: string;
      trigger: string;
      triggerConfig?: Record<string, unknown>;
      steps?: Array<{ name: string; type: string; config?: Record<string, unknown>; conditions?: Record<string, unknown>; order: number }>;
    },
  ) {
    return this.workflowsService.create(orgId, userId, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: Partial<{ name: string; description: string; active: boolean; triggerConfig: Record<string, unknown> }>,
  ) {
    return this.workflowsService.update(id, orgId, dto);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle workflow active/inactive' })
  toggle(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.workflowsService.toggle(id, orgId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.workflowsService.delete(id, orgId);
  }

  @Patch('approvals/:id')
  @ApiOperation({ summary: 'Approve or reject a workflow approval' })
  respondApproval(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED'; notes?: string },
  ) {
    return this.workflowsService.respondToApproval(id, userId, body.status, body.notes);
  }
}
