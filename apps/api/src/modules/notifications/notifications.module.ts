import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ChildrenModule } from '../children/children.module';
import { ImmunizationModule } from '../immunization/immunization.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { NotificationDelivery } from './notification-delivery.service';
import { NotificationOutbox } from './notification-outbox.service';
import { NotificationSettingsService } from './notification-settings.service';
import { NotificationsController } from './notifications.controller';
import { ReminderPlanner } from './reminder-planner.service';

@Module({
  imports: [AuditModule, ChildrenModule, ImmunizationModule, ScheduleModule],
  controllers: [NotificationsController],
  providers: [NotificationSettingsService, NotificationOutbox, ReminderPlanner, NotificationDelivery],
  exports: [ReminderPlanner, NotificationDelivery],
})
export class NotificationsModule {}
