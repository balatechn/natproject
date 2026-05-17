import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { ProjectsService } from './projects.service';
import { ActivityLogService } from '../tasks/activity-log.service';
import { CreateProjectDto, UpdateProjectDto, CreateMilestoneDto } from './dto/project.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(
    private projectsService: ProjectsService,
    private activityLogService: ActivityLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all projects' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('teamId') teamId?: string,
  ) {
    return this.projectsService.findAll(orgId, { search, status, page, pageSize, teamId });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get project statistics' })
  getStats(@CurrentUser('organizationId') orgId: string) {
    return this.projectsService.getStats(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  findOne(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.projectsService.findById(id, orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a project' })
  create(
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.create(orgId, userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  update(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, orgId, dto);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete project' })
  delete(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.projectsService.delete(id, orgId);
  }

  // ---- Milestones ----
  @Get(':id/milestones')
  @ApiOperation({ summary: 'Get milestones for project' })
  getMilestones(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.projectsService.getMilestones(id, orgId);
  }

  @Post(':id/milestones')
  @ApiOperation({ summary: 'Create milestone' })
  createMilestone(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.projectsService.createMilestone(id, orgId, dto);
  }

  @Patch(':projectId/milestones/:id/complete')
  @ApiOperation({ summary: 'Mark milestone complete' })
  completeMilestone(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.projectsService.completeMilestone(id, projectId, orgId);
  }

  // ---- Baselines ----
  @Get(':id/baselines')
  @ApiOperation({ summary: 'List baselines' })
  getBaselines(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.projectsService.getBaselines(id, orgId);
  }

  @Post(':id/baselines')
  @ApiOperation({ summary: 'Capture baseline snapshot' })
  createBaseline(
    @Param('id') id: string,
    @CurrentUser('organizationId') orgId: string,
    @Body() body: { name: string },
  ) {
    return this.projectsService.createBaseline(id, orgId, body.name);
  }

  // ---- Activity Log ----
  @Get(':id/activity')
  @ApiOperation({ summary: 'Get activity log for a project' })
  getActivity(@Param('id') projectId: string) {
    return this.activityLogService.findByProject(projectId);
  }
}
