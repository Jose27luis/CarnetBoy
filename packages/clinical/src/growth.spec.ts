import { assessGrowth, lengthForReference, zScore } from './growth';

function expectZ(actual: number | null, expected: number): void {
  expect(actual).not.toBeNull();
  expect(actual ?? Number.NaN).toBeCloseTo(expected, 1);
}

describe('puntaje Z con los valores oficiales de la OMS 2006', () => {
  it('peso para la edad, niños al nacer: mediana, ±2 y la extrapolación más allá de +3', () => {
    expectZ(zScore('WEIGHT_FOR_AGE', 'MALE', 0, 3.346), 0);
    expectZ(zScore('WEIGHT_FOR_AGE', 'MALE', 0, 2.459), -2);
    expectZ(zScore('WEIGHT_FOR_AGE', 'MALE', 0, 4.419), 2);
    expectZ(zScore('WEIGHT_FOR_AGE', 'MALE', 0, 5.642), 4);
  });

  it('peso para la edad, niñas de 183 días: la extrapolación por debajo de −3', () => {
    expectZ(zScore('WEIGHT_FOR_AGE', 'FEMALE', 183, 7.302), 0);
    expectZ(zScore('WEIGHT_FOR_AGE', 'FEMALE', 183, 5.088), -3);
    expectZ(zScore('WEIGHT_FOR_AGE', 'FEMALE', 183, 4.444), -4);
  });

  it('longitud para la edad, niñas de 1 año', () => {
    expectZ(zScore('LENGTH_FOR_AGE', 'FEMALE', 365, 74.005), 0);
    expectZ(zScore('LENGTH_FOR_AGE', 'FEMALE', 365, 68.856), -2);
    expectZ(zScore('LENGTH_FOR_AGE', 'FEMALE', 365, 81.729), 3);
  });

  it('perímetro cefálico para la edad, niños de 2 años', () => {
    expectZ(zScore('HEAD_FOR_AGE', 'MALE', 730, 48.249), 0);
    expectZ(zScore('HEAD_FOR_AGE', 'MALE', 730, 45.527), -2);
    expectZ(zScore('HEAD_FOR_AGE', 'MALE', 730, 50.972), 2);
  });

  it('peso para la longitud de 75 cm en niñas y para la talla de 100 cm en niños', () => {
    expectZ(zScore('WEIGHT_FOR_LENGTH', 'FEMALE', 75, 9.149), 0);
    expectZ(zScore('WEIGHT_FOR_LENGTH', 'FEMALE', 75, 11.026), 2);
    expectZ(zScore('WEIGHT_FOR_HEIGHT', 'MALE', 100, 13.087), -2);
    expectZ(zScore('WEIGHT_FOR_HEIGHT', 'MALE', 100, 19.883), 3);
  });

  it('devuelve null fuera del rango de la tabla', () => {
    expect(zScore('WEIGHT_FOR_AGE', 'MALE', 2000, 15)).toBeNull();
    expect(zScore('WEIGHT_FOR_LENGTH', 'MALE', 120, 15)).toBeNull();
  });
});

describe('evaluación del control', () => {
  it('convierte la talla de pie antes de los 2 años y la longitud acostado después', () => {
    expect(lengthForReference(300, 70, 'STANDING')).toBeCloseTo(70.7);
    expect(lengthForReference(900, 90, 'LYING')).toBeCloseTo(89.3);
    expect(lengthForReference(900, 90, 'STANDING')).toBe(90);
  });

  it('clasifica a una niña de 1 año en la mediana como normal en todos los indicadores', () => {
    const result = assessGrowth({ sex: 'FEMALE', ageDays: 365, weightKg: 8.9, lengthCm: 74, position: 'LYING', headCircumferenceCm: 44.9 });

    expect(result.lengthForAge).toBe('NORMAL');
    expect(result.weightForAge).toBe('NORMAL');
    expect(result.weightForLength).toBe('NORMAL');
    expect(result.zLengthForAge).toBeCloseTo(0, 1);
  });

  it('detecta talla baja severa y desnutrición aguda', () => {
    const result = assessGrowth({ sex: 'MALE', ageDays: 730, weightKg: 8.2, lengthCm: 78, position: 'LYING', headCircumferenceCm: null });

    expect(result.lengthForAge).toBe('SEVERELY_STUNTED');
    expect(result.weightForLength).toBe('WASTED');
    expect(result.zWeightForLength).toBeCloseTo(-2.58, 2);
    expect(result.headForAge).toBeNull();
  });
});
