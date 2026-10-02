import { Injectable } from '@nestjs/common';
import type { AuditEventItem, Page } from '@carnet/contracts';
import { Prisma } from '@prisma/client';
import { toJson } from '../../infrastructure/idempotency/to-json';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { Tx } from '../../infrastructure/prisma/transaction';

export interface AuditRecord {
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}

export interface AuditQuery {
  cursor?: string;
  limit: number;
  entity?: string;
  actorId?: string;
}

function jsonOrNull(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return toJson(value) ?? Prisma.DbNull;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(tx: Tx, event: AuditRecord): Promise<void> {
    await tx.auditEvent.create({
      data: {
        actorId: event.actorId,
        action: event.action,
        entity: event.entity,
        entityId: event.entityId,
        before: jsonOrNull(event.before),
        after: jsonOrNull(event.after),
        ip: event.ip ?? null,
      },
    });
  }

  async list(query: AuditQuery): Promise<Page<AuditEventItem>> {
    const rows = await this.prisma.auditEvent.findMany({
      where: {
        ...(query.entity === undefined ? {} : { entity: query.entity }),
        ...(query.actorId === undefined ? {} : { actorId: query.actorId }),
        ...(query.cursor === undefined ? {} : { id: { lt: BigInt(query.cursor) } }),
      },
      orderBy: { id: 'desc' },
      take: query.limit + 1,
      include: { actor: { select: { id: true, fullName: true, email: true } } },
    });

    const page = rows.slice(0, query.limit);
    const last = page.at(-1);

    return {
      items: page.map((row) => ({
        id: row.id.toString(),
        occurredAt: row.occurredAt.toISOString(),
        actor: row.actor,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        before: row.before,
        after: row.after,
      })),
      nextCursor: rows.length > query.limit && last !== undefined ? last.id.toString() : null,
    };
  }
}
