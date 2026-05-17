import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TimeEntriesService } from './time-entries.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';

@Controller('time-entries')
export class TimeEntriesController {
  constructor(private readonly timeEntriesService: TimeEntriesService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateTimeEntryDto) {
    return this.timeEntriesService.create(req.user.id, dto);
  }

  /**
   * Aggregated summary — must be declared BEFORE `:id` routes to avoid
   * Express treating "summary" as a dynamic segment.
   */
  @Get('summary')
  summary(
    @Req() req: any,
    @Query('projectId') projectId?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.timeEntriesService.summary({
      organizationId: req.user.organizationId,
      projectId,
      userId,
      startDate,
      endDate,
    });
  }

  @Get('task/:taskId')
  findByTask(@Param('taskId') taskId: string) {
    return this.timeEntriesService.findByTask(taskId);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('userId') userId?: string,
    @Query('projectId') projectId?: string,
    @Query('taskId') taskId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.timeEntriesService.findAll({
      organizationId: req.user.organizationId,
      userId,
      projectId,
      taskId,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTimeEntryDto,
  ) {
    return this.timeEntriesService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: any, @Param('id') id: string) {
    const isAdmin: boolean = req.user.roles?.includes('admin') ?? false;
    return this.timeEntriesService.remove(id, req.user.id, isAdmin);
  }
}
