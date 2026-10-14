import { Module } from '@nestjs/common';
import { FacilitiesModule } from '../facilities/facilities.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [FacilitiesModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
