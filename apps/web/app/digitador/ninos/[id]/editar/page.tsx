import type { ChildRecord } from '@carnet/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { digitizerApi } from '@/lib/digitizer-session';
import { personName } from '@/lib/labels';
import { ChildForm } from '../../child-form';

export const metadata: Metadata = { title: 'Corregir datos' };

interface EditChildPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditChildPage({ params }: EditChildPageProps): Promise<React.JSX.Element> {
  const { id } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    notFound();
  }

  const result = await digitizerApi<ChildRecord>(`/v1/children/${id}`);

  if (!result.ok) {
    if (result.status === 401) {
      redirect('/ingresar');
    }

    notFound();
  }

  return (
    <>
      <Link href={`/digitador/ninos/${id}`} className="mb-4 inline-block text-sm font-semibold text-celeste-700 hover:underline">
        Volver a la ficha
      </Link>
      <PageHeader title={`Corregir datos de ${personName(result.data)}`} description="El cambio queda en la auditoría con los valores anteriores." />
      <ChildForm child={result.data} />
    </>
  );
}
