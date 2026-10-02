import { HttpStatus, Injectable } from '@nestjs/common';
import type { Facility, FacilityAssignmentItem } from '@carnet/contracts';
import type { Facility as FacilityRow } from '@prisma/client';
import { DomainError } from '../../common/errors/domain-error';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { isUniqueViolation, violatedUniqueIndex } from '../../infrastructure/prisma/unique-violation';
import { AuditService } from '../audit/audit.service';
import { StaffAccountsService } from '../identity/accounts/staff-accounts.service';

export const ONE_ACTIVE_ASSIGNMENT_INDEX = 'facility_assignments_one_active';

export interface NewFacility {
  ipressCode: string;
  name: string;
  healthNetwork: string;
  altitudeMeters: number;
}

export interface FacilityChanges {
  name?: string;
  healthNetwork?: string;
  altitudeMeters?: number;
  active?: boolean;
  expectedVersion: number;
}

export function toFacility(row: FacilityRow): Facility {
  return {
    id: row.id,
    ipressCode: row.ipressCode,
    name: row.name,
    healthNetwork: row.healthNetwork,
    altitudeMeters: row.altitudeMeters,
    active: row.active,
    version: row.version,
  };
}

@Injectable()
export class FacilitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly staffAccounts: StaffAccountsService,
  ) {}

  async list(): Promise<Facility[]> {
    const rows = await this.prisma.facility.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] });

    return rows.map(toFacility);
  }

  async create(actor: AuthenticatedUser, input: NewFacility, ip: string): Promise<Facility> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.facility.create({
          data: {
            ipressCode: input.ipressCode,
            name: input.name.trim(),
            healthNetwork: input.healthNetwork.trim(),
            altitudeMeters: input.altitudeMeters,
          },
        });
        await this.audit.record(tx, {
          actorId: actor.id,
          action: 'facility.created',
          entity: 'facility',
          entityId: created.id,
          after: toFacility(created),
          ip,
        });

        return toFacility(created);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw DomainError.conflict('IPRESS_CODE_TAKEN', 'Ya existe un establecimiento con ese código IPRESS.');
      }

      throw error;
    }
  }

  async update(actor: AuthenticatedUser, facilityId: string, changes: FacilityChanges, ip: string): Promise<Facility> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.facility.findUnique({ where: { id: facilityId } });

      if (current === null) {
        throw DomainError.notFound('El establecimiento no existe.');
      }

      const result = await tx.facility.updateMany({
        where: { id: facilityId, version: changes.expectedVersion },
        data: {
          ...(changes.name === undefined ? {} : { name: changes.name.trim() }),
          ...(changes.healthNetwork === undefined ? {} : { healthNetwork: changes.healthNetwork.trim() }),
          ...(changes.altitudeMeters === undefined ? {} : { altitudeMeters: changes.altitudeMeters }),
          ...(changes.active === undefined ? {} : { active: changes.active }),
          version: { increment: 1 },
        },
      });

      if (result.count === 0) {
        throw DomainError.conflict('VERSION_CONFLICT', 'Otra persona modificó este establecimiento. Recarga y vuelve a intentarlo.');
      }

      const updated = await tx.facility.findUniqueOrThrow({ where: { id: facilityId } });
      await this.audit.record(tx, {
        actorId: actor.id,
        action: 'facility.updated',
        entity: 'facility',
        entityId: facilityId,
        before: toFacility(current),
        after: toFacility(updated),
        ip,
      });

      return toFacility(updated);
    });
  }

  async activeAssignments(): Promise<FacilityAssignmentItem[]> {
    const rows = await this.prisma.facilityAssignment.findMany({
      where: { endedAt: null },
      include: { facility: { select: { name: true, ipressCode: true } } },
      orderBy: { startedAt: 'asc' },
    });

    return rows.map((row) => ({
      accountId: row.accountId,
      facilityId: row.facilityId,
      facilityName: row.facility.name,
      ipressCode: row.facility.ipressCode,
      startedAt: row.startedAt.toISOString(),
    }));
  }

  async assign(actor: AuthenticatedUser, facilityId: string, accountId: string, ip: string): Promise<FacilityAssignmentItem> {
    if ((await this.staffAccounts.staffRoleOf(accountId)) !== 'DIGITIZER') {
      throw DomainError.unprocessable('ROLE_NOT_ASSIGNABLE', 'Solo se asignan establecimientos a cuentas de digitador.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const facility = await tx.facility.findUnique({ where: { id: facilityId } });

        if (facility === null) {
          throw DomainError.notFound('El establecimiento no existe.');
        }

        if (!facility.active) {
          throw DomainError.unprocessable('FACILITY_INACTIVE', 'El establecimiento está desactivado.');
        }

        const assignment = await tx.facilityAssignment.create({
          data: { accountId, facilityId, grantedById: actor.id },
        });
        await this.audit.record(tx, {
          actorId: actor.id,
          action: 'facility.assignment_started',
          entity: 'facility',
          entityId: facilityId,
          after: { accountId },
          ip,
        });

        return {
          accountId,
          facilityId,
          facilityName: facility.name,
          ipressCode: facility.ipressCode,
          startedAt: assignment.startedAt.toISOString(),
        };
      });
    } catch (error) {
      if (violatedUniqueIndex(error) === ONE_ACTIVE_ASSIGNMENT_INDEX) {
        throw DomainError.conflict('ASSIGNMENT_ALREADY_ACTIVE', 'El digitador ya está asignado a este establecimiento.');
      }

      throw error;
    }
  }

  async endAssignment(actor: AuthenticatedUser, facilityId: string, accountId: string, ip: string, now: Date = new Date()): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const ended = await tx.facilityAssignment.updateMany({
        where: { facilityId, accountId, endedAt: null },
        data: { endedAt: now, endedById: actor.id },
      });

      if (ended.count === 0) {
        throw new DomainError(HttpStatus.CONFLICT, 'ASSIGNMENT_NOT_ACTIVE', 'El digitador no tiene una asignación vigente en este establecimiento.');
      }

      await this.audit.record(tx, {
        actorId: actor.id,
        action: 'facility.assignment_ended',
        entity: 'facility',
        entityId: facilityId,
        before: { accountId },
        ip,
      });
    });
  }
}
