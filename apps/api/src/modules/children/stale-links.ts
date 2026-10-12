import { Prisma } from '@prisma/client';
import type { Tx } from '../../infrastructure/prisma/transaction';

export type StaleLinkScope = { childId?: string; guardianId?: string } | 'ALL';

export async function expireStaleLinks(tx: Tx, scope: StaleLinkScope, now: Date = new Date()): Promise<number> {
  const conditions =
    scope === 'ALL'
      ? [Prisma.sql`TRUE`]
      : [
          ...(scope.childId === undefined ? [] : [Prisma.sql`l.child_id = ${scope.childId}::uuid`]),
          ...(scope.guardianId === undefined ? [] : [Prisma.sql`l.guardian_id = ${scope.guardianId}::uuid`]),
        ];

  if (conditions.length === 0) {
    return 0;
  }

  return tx.$executeRaw`
    UPDATE guardian_links l
    SET status = 'EXPIRED', version = l.version + 1, updated_at = ${now}
    WHERE l.status = 'PENDING'
      AND ${Prisma.join(conditions, ' AND ')}
      AND NOT EXISTS (
        SELECT 1 FROM activation_codes c
        WHERE c.link_id = l.id AND c.used_at IS NULL AND c.revoked_at IS NULL AND c.expires_at > ${now}
      )
  `;
}
