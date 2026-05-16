import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('resources')
@ApiBearerAuth()
@Controller('resources')
export class ResourcesController {
  constructor(private resourcesService: ResourcesService) {}

  @Get('allocations')
  @ApiOperation({ summary: 'Get team allocations / planner view' })
  getAllocations(
    @CurrentUser('organizationId') orgId: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.resourcesService.getTeamAllocations(orgId, { userId, startDate, endDate });
  }

  @Post('allocations')
  @ApiOperation({ summary: 'Create allocation' })
  createAllocation(@Body() dto: {
    userId: string;
    projectId?: string;
    taskId?: string;
    startDate: string;
    endDate: string;
    hours: number;
    notes?: string;
  }) {
    return this.resourcesService.createAllocation(dto);
  }

  @Delete('allocations/:id')
  @ApiOperation({ summary: 'Remove allocation' })
  deleteAllocation(@Param('id') id: string) {
    return this.resourcesService.deleteAllocation(id);
  }

  @Get('workload')
  @ApiOperation({ summary: 'Workload summary per user (next 2 weeks)' })
  getWorkload(@CurrentUser('organizationId') orgId: string) {
    return this.resourcesService.getWorkloadSummary(orgId);
  }

  @Get('leaves')
  @ApiOperation({ summary: 'Get leave records' })
  getLeaves(
    @CurrentUser('organizationId') orgId: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.resourcesService.getLeaves(orgId, { userId, startDate, endDate });
  }

  @Post('leaves')
  @ApiOperation({ summary: 'Submit leave request' })
  createLeave(@Body() dto: {
    userId: string;
    type: string;
    startDate: string;
    endDate: string;
    reason?: string;
  }) {
    return this.resourcesService.createLeave(dto);
  }

  @Patch('leaves/:id/status')
  @ApiOperation({ summary: 'Update leave status (approve/reject)' })
  updateLeaveStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.resourcesService.updateLeaveStatus(id, body.status);
  }
}
