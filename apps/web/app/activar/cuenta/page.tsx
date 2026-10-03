import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { pendingActivation } from '@/lib/activation-cookie';
import { AccountForm } from './account-form';

export const metadata: Metadata = { title: 'Crea tu contraseña' };

export default async function ActivationAccountPage(): Promise<React.JSX.Element> {
  const challenge = await pendingActivation();

  if (challenge === null) {
    redirect('/activar?vencido=1');
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-celeste-700">Paso 2 de 2</p>
        <h1 className="text-[1.75rem] font-semibold leading-tight sm:text-3xl">Hola, {challenge.guardian.givenNames.split(' ')[0]}</h1>
        <p className="text-muted">Al terminar podrás ver el carnet de:</p>
        <ul className="flex flex-col gap-1.5">
          {challenge.children.map((child) => (
            <li
              key={`${child.givenNames}-${child.paternalSurname}-${child.maternalSurname}`}
              className="rounded-(--radius-control) bg-celeste-50 px-3 py-2 font-semibold text-celeste-900"
            >
              {child.givenNames} {child.paternalSurname} {child.maternalSurname}
            </li>
          ))}
        </ul>
      </div>
      <AccountForm />
    </div>
  );
}
