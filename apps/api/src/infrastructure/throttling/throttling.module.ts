import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { RedisThrottlerStorage } from './redis-throttler.storage';
import { RedisThrottlerStorageModule } from './redis-throttler-storage.module';
import { UserOrIpThrottlerGuard } from './user-or-ip-throttler.guard';

export const DEFAULT_THROTTLE = { limit: 120, ttl: 60_000 };
export const SENSITIVE_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [RedisThrottlerStorageModule],
      inject: [RedisThrottlerStorage],
      useFactory: (storage: RedisThrottlerStorage) => ({
        throttlers: [{ name: 'default', ...DEFAULT_THROTTLE }],
        storage,
      }),
    }),
  ],
  providers: [UserOrIpThrottlerGuard],
  exports: [UserOrIpThrottlerGuard],
})
export class ThrottlingModule {}
