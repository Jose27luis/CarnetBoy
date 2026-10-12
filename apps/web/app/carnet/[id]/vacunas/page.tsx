import type { Metadata } from 'next';
import { VaccinePassport } from '@/components/carnet/vaccine-passport';
import { loadCarnet } from '@/lib/guardian';

export const metadata: Metadata = { title: 'Pasaporte de vacunas' };

interface VaccinesPageProps {
  params: Promise<{ id: string }>;
}

export default async function VaccinesPage({ params }: VaccinesPageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const carnet = await loadCarnet(id);

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold">Pasaporte de vacunas</h2>
        <p className="text-muted">Cada sello es una vacuna aplicada. Toca uno para ver el detalle.</p>
      </div>
      {carnet.scheduleNorm === null ? (
        <p className="rounded-[20px] border border-celeste-200 bg-white p-5">El esquema de vacunación todavía no está publicado. Pronto verás aquí todas sus vacunas.</p>
      ) : (
        <VaccinePassport doses={carnet.doses} />
      )}
    </>
  );
}
