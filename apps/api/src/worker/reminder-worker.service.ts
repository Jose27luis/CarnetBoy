import { Inject, Injectable, Logger, type OnApplicationShutdown, type OnApplicationBootstrap } from '@nestjs/common';
import { type Job, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { ENV } from '../config/env.module';
import type { Env } from '../config/env';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { MAX_DELIVERY_ATTEMPTS, NotificationDelivery } from '../modules/notifications/notification-delivery.service';
import { ReminderPlanner } from '../modules/notifications/reminder-planner.service';

export const PLAN_QUEUE = 'carnet-plan';
export const DELIVERY_QUEUE = 'carnet-delivery';
const PLAN_PATTERN = '5 * * * *';
const STALE_QUEUED_MS = 10 * 60 * 1000;
const RETRY_DELAY_MS = 60_000;

interface DeliveryData {
  notificationId: string;
}

@Injectable()
export class ReminderWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ReminderWorker.name);
  private readonly connection: Redis;
  private readonly planQueue: Queue;
  private readonly deliveryQueue: Queue<DeliveryData>;
  private readonly workers: Worker[] = [];

  constructor(
    @Inject(ENV) env: Env,
    private readonly prisma: PrismaService,
    private readonly planner: ReminderPlanner,
    private readonly delivery: NotificationDelivery,
  ) {
    this.connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    this.planQueue = new Queue(PLAN_QUEUE, { connection: this.connection });
    this.deliveryQueue = new Queue<DeliveryData>(DELIVERY_QUEUE, { connection: this.connection });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.planQueue.upsertJobScheduler('hourly', { pattern: PLAN_PATTERN, tz: 'America/Lima' }, { name: 'plan' });

    this.workers.push(
      new Worker(PLAN_QUEUE, () => this.plan(), { connection: this.connection, concurrency: 1 }),
      new Worker<DeliveryData>(DELIVERY_QUEUE, (job) => this.deliver(job), { connection: this.connection, concurrency: 4 }),
    );

    for (const worker of this.workers) {
      worker.on('failed', (job, error) => this.logger.warn(`Tarea ${job?.id ?? 'sin id'} falló: ${error.message}`));
    }

    this.logger.log('Worker de avisos listo');
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.close()));
    await Promise.all([this.planQueue.close(), this.deliveryQueue.close()]);
    await this.connection.quit();
  }

  private async plan(): Promise<void> {
    const now = new Date();
    const summary = await this.planner.run(now);
    const stale = await this.prisma.notification.findMany({
      where: { status: 'QUEUED', createdAt: { lt: new Date(now.getTime() - STALE_QUEUED_MS) } },
      select: { id: true },
      take: 500,
    });

    await this.enqueue([...summary.queued, ...stale.map((row) => row.id)]);
  }

  private async enqueue(ids: readonly string[]): Promise<void> {
    await this.deliveryQueue.addBulk(
      [...new Set(ids)].map((notificationId) => ({
        name: 'deliver',
        data: { notificationId },
        opts: {
          jobId: notificationId,
          attempts: MAX_DELIVERY_ATTEMPTS,
          backoff: { type: 'exponential', delay: RETRY_DELAY_MS },
          removeOnComplete: true,
          removeOnFail: 1000,
        },
      })),
    );
  }

  private async deliver(job: Job<DeliveryData>): Promise<void> {
    const outcome = await this.delivery.deliver(job.data.notificationId);

    if (outcome === 'RETRY') {
      throw new Error(`El aviso ${job.data.notificationId} se reintentará`);
    }
  }
}
