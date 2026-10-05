import { adjustHemoglobin, classifyAnemia, findAltitudeGaps, type AltitudeAdjustment, type HemoglobinThresholdRow } from './anemia';

const NTS_213_ALTITUDE: AltitudeAdjustment[] = [
  { minAltitude: 0, maxAltitude: 499, subtract: 0 },
  { minAltitude: 500, maxAltitude: 999, subtract: 0.4 },
  { minAltitude: 1000, maxAltitude: 1499, subtract: 0.8 },
  { minAltitude: 1500, maxAltitude: 1999, subtract: 1.1 },
  { minAltitude: 2000, maxAltitude: 2499, subtract: 1.4 },
  { minAltitude: 2500, maxAltitude: 2999, subtract: 1.8 },
  { minAltitude: 3000, maxAltitude: 3499, subtract: 2.1 },
  { minAltitude: 3500, maxAltitude: 3999, subtract: 2.5 },
  { minAltitude: 4000, maxAltitude: 4499, subtract: 2.9 },
  { minAltitude: 4500, maxAltitude: 4999, subtract: 3.3 },
];

const NTS_213_THRESHOLDS: HemoglobinThresholdRow[] = [
  { minAgeMonths: 6, maxAgeMonths: 23, normalFrom: 10.5, mildFrom: 9.5, moderateFrom: 7 },
  { minAgeMonths: 24, maxAgeMonths: 59, normalFrom: 11, mildFrom: 10, moderateFrom: 7 },
  { minAgeMonths: 60, maxAgeMonths: 143, normalFrom: 11.5, mildFrom: 11, moderateFrom: 8 },
];

describe('ajuste de hemoglobina por altitud (NTS 213, Tabla N° 1)', () => {
  it.each(NTS_213_ALTITUDE.map((band) => [band.minAltitude, band.maxAltitude, band.subtract]))(
    'entre %i y %i m resta %d g/dL',
    (min, max, subtract) => {
      expect(adjustHemoglobin(12, min, NTS_213_ALTITUDE).adjustment).toBe(subtract);
      expect(adjustHemoglobin(12, max, NTS_213_ALTITUDE).adjustment).toBe(subtract);
    },
  );

  it('resta sin errores de redondeo', () => {
    expect(adjustHemoglobin(12.3, 3400, NTS_213_ALTITUDE).adjusted).toBe(10.2);
  });

  it('rechaza una altitud fuera de la tabla', () => {
    expect(() => adjustHemoglobin(12, 5200, NTS_213_ALTITUDE)).toThrow(RangeError);
  });
});

describe('clasificación de anemia (NTS 213, Tabla N° 13)', () => {
  it.each([
    [12, 10.5, 'NONE'],
    [12, 10.4, 'MILD'],
    [12, 9.5, 'MILD'],
    [12, 9.4, 'MODERATE'],
    [12, 7, 'MODERATE'],
    [12, 6.9, 'SEVERE'],
    [30, 11, 'NONE'],
    [30, 10.9, 'MILD'],
    [30, 9.9, 'MODERATE'],
    [70, 11.4, 'MILD'],
    [70, 7.9, 'SEVERE'],
  ] as const)('a los %i meses, %d g/dL es %s', (ageMonths, adjusted, expected) => {
    expect(classifyAnemia(adjusted, ageMonths, NTS_213_THRESHOLDS)).toBe(expected);
  });

  it('no clasifica a un menor de 6 meses sin umbral para su edad', () => {
    expect(classifyAnemia(10, 4, NTS_213_THRESHOLDS)).toBe('UNCLASSIFIED');
  });
});

describe('tramos de altitud', () => {
  it('acepta la tabla completa de la norma', () => {
    expect(findAltitudeGaps(NTS_213_ALTITUDE, 0, 4999)).toEqual([]);
  });

  it('detecta huecos y cruces', () => {
    const broken = NTS_213_ALTITUDE.filter((band) => band.minAltitude !== 1000).concat({ minAltitude: 4400, maxAltitude: 4600, subtract: 3 });

    expect(findAltitudeGaps(broken, 0, 4999).length).toBeGreaterThanOrEqual(2);
  });
});
