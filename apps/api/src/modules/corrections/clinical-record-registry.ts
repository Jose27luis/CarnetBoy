import { Injectable } from '@nestjs/common';
import type { ClinicalRecordType } from '@carnet/contracts';
import type { ClinicalRecordHandler } from '../../common/clinical/record-handler';
import { HemoglobinService } from '../anemia/hemoglobin.service';
import { IronService } from '../anemia/iron.service';
import { GrowthService } from '../growth/growth.service';
import { ImmunizationService } from '../immunization/immunization.service';

@Injectable()
export class ClinicalRecordRegistry {
  private readonly handlers: Record<ClinicalRecordType, ClinicalRecordHandler>;

  constructor(immunization: ImmunizationService, growth: GrowthService, hemoglobin: HemoglobinService, iron: IronService) {
    this.handlers = {
      DOSE: immunization,
      GROWTH_CHECK: growth,
      HEMOGLOBIN_TEST: hemoglobin,
      IRON_SUPPLY: iron,
    };
  }

  of(type: ClinicalRecordType): ClinicalRecordHandler {
    return this.handlers[type];
  }
}
