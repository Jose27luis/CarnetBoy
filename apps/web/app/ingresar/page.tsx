import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentAccount, HOME_BY_ROLE } from '@/lib/session';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Ingresar' };

interface LoginPageProps {
  searchParams: Promise<{ next?: string; vencido?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps): Promise<React.JSX.Element> {
  const account = await currentAccount();

  if (account !== null) {
    redirect(HOME_BY_ROLE[account.role]);
  }

  const { next, vencido } = await searchParams;

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="text-[1.75rem] font-semibold leading-tight">Ingresa a tu cuenta</h1>
        <p className="text-muted">Usa el correo con el que te registraron en tu establecimiento.</p>
      </div>
      {vencido === undefined ? null : (
        <p role="status" className="rounded-(--radius-control) bg-celeste-50 px-3 py-2 text-sm text-celeste-900">
          El paso de verificación venció. Vuelve a ingresar tu correo y contraseña.
        </p>
      )}
      <LoginForm next={next ?? null} />
      <p className="border-t border-line pt-5 text-sm text-muted">
        Si olvidaste tu contraseña, pide una temporal al administrador de tu establecimiento.
      </p>
    </div>
  );
}
