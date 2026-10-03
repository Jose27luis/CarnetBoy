import { ACTIVATION_CODE_PATTERN } from '@carnet/contracts';
import { generateActivationCode, hashActivationCode, normalizeActivationCode } from './activation-code';

describe('código de activación', () => {
  it('genera códigos de 8 caracteres sin letras ni números ambiguos', () => {
    for (let index = 0; index < 200; index += 1) {
      expect(generateActivationCode()).toMatch(ACTIVATION_CODE_PATTERN);
    }
  });

  it('acepta el código con minúsculas, espacios o guiones', () => {
    expect(normalizeActivationCode('ab3d-ef7h')).toBe('AB3DEF7H');
    expect(hashActivationCode('ab3d ef7h')).toBe(hashActivationCode('AB3DEF7H'));
  });
});
