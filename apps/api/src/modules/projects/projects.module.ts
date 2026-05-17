import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ActivityLogService } from '../tasks/activity-log.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ActivityLogService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
