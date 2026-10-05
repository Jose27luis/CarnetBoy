import { type GrowthIndicator, lmsAt, type LmsRow, type ReferenceSex } from './who-tables';

export type MeasurementPosition = 'LYING' | 'STANDING';

export const TWO_YEARS_DAYS = 731;
const POSITION_CONVERSION_CM = 0.7;
const WEIGHT_INDICATORS: readonly GrowthIndicator[] = ['WEIGHT_FOR_AGE', 'WEIGHT_FOR_LENGTH', 'WEIGHT_FOR_HEIGHT'];

export type WeightForAgeClass = 'SEVERELY_UNDERWEIGHT' | 'UNDERWEIGHT' | 'NORMAL';
export type LengthForAgeClass = 'SEVERELY_STUNTED' | 'STUNTED' | 'NORMAL';
export type WeightForLengthClass = 'SEVERELY_WASTED' | 'WASTED' | 'NORMAL' | 'OVERWEIGHT' | 'OBESE';
export type HeadForAgeClass = 'MICROCEPHALY' | 'NORMAL' | 'MACROCEPHALY';

export interface GrowthMeasurement {
  sex: ReferenceSex;
  ageDays: number;
  weightKg: number;
  lengthCm: number;
  position: MeasurementPosition;
  headCircumferenceCm: number | null;
}

export interface GrowthAssessment {
  zWeightForAge: number | null;
  zLengthForAge: number | null;
  zWeightForLength: number | null;
  zHeadForAge: number | null;
  weightForAge: WeightForAgeClass | null;
  lengthForAge: LengthForAgeClass | null;
  weightForLength: WeightForLengthClass | null;
  headForAge: HeadForAgeClass | null;
}

function valueAtZ(row: LmsRow, z: number): number {
  return row.m * Math.pow(1 + row.l * row.s * z, 1 / row.l);
}

function rawZ(row: LmsRow, value: number): number {
  return Math.abs(row.l) < 1e-9 ? Math.log(value / row.m) / row.s : (Math.pow(value / row.m, row.l) - 1) / (row.l * row.s);
}

export function zScoreFromRow(row: LmsRow, value: number, weightBased: boolean): number {
  const z = rawZ(row, value);

  if (!weightBased || Math.abs(z) <= 3) {
    return z;
  }

  if (z > 3) {
    const sd3 = valueAtZ(row, 3);
    return 3 + (value - sd3) / (sd3 - valueAtZ(row, 2));
  }

  const sd3neg = valueAtZ(row, -3);
  return -3 + (value - sd3neg) / (valueAtZ(row, -2) - sd3neg);
}

export function zScore(indicator: GrowthIndicator, sex: ReferenceSex, x: number, value: number): number | null {
  const row = lmsAt(indicator, sex, x);

  return row === null ? null : zScoreFromRow(row, value, WEIGHT_INDICATORS.includes(indicator));
}

export function lengthForReference(ageDays: number, lengthCm: number, position: MeasurementPosition): number {
  if (ageDays < TWO_YEARS_DAYS && position === 'STANDING') {
    return lengthCm + POSITION_CONVERSION_CM;
  }

  if (ageDays >= TWO_YEARS_DAYS && position === 'LYING') {
    return lengthCm - POSITION_CONVERSION_CM;
  }

  return lengthCm;
}

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number | null): number | null {
  return value === null ? null : Math.round(value * 100) / 100;
}

export function classifyWeightForAge(z: number | null): WeightForAgeClass | null {
  return z === null ? null : z < -3 ? 'SEVERELY_UNDERWEIGHT' : z < -2 ? 'UNDERWEIGHT' : 'NORMAL';
}

export function classifyLengthForAge(z: number | null): LengthForAgeClass | null {
  return z === null ? null : z < -3 ? 'SEVERELY_STUNTED' : z < -2 ? 'STUNTED' : 'NORMAL';
}

export function classifyWeightForLength(z: number | null): WeightForLengthClass | null {
  if (z === null) {
    return null;
  }

  return z < -3 ? 'SEVERELY_WASTED' : z < -2 ? 'WASTED' : z > 3 ? 'OBESE' : z > 2 ? 'OVERWEIGHT' : 'NORMAL';
}

export function classifyHeadForAge(z: number | null): HeadForAgeClass | null {
  return z === null ? null : z < -2 ? 'MICROCEPHALY' : z > 2 ? 'MACROCEPHALY' : 'NORMAL';
}

export function assessGrowth(measurement: GrowthMeasurement): GrowthAssessment {
  const { sex, ageDays, weightKg, position, headCircumferenceCm } = measurement;
  const length = roundTenth(lengthForReference(ageDays, measurement.lengthCm, position));
  const weightForLengthIndicator: GrowthIndicator = ageDays < TWO_YEARS_DAYS ? 'WEIGHT_FOR_LENGTH' : 'WEIGHT_FOR_HEIGHT';
  const zWeightForAge = round2(zScore('WEIGHT_FOR_AGE', sex, ageDays, weightKg));
  const zLengthForAge = round2(zScore('LENGTH_FOR_AGE', sex, ageDays, length));
  const zWeightForLength = round2(zScore(weightForLengthIndicator, sex, length, weightKg));
  const zHeadForAge = headCircumferenceCm === null ? null : round2(zScore('HEAD_FOR_AGE', sex, ageDays, headCircumferenceCm));

  return {
    zWeightForAge,
    zLengthForAge,
    zWeightForLength,
    zHeadForAge,
    weightForAge: classifyWeightForAge(zWeightForAge),
    lengthForAge: classifyLengthForAge(zLengthForAge),
    weightForLength: classifyWeightForLength(zWeightForLength),
    headForAge: classifyHeadForAge(zHeadForAge),
  };
}
