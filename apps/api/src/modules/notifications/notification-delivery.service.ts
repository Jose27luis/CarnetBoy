import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Notification } from '@prisma/client';
import webpush, { WebPushError } from 'web-push';
import { ENV } from '../../config/env.module';
import type { Env } from '../../config/env';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { GuardianChildrenService } from '../children/guardian-children.service';

export const MAX_DELIVERY_ATTEMPTS = 5;
const RESEND_URL = 'https://api.resend.com/emails';
const PUSH_TTL_SECONDS = 24 * 60 * 60;
const GONE_STATUSES = new Set([404, 410]);

export type DeliveryOutcome = 'SENT' | 'SKIPPED' | 'FAILED' | 'RETRY' | 'IGNORED';

class PermanentFailure extends Error {}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function emailHtml(notification: Notification): string {
  return [
    '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0e2a3a">',
    `<h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(notification.title)}</h1>`,
    `<p style="font-size:16px;line-height:1.5;margin:0 0 20px">${escapeHtml(notification.body)}</p>`,
    `<a href="${escapeHtml(notification.url)}" style="display:inline-block;background:#0b7fb3;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Abrir el carnet</a>`,
    '<p style="font-size:12px;color:#4b6577;margin-top:24px">Recibes este aviso porque tienes activados los recordatorios de Carnet CRED. Puedes desactivarlos desde Avisos en tu carnet.</p>',
    '</div>',
  ].join('');
}

@Injectable()
export class NotificationDelivery {
  private readonly logger = new Logger(NotificationDelivery.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly guardianChildren: GuardianChildrenService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async deliver(notificationId: string, now: Date = new Date()): Promise<DeliveryOutcome> {
    const notification = await this.prisma.notification.findUnique({ where: { id: notificationId } });

    if (notification === null || notification.status !== 'QUEUED') {
      return 'IGNORED';
    }

    try {
      const sent = notification.channel === 'EMAIL' ? await this.sendEmail(notification) : await this.sendPush(notification, now);

      await this.prisma.notification.update({
        where: { id: notification.id },
        data: sent ? { status: 'SENT', sentAt: now, attempts: { increment: 1 } } : { status: 'SKIPPED', attempts: { increment: 1 } },
      });

      return sent ? 'SENT' : 'SKIPPED';
    } catch (error) {
      const message = (error instanceof Error ? error.message : String(error)).slice(0, 300);
      const attempts = notification.attempts + 1;
      const final = error instanceof PermanentFailure || attempts >= MAX_DELIVERY_ATTEMPTS;

      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { attempts, lastError: message, ...(final ? { status: 'FAILED' } : {}) },
      });
      this.logger.warn(`Aviso ${notification.id} por ${notification.channel} no se envió (intento ${attempts}): ${message}`);

      return final ? 'FAILED' : 'RETRY';
    }
  }

  private async sendEmail(notification: Notification): Promise<boolean> {
    if (this.env.RESEND_API_KEY === undefined || this.env.MAIL_FROM === undefined) {
      return false;
    }

    const setting = await this.prisma.notificationSetting.findUnique({ where: { accountId: notification.accountId } });
    const email = setting?.email ?? (await this.guardianChildren.registeredEmail(notification.accountId));

    if (email === null || setting?.emailEnabled === false) {
      return false;
    }

    const response = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.env.RESEND_API_KEY}`, 'content-type': 'application/json', 'idempotency-key': notification.id },
      body: JSON.stringify({
        from: this.env.MAIL_FROM,
        to: [email],
        subject: notification.title,
        text: `${notification.body}\n\nAbre el carnet: ${notification.url}`,
        html: emailHtml(notification),
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (response.ok) {
      return true;
    }

    const detail = `Resend respondió ${response.status}: ${(await response.text()).slice(0, 200)}`;

    if (response.status >= 400 && response.status < 500 && response.status !== 429) {
      throw new PermanentFailure(detail);
    }

    throw new Error(detail);
  }

  private async sendPush(notification: Notification, now: Date): Promise<boolean> {
    if (this.env.VAPID_PUBLIC_KEY === undefined || this.env.VAPID_PRIVATE_KEY === undefined) {
      return false;
    }

    const setting = await this.prisma.notificationSetting.findUnique({ where: { accountId: notification.accountId } });
    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { accountId: notification.accountId } });

    if (subscriptions.length === 0 || setting?.pushEnabled === false) {
      return false;
    }

    const payload = JSON.stringify({ title: notification.title, body: notification.body, url: notification.url });
    let delivered = 0;
    let lastError: Error | null = null;

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload, {
          TTL: PUSH_TTL_SECONDS,
          vapidDetails: { subject: this.env.WEB_URL, publicKey: this.env.VAPID_PUBLIC_KEY, privateKey: this.env.VAPID_PRIVATE_KEY },
        });
        delivered += 1;
        await this.prisma.pushSubscription.update({ where: { id: subscription.id }, data: { lastSuccessAt: now } });
      } catch (error) {
        if (error instanceof WebPushError && GONE_STATUSES.has(error.statusCode)) {
          await this.prisma.pushSubscription.delete({ where: { id: subscription.id } });
        } else {
          lastError = error instanceof Error ? error : new Error('El servicio push rechazó el aviso.');
        }
      }
    }

    if (delivered === 0 && lastError !== null) {
      throw lastError;
    }

    return delivered > 0;
  }
}
