import { Injectable } from '@nestjs/common';
import type { FacilityActivity } from '@carnet/contracts';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class FacilityActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async perFacility(): Promise<FacilityActivity[]> {
    const [children, links] = await Promise.all([
      this.prisma.child.groupBy({ by: ['createdAtFacilityId'], _count: { _all: true } }),
      this.prisma.guardianLink.groupBy({ by: ['facilityId'], _count: { _all: true } }),
    ]);
    const activity = new Map<string, FacilityActivity>();

    for (const row of children) {
      activity.set(row.createdAtFacilityId, { facilityId: row.createdAtFacilityId, childrenRegistered: row._count._all, linksCreated: 0 });
    }

    for (const row of links) {
      const current = activity.get(row.facilityId) ?? { facilityId: row.facilityId, childrenRegistered: 0, linksCreated: 0 };
      activity.set(row.facilityId, { ...current, linksCreated: row._count._all });
    }

    return [...activity.values()];
  }
}
