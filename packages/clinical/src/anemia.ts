export type AnemiaClass = 'NONE' | 'MILD' | 'MODERATE' | 'SEVERE' | 'UNCLASSIFIED';

export interface AltitudeAdjustment {
  minAltitude: number;
  maxAltitude: number;
  subtract: number;
}

export interface HemoglobinThresholdRow {
  minAgeMonths: number;
  maxAgeMonths: number;
  normalFrom: number;
  mildFrom: number;
  moderateFrom: number;
}

export interface AdjustedHemoglobin {
  adjustment: number;
  adjusted: number;
}

function tenths(value: number): number {
  return Math.round(value * 10);
}

export function adjustHemoglobin(observed: number, altitudeMeters: number, adjustments: readonly AltitudeAdjustment[]): AdjustedHemoglobin {
  const band = adjustments.find((item) => altitudeMeters >= item.minAltitude && altitudeMeters <= item.maxAltitude);

  if (band === undefined) {
    throw new RangeError(`No hay ajuste de hemoglobina para ${altitudeMeters} m s. n. m. en el catálogo vigente.`);
  }

  return { adjustment: band.subtract, adjusted: (tenths(observed) - tenths(band.subtract)) / 10 };
}

export function classifyAnemia(adjusted: number, ageMonths: number, thresholds: readonly HemoglobinThresholdRow[]): AnemiaClass {
  const row = thresholds.find((item) => ageMonths >= item.minAgeMonths && ageMonths <= item.maxAgeMonths);

  if (row === undefined) {
    return 'UNCLASSIFIED';
  }

  const value = tenths(adjusted);

  if (value >= tenths(row.normalFrom)) {
    return 'NONE';
  }

  if (value >= tenths(row.mildFrom)) {
    return 'MILD';
  }

  return value >= tenths(row.moderateFrom) ? 'MODERATE' : 'SEVERE';
}

export function findAltitudeGaps(adjustments: readonly AltitudeAdjustment[], from: number, to: number): string[] {
  const sorted = [...adjustments].sort((left, right) => left.minAltitude - right.minAltitude);
  const problems: string[] = [];
  let expected = from;

  for (const band of sorted) {
    if (band.minAltitude > expected) {
      problems.push(`Falta el tramo de ${expected} a ${band.minAltitude - 1} m.`);
    }

    if (band.minAltitude < expected) {
      problems.push(`El tramo que empieza en ${band.minAltitude} m se cruza con el anterior.`);
    }

    expected = Math.max(expected, band.maxAltitude + 1);
  }

  if (expected <= to) {
    problems.push(`Falta el tramo de ${expected} a ${to} m.`);
  }

  return problems;
}
