import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { ActivityLogService } from './activity-log.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [TasksController],
  providers: [TasksService, ActivityLogService],
  exports: [TasksService, ActivityLogService],
})
export class TasksModule {}
