import { TotpSecretCipher } from './totp-secret-cipher';

const KEY = Buffer.alloc(32, 3).toString('base64');

describe('TotpSecretCipher', () => {
  it('recupera el secreto original', () => {
    const cipher = new TotpSecretCipher(KEY);

    expect(cipher.decrypt(cipher.encrypt('JBSWY3DPEHPK3PXP'))).toBe('JBSWY3DPEHPK3PXP');
  });

  it('no repite el texto cifrado para el mismo secreto', () => {
    const cipher = new TotpSecretCipher(KEY);

    expect(cipher.encrypt('JBSWY3DPEHPK3PXP')).not.toBe(cipher.encrypt('JBSWY3DPEHPK3PXP'));
  });

  it('rechaza un secreto cifrado con otra clave', () => {
    const stored = new TotpSecretCipher(Buffer.alloc(32, 9).toString('base64')).encrypt('JBSWY3DPEHPK3PXP');

    expect(() => new TotpSecretCipher(KEY).decrypt(stored)).toThrow();
  });
});
