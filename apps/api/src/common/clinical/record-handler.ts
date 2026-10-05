import type { ClinicalRecordType } from '@carnet/contracts';
import type { Tx } from '../../infrastructure/prisma/transaction';

export interface RecordSnapshot {
  childId: string;
  recordedById: string;
  recordedAt: Date;
  isCurrent: boolean;
  data: Record<string, unknown>;
}

export interface Supersession {
  recordId: string;
  proposed: Record<string, unknown>;
  reason: string;
  recordedById: string;
  now: Date;
}

export interface ClinicalRecordHandler {
  readonly type: ClinicalRecordType;
  snapshot(tx: Tx, recordId: string): Promise<RecordSnapshot | null>;
  parse(fields: unknown): Record<string, unknown>;
  supersede(tx: Tx, supersession: Supersession): Promise<string>;
}

export const CLINICAL_RECORD_HANDLERS = Symbol('CLINICAL_RECORD_HANDLERS');
