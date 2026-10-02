import { Module } from '@nestjs/common';
import { IdempotencyModule } from '../../infrastructure/idempotency/idempotency.module';
import { AuditModule } from '../audit/audit.module';
import { CatalogVersionsController } from './catalog-versions.controller';
import { CatalogVersionsService } from './catalog-versions.service';
import { VaccinesController } from './vaccines.controller';
import { VaccinesService } from './vaccines.service';

@Module({
  imports: [AuditModule, IdempotencyModule],
  controllers: [VaccinesController, CatalogVersionsController],
  providers: [VaccinesService, CatalogVersionsService],
  exports: [CatalogVersionsService],
})
export class CatalogsModule {}
