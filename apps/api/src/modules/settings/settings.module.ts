import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SecuritySettingsService } from './security-settings.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [AuditModule],
  controllers: [SettingsController],
  providers: [SecuritySettingsService],
  exports: [SecuritySettingsService],
})
export class SettingsModule {}
