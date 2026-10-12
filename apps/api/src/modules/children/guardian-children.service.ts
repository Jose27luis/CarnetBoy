import { Injectable } from '@nestjs/common';
import type { GuardianChildName, Sex } from '@carnet/contracts';
import { DomainError } from '../../common/errors/domain-error';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

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
