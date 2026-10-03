import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { requireFacility } from '@/lib/digitizer-session';
import { ChildForm } from '../child-form';

export const metadata: Metadata = { title: 'Registrar niño' };

interface NewChildPageProps {
  searchParams: Promise<{ documento?: string }>;
}

export default async function NewChildPage({ searchParams }: NewChildPageProps): Promise<React.JSX.Element> {
  const facility = await requireFacility();
  const { documento } = await searchParams;
  const document = documento !== undefined && /^\d{8,12}$/.test(documento) ? documento : undefined;

  return (
    <>
      <PageHeader title="Registrar niño" description={`Queda registrado en ${facility.name}. Después podrás vincular a sus apoderados.`} />
      <ChildForm {...(document === undefined ? {} : { initialDocument: document })} />
    </>
  );
}
