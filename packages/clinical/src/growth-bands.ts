import { type GrowthIndicator, lmsAt, type ReferenceSex } from './who-tables';

export const BAND_Z_SCORES = [-3, -2, -1, 0, 1, 2, 3] as const;

export interface BandPoint {
  x: number;
  values: [number, number, number, number, number, number, number];
}

function valueAt(l: number, m: number, s: number, z: number): number {
  return l === 0 ? m * Math.exp(s * z) : m * (1 + l * s * z) ** (1 / l);
}

export function growthBands(indicator: GrowthIndicator, sex: ReferenceSex, from: number, to: number, step: number): BandPoint[] {
  const points: BandPoint[] = [];

  for (let x = from; x <= to + step / 2; x += step) {
    const row = lmsAt(indicator, sex, Math.round(x * 10) / 10);

    if (row !== null) {
      const at = (z: number): number => Math.round(valueAt(row.l, row.m, row.s, z) * 100) / 100;
      points.push({ x: row.x, values: [at(-3), at(-2), at(-1), at(0), at(1), at(2), at(3)] });
    }
  }

  return points;
}
