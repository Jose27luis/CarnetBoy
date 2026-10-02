import type { Metadata } from 'next';
import { pendingChallenge } from '@/lib/login-flow';
import { CancelLoginButton } from '../cancel-button';
import { TotpForm } from '../totp-form';

export const metadata: Metadata = { title: 'Verificación' };

export default async function TotpPage(): Promise<React.JSX.Element> {
  await pendingChallenge(['TOTP_REQUIRED']);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold">Verificación en dos pasos</h1>
        <p className="text-muted">Abre tu aplicación de autenticación y escribe el código de Carnet CRED.</p>
      </div>
      <TotpForm submitLabel="Verificar e ingresar" />
      <CancelLoginButton />
    </div>
  );
}
