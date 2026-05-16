import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CrmService } from './crm.service';
import { CrmController } from './crm.controller';

@Module({
  imports: [HttpModule],
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}