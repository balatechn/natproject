import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('project-status')
  @ApiOperation({ summary: 'Project status report' })
  getProjectStatus(@CurrentUser('organizationId') orgId: string) {
    return this.reportsService.getProjectStatusReport(orgId);
  }

  @Get('resource-utilization')
  @ApiOperation({ summary: 'Resource utilization this month' })
  getResourceUtilization(@CurrentUser('organizationId') orgId: string) {
    return this.reportsService.getResourceUtilizationReport(orgId);
  }

  @Get('crm-pipeline')
  @ApiOperation({ summary: 'CRM pipeline funnel report' })
  getCrmPipeline(@CurrentUser('organizationId') orgId: string) {
    return this.reportsService.getCrmPipelineReport(orgId);
  }

  @Get('task-sla')
  @ApiOperation({ summary: 'Task SLA compliance report' })
  getTaskSla(@CurrentUser('organizationId') orgId: string) {
    return this.reportsService.getTaskSlaReport(orgId);
  }
}
