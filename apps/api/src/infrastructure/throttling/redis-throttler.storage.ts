import { Inject, Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { Redis } from 'ioredis';
import { z } from 'zod';
import { REDIS } from '../redis/redis.module';

const INCREMENT_SCRIPT = `
local hits = redis.call('INCR', KEYS[1])
if hits == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
local blockTtl = redis.call('PTTL', KEYS[2])
if blockTtl <= 0 and hits > tonumber(ARGV[2]) then
  redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
  blockTtl = tonumber(ARGV[3])
end
return { hits, ttl, blockTtl }
`;

const scriptResultSchema = z.tuple([z.number().int(), z.number().int(), z.number().int()]);

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

function toSeconds(milliseconds: number): number {
  return milliseconds > 0 ? Math.ceil(milliseconds / 1000) : 0;
}

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitsKey = `throttle:${throttlerName}:${key}`;
    const blockMilliseconds = blockDuration > 0 ? blockDuration : ttl;
    const raw: unknown = await this.redis.eval(
      INCREMENT_SCRIPT,
      2,
      hitsKey,
      `${hitsKey}:blocked`,
      String(ttl),
      String(limit),
      String(blockMilliseconds),
    );
    const [totalHits, timeToExpire, timeToBlockExpire] = scriptResultSchema.parse(raw);

    return {
      totalHits,
      timeToExpire: toSeconds(timeToExpire),
      isBlocked: timeToBlockExpire > 0,
      timeToBlockExpire: toSeconds(timeToBlockExpire),
    };
  }
}
