import { growthBands } from './growth-bands';
import { zScore } from './growth';

describe('bandas de la OMS', () => {
  it('cada banda corresponde a su puntaje Z', () => {
    const [point] = growthBands('WEIGHT_FOR_AGE', 'FEMALE', 180, 180, 1);

    expect(point?.x).toBe(180);
    point?.values.forEach((value, index) => {
      expect(zScore('WEIGHT_FOR_AGE', 'FEMALE', 180, value)).toBeCloseTo(index - 3, 1);
    });
  });

  it('muestrea el rango con el paso pedido y omite lo que queda fuera de la tabla', () => {
    expect(growthBands('LENGTH_FOR_AGE', 'MALE', 0, 60, 30).map((point) => point.x)).toEqual([0, 30, 60]);
    expect(growthBands('HEAD_FOR_AGE', 'MALE', 1850, 1900, 10).map((point) => point.x)).toEqual([1850]);
  });
});
