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

import { TasksService } from './tasks.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  AddDependencyDto,
  CreateCommentDto,
  BulkUpdateStatusDto,
} from './dto/task.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List tasks (with filters)' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'assigneeId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.tasksService.findAll(orgId, {
      projectId, status, priority, assigneeId, search, page, pageSize,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Task statistics' })
  getStats(@CurrentUser('organizationId') orgId: string) {
    return this.tasksService.getStats(orgId);
  }

  @Get('board/:projectId')
  @ApiOperation({ summary: 'Get Kanban board grouped by status' })
  getKanbanBoard(@Param('projectId') projectId: string) {
    return this.tasksService.getKanbanBoard(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID with subtasks and comments' })
  findOne(@Param('id') id: string) {
    return this.tasksService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create task' })
  create(@Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto);
  }

  @Post('bulk-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk update task statuses' })
  bulkUpdateStatus(@Body() dto: BulkUpdateStatusDto) {
    return this.tasksService.bulkUpdateStatus(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete task' })
  delete(@Param('id') id: string) {
    return this.tasksService.delete(id);
  }

  // ---- Dependencies ----
  @Post(':id/dependencies')
  @ApiOperation({ summary: 'Add task dependency' })
  addDependency(@Param('id') taskId: string, @Body() dto: AddDependencyDto) {
    return this.tasksService.addDependency(taskId, dto);
  }

  @Delete(':id/dependencies/:predecessorId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove task dependency' })
  removeDependency(
    @Param('id') taskId: string,
    @Param('predecessorId') predecessorId: string,
  ) {
    return this.tasksService.removeDependency(taskId, predecessorId);
  }

  // ---- Comments ----
  @Get(':id/comments')
  @ApiOperation({ summary: 'Get comments for task' })
  getComments(@Param('id') taskId: string) {
    return this.tasksService.getComments(taskId);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add comment to task' })
  addComment(
    @Param('id') taskId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.tasksService.addComment(taskId, userId, dto);
  }

  @Delete(':taskId/comments/:commentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete comment' })
  deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.deleteComment(commentId, userId);
  }
}
