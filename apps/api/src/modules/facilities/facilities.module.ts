import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { IdentityModule } from '../identity/identity.module';
import { AssignedFacilityGuard } from './assigned-facility.guard';
import { DigitizerFacilitiesController } from './digitizer-facilities.controller';
import { FacilitiesController } from './facilities.controller';
import { FacilitiesService } from './facilities.service';

@Module({
  imports: [AuditModule, IdentityModule],
  controllers: [FacilitiesController, DigitizerFacilitiesController],
  providers: [FacilitiesService, AssignedFacilityGuard],
  exports: [FacilitiesService, AssignedFacilityGuard],
})
export class FacilitiesModule {}
