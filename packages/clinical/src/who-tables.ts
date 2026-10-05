import hcfaBoys from './who-2006/hcfa-boys.json';
import hcfaGirls from './who-2006/hcfa-girls.json';
import lhfaBoys from './who-2006/lhfa-boys.json';
import lhfaGirls from './who-2006/lhfa-girls.json';
import wfaBoys from './who-2006/wfa-boys.json';
import wfaGirls from './who-2006/wfa-girls.json';
import wfhBoys from './who-2006/wfh-boys.json';
import wfhGirls from './who-2006/wfh-girls.json';
import wflBoys from './who-2006/wfl-boys.json';
import wflGirls from './who-2006/wfl-girls.json';

export const WHO_REFERENCE_VERSION = 'OMS 2006';

export type GrowthIndicator = 'WEIGHT_FOR_AGE' | 'LENGTH_FOR_AGE' | 'HEAD_FOR_AGE' | 'WEIGHT_FOR_LENGTH' | 'WEIGHT_FOR_HEIGHT';
export type ReferenceSex = 'FEMALE' | 'MALE';

export interface LmsRow {
  x: number;
  l: number;
  m: number;
  s: number;
}

interface RawTable {
  rows: number[][];
}

interface LmsTable {
  byKey: Map<number, LmsRow>;
  step: number;
}

function keyOf(x: number, step: number): number {
  return Math.round(x / step);
}

function build(raw: RawTable, step: number): LmsTable {
  const byKey = new Map<number, LmsRow>();

  for (const row of raw.rows) {
    const [x, l, m, s] = row;

    if (x === undefined || l === undefined || m === undefined || s === undefined) {
      throw new Error('La tabla de la OMS tiene una fila incompleta.');
    }

    byKey.set(keyOf(x, step), { x, l, m, s });
  }

  return { byKey, step };
}

const DAY = 1;
const TENTH_CM = 0.1;

const TABLES: Record<GrowthIndicator, Record<ReferenceSex, LmsTable>> = {
  WEIGHT_FOR_AGE: { MALE: build(wfaBoys, DAY), FEMALE: build(wfaGirls, DAY) },
  LENGTH_FOR_AGE: { MALE: build(lhfaBoys, DAY), FEMALE: build(lhfaGirls, DAY) },
  HEAD_FOR_AGE: { MALE: build(hcfaBoys, DAY), FEMALE: build(hcfaGirls, DAY) },
  WEIGHT_FOR_LENGTH: { MALE: build(wflBoys, TENTH_CM), FEMALE: build(wflGirls, TENTH_CM) },
  WEIGHT_FOR_HEIGHT: { MALE: build(wfhBoys, TENTH_CM), FEMALE: build(wfhGirls, TENTH_CM) },
};

export function lmsAt(indicator: GrowthIndicator, sex: ReferenceSex, x: number): LmsRow | null {
  const table = TABLES[indicator][sex];

  return table.byKey.get(keyOf(x, table.step)) ?? null;
}
