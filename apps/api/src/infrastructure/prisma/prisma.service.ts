import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { ENV } from '../../config/env.module';
import type { Env } from '../../config/env';

const POOL_ACQUIRE_TIMEOUT_MS = 10_000;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(ENV) env: Env) {
    super({
      adapter: new PrismaPg({
        connectionString: env.DATABASE_URL,
        max: env.DATABASE_POOL_SIZE,
        connectionTimeoutMillis: POOL_ACQUIRE_TIMEOUT_MS,
      }),
      transactionOptions: { maxWait: POOL_ACQUIRE_TIMEOUT_MS },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
