import { rangesOverlap } from './age-ranges';

describe('rangesOverlap', () => {
  it('detecta rangos que comparten un extremo', () => {
    expect(rangesOverlap({ minAgeMonths: 6, maxAgeMonths: 11 }, { minAgeMonths: 11, maxAgeMonths: 23 })).toBe(true);
  });

  it('acepta rangos contiguos', () => {
    expect(rangesOverlap({ minAgeMonths: 6, maxAgeMonths: 11 }, { minAgeMonths: 12, maxAgeMonths: 23 })).toBe(false);
  });

  it('detecta un rango contenido en otro', () => {
    expect(rangesOverlap({ minAgeMonths: 0, maxAgeMonths: 59 }, { minAgeMonths: 12, maxAgeMonths: 23 })).toBe(true);
  });
});
