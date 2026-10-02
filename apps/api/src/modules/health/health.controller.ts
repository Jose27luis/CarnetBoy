import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Redis } from 'ioredis';
import { SkipThrottle } from '@nestjs/throttler';
import { DomainError } from '../../common/errors/domain-error';
import { Public } from '../../infrastructure/auth/auth-metadata';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { REDIS } from '../../infrastructure/redis/redis.module';

class HealthResponseDto {
  @ApiProperty({ enum: ['ok'] })
  service!: 'ok';

  @ApiProperty({ enum: ['ok'] })
  database!: 'ok';

  @ApiProperty({ enum: ['ok'] })
  redis!: 'ok';
}

@ApiTags('health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Verifica que la API, la base de datos y Redis respondan' })
  @ApiResponse({ status: 200, type: HealthResponseDto })
  @ApiResponse({ status: 503, description: 'La base de datos o Redis no responden' })
  async check(): Promise<HealthResponseDto> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw DomainError.serviceUnavailable('La base de datos no responde.');
    }

    try {
      await this.redis.ping();
    } catch {
      throw DomainError.serviceUnavailable('Redis no responde.');
    }

    return { service: 'ok', database: 'ok', redis: 'ok' };
  }
}
