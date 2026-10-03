import type { Metadata } from 'next';
import Link from 'next/link';
import { ActivationForm } from './activation-form';

export const metadata: Metadata = { title: 'Activa tu cuenta' };

interface ActivationPageProps {
  searchParams: Promise<{ vencido?: string }>;
}

export default async function ActivationPage({ searchParams }: ActivationPageProps): Promise<React.JSX.Element> {
  const { vencido } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[1.75rem] font-semibold leading-tight sm:text-3xl">Activa tu cuenta</h1>
        <p className="text-muted">Con tu DNI y el código que te dieron podrás ver el carnet de tu hija o hijo desde tu celular.</p>
      </div>
      {vencido === undefined ? null : (
        <p role="status" className="rounded-(--radius-control) bg-celeste-50 px-3 py-2 text-sm text-celeste-900">
          Pasaron más de 10 minutos. Vuelve a ingresar tu DNI y tu código.
        </p>
      )}
      <ActivationForm />
      <p className="border-t border-line pt-5 text-sm text-muted">
        ¿Ya activaste tu cuenta?{' '}
        <Link href="/ingresar" className="font-semibold text-celeste-700 underline-offset-2 hover:underline">
          Ingresa con tu DNI
        </Link>
      </p>
    </div>
  );
}
