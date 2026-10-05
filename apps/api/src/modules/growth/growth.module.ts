import { Module } from '@nestjs/common';
import { IdempotencyModule } from '../../infrastructure/idempotency/idempotency.module';
import { AuditModule } from '../audit/audit.module';
import { ChildrenModule } from '../children/children.module';
import { FacilitiesModule } from '../facilities/facilities.module';
import { GrowthController } from './growth.controller';
import { GrowthService } from './growth.service';

@Module({
  imports: [AuditModule, IdempotencyModule, ChildrenModule, FacilitiesModule],
  controllers: [GrowthController],
  providers: [GrowthService],
  exports: [GrowthService],
})
export class GrowthModule {}
