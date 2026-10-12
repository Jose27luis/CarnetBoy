import { Module } from '@nestjs/common';
import { EnvModule } from '../config/env.module';
import { AuthModule } from '../infrastructure/auth/auth.module';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { ReminderWorker } from './reminder-worker.service';

@Module({
  imports: [EnvModule, PrismaModule, RedisModule, AuthModule, NotificationsModule],
  providers: [ReminderWorker],
})
export class WorkerModule {}
