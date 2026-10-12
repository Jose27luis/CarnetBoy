import { Module } from '@nestjs/common';
import { IdempotencyModule } from '../../infrastructure/idempotency/idempotency.module';
import { AuditModule } from '../audit/audit.module';
import { CatalogsModule } from '../catalogs/catalogs.module';
import { ChildrenModule } from '../children/children.module';
import { FacilitiesModule } from '../facilities/facilities.module';
import { ImmunizationModule } from '../immunization/immunization.module';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

@Module({
  imports: [AuditModule, IdempotencyModule, CatalogsModule, ChildrenModule, FacilitiesModule, ImmunizationModule],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
