import { Module } from '@nestjs/common';
import { AnemiaModule } from '../anemia/anemia.module';
import { ChildrenModule } from '../children/children.module';
import { GrowthModule } from '../growth/growth.module';
import { ImmunizationModule } from '../immunization/immunization.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { CarnetController } from './carnet.controller';
import { CarnetService } from './carnet.service';

@Module({
  imports: [ChildrenModule, ImmunizationModule, GrowthModule, AnemiaModule, ScheduleModule],
  controllers: [CarnetController],
  providers: [CarnetService],
})
export class GuardianModule {}
