import { Injectable } from '@nestjs/common';
import type { Vaccine } from '@carnet/contracts';
import type { Vaccine as VaccineRow } from '@prisma/client';
import { DomainError } from '../../common/errors/domain-error';
import type { AuthenticatedUser } from '../../infrastructure/auth/authenticated-user';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { isUniqueViolation } from '../../infrastructure/prisma/unique-violation';
import { AuditService } from '../audit/audit.service';

export interface NewVaccine {
  code: string;
  name: string;
  prevents: string;
}

export interface VaccineChanges {
  name?: string;
  prevents?: string;
}

export function toVaccine(row: VaccineRow): Vaccine {
  return { id: row.id, code: row.code, name: row.name, prevents: row.prevents };
}

@Injectable()
export class VaccinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<Vaccine[]> {
    const rows = await this.prisma.vaccine.findMany({ orderBy: { name: 'asc' } });

    return rows.map(toVaccine);
  }

  async create(actor: AuthenticatedUser, input: NewVaccine, ip: string): Promise<Vaccine> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.vaccine.create({
          data: { code: input.code.trim().toUpperCase(), name: input.name.trim(), prevents: input.prevents.trim() },
        });
        await this.audit.record(tx, {
          actorId: actor.id,
          action: 'vaccine.created',
          entity: 'vaccine',
          entityId: created.id,
          after: toVaccine(created),
          ip,
        });

        return toVaccine(created);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw DomainError.conflict('VACCINE_CODE_TAKEN', 'Ya existe una vacuna con ese código.');
      }

      throw error;
    }
  }

  async update(actor: AuthenticatedUser, vaccineId: string, changes: VaccineChanges, ip: string): Promise<Vaccine> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.vaccine.findUnique({ where: { id: vaccineId } });

      if (current === null) {
        throw DomainError.notFound('La vacuna no existe.');
      }

      const updated = await tx.vaccine.update({
        where: { id: vaccineId },
        data: {
          ...(changes.name === undefined ? {} : { name: changes.name.trim() }),
          ...(changes.prevents === undefined ? {} : { prevents: changes.prevents.trim() }),
        },
      });
      await this.audit.record(tx, {
        actorId: actor.id,
        action: 'vaccine.updated',
        entity: 'vaccine',
        entityId: vaccineId,
        before: toVaccine(current),
        after: toVaccine(updated),
        ip,
      });

      return toVaccine(updated);
    });
  }
}
