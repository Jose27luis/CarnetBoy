import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { AuthenticatedRequest } from '../auth/authenticated-user';

@Injectable()
export class UserOrIpThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(request: AuthenticatedRequest): Promise<string> {
    return Promise.resolve(request.user !== undefined ? `user:${request.user.id}` : `ip:${request.ip}`);
  }
}
