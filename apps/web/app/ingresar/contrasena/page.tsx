import type { Metadata } from 'next';
import { pendingChallenge } from '@/lib/login-flow';
import { CancelLoginButton } from '../cancel-button';
import { PasswordForm } from './password-form';

export const metadata: Metadata = { title: 'Crea tu contraseña' };

export default async function InitialPasswordPage(): Promise<React.JSX.Element> {
  await pendingChallenge(['PASSWORD_CHANGE_REQUIRED']);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold uppercase tracking-wider text-celeste-700">Paso 1 de 2</p>
        <h1 className="text-2xl font-semibold">Crea tu contraseña</h1>
        <p className="text-muted">Ingresaste con una contraseña temporal. Reemplázala por una que solo tú conozcas.</p>
      </div>
      <PasswordForm />
      <CancelLoginButton />
    </div>
  );
}
