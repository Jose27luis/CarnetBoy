import { Module } from '@nestjs/common';
import { IdempotencyModule } from '../../infrastructure/idempotency/idempotency.module';
import { AuditModule } from '../audit/audit.module';
import { FacilitiesModule } from '../facilities/facilities.module';
import { IdentityModule } from '../identity/identity.module';
import { ActivationController } from './activation.controller';
import { ActivationService } from './activation.service';
import { AdminLinksController } from './admin-links.controller';
import { ChildrenController } from './children.controller';
import { ChildrenService } from './children.service';
import { FacilityActivityController } from './facility-activity.controller';
import { FacilityActivityService } from './facility-activity.service';
import { GuardianChildrenController } from './guardian-children.controller';
import { GuardianChildrenService } from './guardian-children.service';
import { GuardiansController } from './guardians.controller';
import { LinksService } from './links.service';

@Module({
  imports: [AuditModule, IdempotencyModule, IdentityModule, FacilitiesModule],
  controllers: [
    ChildrenController,
    GuardiansController,
    AdminLinksController,
    ActivationController,
    GuardianChildrenController,
    FacilityActivityController,
  ],
  providers: [ChildrenService, LinksService, ActivationService, GuardianChildrenService, FacilityActivityService],
  exports: [ChildrenService, GuardianChildrenService],
})
export class ChildrenModule {}
