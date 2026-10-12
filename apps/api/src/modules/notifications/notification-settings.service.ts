import { Inject, Injectable } from '@nestjs/common';
import type { NotificationSettings, PushSubscriptionInput } from '@carnet/contracts';
import { ENV } from '../../config/env.module';
import type { Env } from '../../config/env';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { GuardianChildrenService } from '../children/guardian-children.service';

export interface SettingsChange {
  emailEnabled: boolean;
  pushEnabled: boolean;
  email: string | null;
}

@Injectable()
export class NotificationSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guardianChildren: GuardianChildrenService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async settings(accountId: string): Promise<NotificationSettings> {
    const [setting, registeredEmail, pushDevices] = await Promise.all([
      this.prisma.notificationSetting.findUnique({ where: { accountId } }),
      this.guardianChildren.registeredEmail(accountId),
      this.prisma.pushSubscription.count({ where: { accountId } }),
    ]);

    return {
      emailEnabled: setting?.emailEnabled ?? true,
      pushEnabled: setting?.pushEnabled ?? true,
      email: setting?.email ?? null,
      registeredEmail,
      emailConfigured: this.env.RESEND_API_KEY !== undefined,
      pushPublicKey: this.env.VAPID_PUBLIC_KEY ?? null,
      pushDevices,
    };
  }

  async update(accountId: string, change: SettingsChange): Promise<NotificationSettings> {
    const email = change.email?.trim().toLowerCase() || null;

    await this.prisma.notificationSetting.upsert({
      where: { accountId },
      create: { accountId, emailEnabled: change.emailEnabled, pushEnabled: change.pushEnabled, email },
      update: { emailEnabled: change.emailEnabled, pushEnabled: change.pushEnabled, email },
    });

    return this.settings(accountId);
  }

  async subscribe(accountId: string, subscription: PushSubscriptionInput, userAgent: string | null): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: { accountId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, userAgent },
      update: { accountId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, userAgent },
    });
  }

  async unsubscribe(accountId: string, endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { accountId, endpoint } });
  }
}
