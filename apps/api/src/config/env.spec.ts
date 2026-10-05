import { loadEnv } from './env';

const BASE = {
  DATABASE_URL: 'postgresql://carnet:carnet@localhost:5432/carnet',
  REDIS_URL: 'redis://localhost:6379',
  WEB_URL: 'http://localhost:3501',
  JWT_SECRET: 'x'.repeat(32),
  TOTP_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
};

describe('env', () => {
  it('usa un pool de 10 conexiones si no se indica', () => {
    expect(loadEnv(BASE).DATABASE_POOL_SIZE).toBe(10);
  });

  it('acepta el tamaño del pool como texto de la variable de entorno', () => {
    expect(loadEnv({ ...BASE, DATABASE_POOL_SIZE: '20' }).DATABASE_POOL_SIZE).toBe(20);
  });

  it.each(['1', '51', 'veinte'])('rechaza un pool de %p', (value) => {
    expect(() => loadEnv({ ...BASE, DATABASE_POOL_SIZE: value })).toThrow(/DATABASE_POOL_SIZE/);
  });

  it('rechaza una clave de cifrado del segundo factor que no tenga 32 bytes', () => {
    expect(() => loadEnv({ ...BASE, TOTP_ENCRYPTION_KEY: Buffer.alloc(16, 7).toString('base64') })).toThrow(/TOTP_ENCRYPTION_KEY/);
  });

  it('exige el segundo factor si no se indica lo contrario', () => {
    expect(loadEnv(BASE).TOTP_REQUIRED).toBe(true);
    expect(loadEnv({ ...BASE, TOTP_REQUIRED: 'false' }).TOTP_REQUIRED).toBe(false);
    expect(() => loadEnv({ ...BASE, TOTP_REQUIRED: 'no' })).toThrow(/TOTP_REQUIRED/);
  });

  it('no exige el administrador inicial y trata los valores vacíos como ausentes', () => {
    const env = loadEnv({ ...BASE, BOOTSTRAP_ADMIN_EMAIL: '', BOOTSTRAP_ADMIN_PASSWORD: '' });

    expect(env.BOOTSTRAP_ADMIN_EMAIL).toBeUndefined();
  });

  it('exige el correo y la contraseña del administrador inicial juntos', () => {
    expect(() => loadEnv({ ...BASE, BOOTSTRAP_ADMIN_EMAIL: 'admin@ejemplo.pe' })).toThrow(/BOOTSTRAP_ADMIN_PASSWORD/);
    expect(() => loadEnv({ ...BASE, BOOTSTRAP_ADMIN_EMAIL: 'admin@ejemplo.pe', BOOTSTRAP_ADMIN_PASSWORD: 'corta' })).toThrow(
      /BOOTSTRAP_ADMIN_PASSWORD/,
    );
  });
});
