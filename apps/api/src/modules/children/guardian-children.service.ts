import { Injectable } from '@nestjs/common';
import type { GuardianChildName } from '@carnet/contracts';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class GuardianChildrenService {
  constructor(private readonly prisma: PrismaService) {}

  async childrenOf(accountId: string): Promise<GuardianChildName[]> {
    const links = await this.prisma.guardianLink.findMany({
      where: { status: 'ACTIVE', guardian: { accountId } },
      include: { child: { select: { id: true, givenNames: true, paternalSurname: true, maternalSurname: true } } },
      orderBy: { child: { birthDate: 'desc' } },
    });

    return links.map(({ child }) => child);
  }
}
