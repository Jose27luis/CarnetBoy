import { Module } from '@nestjs/common';
import { IdempotencyModule } from '../../infrastructure/idempotency/idempotency.module';
import { AuditModule } from '../audit/audit.module';
import { CatalogsModule } from '../catalogs/catalogs.module';
import { ChildrenModule } from '../children/children.module';
import { FacilitiesModule } from '../facilities/facilities.module';
import { ImmunizationController } from './immunization.controller';
import { ImmunizationService } from './immunization.service';

@Module({
  imports: [AuditModule, IdempotencyModule, CatalogsModule, ChildrenModule, FacilitiesModule],
  controllers: [ImmunizationController],
  providers: [ImmunizationService],
  exports: [ImmunizationService],
})
export class ImmunizationModule {}
