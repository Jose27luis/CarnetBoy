import { Module } from '@nestjs/common';
import { AnemiaModule } from '../anemia/anemia.module';
import { AuditModule } from '../audit/audit.module';
import { GrowthModule } from '../growth/growth.module';
import { ImmunizationModule } from '../immunization/immunization.module';
import { ClinicalRecordRegistry } from './clinical-record-registry';
import { CorrectionsController } from './corrections.controller';
import { CorrectionsService } from './corrections.service';

@Module({
  imports: [AuditModule, ImmunizationModule, GrowthModule, AnemiaModule],
  controllers: [CorrectionsController],
  providers: [ClinicalRecordRegistry, CorrectionsService],
})
export class CorrectionsModule {}
