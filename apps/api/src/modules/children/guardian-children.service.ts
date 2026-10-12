import { Injectable } from '@nestjs/common';
import type { GuardianChildName, Sex } from '@carnet/contracts';
import { DomainError } from '../../common/errors/domain-error';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { expireStaleLinks } from './stale-links';

export interface LinkedChild extends GuardianChildName {
  sex: Sex;
  birthDate: string;
  gestationalWeeks: number | null;
}

const LINKED_CHILD_SELECT = {
  id: true,
  givenNames: true,
  paternalSurname: true,
  maternalSurname: true,
  sex: true,
  birthDate: true,
  gestationalWeeks: true,
} as const;

@Injectable()
export class GuardianChildrenService {
  constructor(private readonly prisma: PrismaService) {}

  async childrenOf(accountId: string): Promise<GuardianChildName[]> {
    const children = await this.linkedChildren(accountId);

    return children.map(({ id, givenNames, paternalSurname, maternalSurname }) => ({ id, givenNames, paternalSurname, maternalSurname }));
  }

  async linkedChildren(accountId: string): Promise<LinkedChild[]> {
    const links = await this.prisma.guardianLink.findMany({
      where: { status: 'ACTIVE', guardian: { accountId } },
      include: { child: { select: LINKED_CHILD_SELECT } },
      orderBy: { child: { birthDate: 'desc' } },
    });

    return links.map(({ child }) => ({ ...child, birthDate: child.birthDate.toISOString().slice(0, 10) }));
  }

  async childrenWithActiveGuardians(): Promise<string[]> {
    const links = await this.prisma.guardianLink.findMany({
      where: { status: 'ACTIVE', guardian: { accountId: { not: null } } },
      select: { childId: true },
      distinct: ['childId'],
    });

    return links.map((link) => link.childId);
  }

  expirePendingLinks(now: Date): Promise<number> {
    return expireStaleLinks(this.prisma, 'ALL', now);
  }

  async registeredEmail(accountId: string): Promise<string | null> {
    const guardian = await this.prisma.guardian.findUnique({ where: { accountId }, select: { email: true } });

    return guardian?.email ?? null;
  }

  async guardianAccountsOf(childId: string): Promise<{ accountId: string; email: string | null }[]> {
    const links = await this.prisma.guardianLink.findMany({
      where: { childId, status: 'ACTIVE', guardian: { accountId: { not: null } } },
      select: { guardian: { select: { accountId: true, email: true } } },
    });

    return links.flatMap(({ guardian }) => (guardian.accountId === null ? [] : [{ accountId: guardian.accountId, email: guardian.email }]));
  }

  async linkedChild(accountId: string, childId: string): Promise<LinkedChild> {
    const link = await this.prisma.guardianLink.findFirst({
      where: { status: 'ACTIVE', childId, guardian: { accountId } },
      include: { child: { select: LINKED_CHILD_SELECT } },
    });

    if (link === null) {
      throw DomainError.notFound('No encontramos ese carnet en tu cuenta.');
    }

    return { ...link.child, birthDate: link.child.birthDate.toISOString().slice(0, 10) };
  }
}
