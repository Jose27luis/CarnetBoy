import { Module } from '@nestjs/common';
import { IdempotencyModule } from '../../infrastructure/idempotency/idempotency.module';
import { AuditModule } from '../audit/audit.module';
import { CatalogsModule } from '../catalogs/catalogs.module';
import { ChildrenModule } from '../children/children.module';
import { FacilitiesModule } from '../facilities/facilities.module';
import { AnemiaController } from './anemia.controller';
import { HemoglobinService } from './hemoglobin.service';
import { IronService } from './iron.service';

@Module({
  imports: [AuditModule, IdempotencyModule, CatalogsModule, ChildrenModule, FacilitiesModule],
  controllers: [AnemiaController],
  providers: [HemoglobinService, IronService],
  exports: [HemoglobinService, IronService],
})
export class AnemiaModule {}
