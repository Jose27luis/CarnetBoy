import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { EnvModule } from './config/env.module';
import { AuthModule } from './infrastructure/auth/auth.module';
import { JwtAuthGuard } from './infrastructure/auth/jwt-auth.guard';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { ThrottlingModule } from './infrastructure/throttling/throttling.module';
import { UserOrIpThrottlerGuard } from './infrastructure/throttling/user-or-ip-throttler.guard';
import { AuditModule } from './modules/audit/audit.module';
import { CatalogsModule } from './modules/catalogs/catalogs.module';
import { FacilitiesModule } from './modules/facilities/facilities.module';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';

@Module({
  imports: [
    EnvModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    ThrottlingModule,
    HealthModule,
    AuditModule,
    IdentityModule,
    FacilitiesModule,
    CatalogsModule,
  ],
  providers: [
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useExisting: UserOrIpThrottlerGuard },
  ],
})
export class AppModule {}
