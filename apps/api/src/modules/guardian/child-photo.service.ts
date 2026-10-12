import { Injectable } from '@nestjs/common';
import { DomainError } from '../../common/errors/domain-error';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { GuardianChildrenService } from '../children/guardian-children.service';

export const PHOTO_MAX_BYTES = 700 * 1024;
const PHOTO_MIN_BYTES = 100;

export interface StoredPhoto {
  contentType: string;
  data: Buffer;
  updatedAt: Date;
}

export function detectImageType(data: Buffer): string | null {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return 'image/jpeg';
  }

  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }

  if (data.length >= 12 && data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }

  return null;
}

@Injectable()
export class ChildPhotoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guardianChildren: GuardianChildrenService,
  ) {}

  async versions(accountId: string): Promise<Map<string, string>> {
    const rows = await this.prisma.childPhoto.findMany({ where: { accountId }, select: { childId: true, updatedAt: true } });

    return new Map(rows.map((row) => [row.childId, row.updatedAt.getTime().toString(36)]));
  }

  async save(accountId: string, childId: string, base64: string): Promise<void> {
    await this.guardianChildren.linkedChild(accountId, childId);
    const data = Buffer.from(base64, 'base64');
    const contentType = detectImageType(data);

    if (contentType === null) {
      throw DomainError.validation({ photo: ['Usa una foto en formato JPG, PNG o WebP.'] });
    }

    if (data.length < PHOTO_MIN_BYTES || data.length > PHOTO_MAX_BYTES) {
      throw DomainError.validation({ photo: ['La foto debe pesar menos de 700 KB.'] });
    }

    await this.prisma.childPhoto.upsert({
      where: { accountId_childId: { accountId, childId } },
      create: { accountId, childId, contentType, data },
      update: { contentType, data },
    });
  }

  async load(accountId: string, childId: string): Promise<StoredPhoto> {
    await this.guardianChildren.linkedChild(accountId, childId);
    const photo = await this.prisma.childPhoto.findUnique({ where: { accountId_childId: { accountId, childId } } });

    if (photo === null) {
      throw DomainError.notFound('El niño no tiene foto.');
    }

    return { contentType: photo.contentType, data: Buffer.from(photo.data), updatedAt: photo.updatedAt };
  }

  async remove(accountId: string, childId: string): Promise<void> {
    await this.prisma.childPhoto.deleteMany({ where: { accountId, childId } });
  }
}
