import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentAccount, HOME_BY_ROLE } from '@/lib/session';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Login' };

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
    <div className="flex flex-col gap-6">
      <h1 className="text-[1.75rem] font-semibold leading-tight sm:text-3xl">Login</h1>
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
