import { Inject, Injectable } from '@nestjs/common';
import type { NotificationChannel, NotificationKind } from '@carnet/contracts';
import { ENV } from '../../config/env.module';
import type { Env } from '../../config/env';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { isUniqueViolation } from '../../infrastructure/prisma/unique-violation';

export interface OutgoingMessage {
  accountId: string;
  registeredEmail: string | null;
  childId: string | null;
  kind: NotificationKind;
  key: string;
  title: string;
  body: string;
  path: string;
}

@Injectable()
export class NotificationOutbox {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async enqueue(message: OutgoingMessage): Promise<string[]> {
    const channels = await this.channelsFor(message.accountId, message.registeredEmail);
    const created: string[] = [];

    for (const channel of channels) {
      try {
        const row = await this.prisma.notification.create({
          data: {
            accountId: message.accountId,
            childId: message.childId,
            kind: message.kind,
            channel,
            dedupeKey: `${message.key}:${channel}`,
            title: message.title,
            body: message.body,
            url: new URL(message.path, this.env.WEB_URL).toString(),
          },
          select: { id: true },
        });
        created.push(row.id);
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }
      }
    }

    return created;
  }

  private async channelsFor(accountId: string, registeredEmail: string | null): Promise<NotificationChannel[]> {
    const [setting, devices] = await Promise.all([
      this.prisma.notificationSetting.findUnique({ where: { accountId } }),
      this.prisma.pushSubscription.count({ where: { accountId } }),
    ]);
    const channels: NotificationChannel[] = [];
    const email = setting?.email ?? registeredEmail;

    if ((setting?.emailEnabled ?? true) && email !== null && this.env.RESEND_API_KEY !== undefined) {
      channels.push('EMAIL');
    }

    if ((setting?.pushEnabled ?? true) && devices > 0 && this.env.VAPID_PUBLIC_KEY !== undefined) {
      channels.push('PUSH');
    }

    return channels;
  }
}
