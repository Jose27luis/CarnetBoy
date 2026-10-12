import type { Metadata } from 'next';
import { Pill } from 'lucide-react';
import { HemoglobinChart } from '@/components/carnet/hemoglobin-chart';
import { loadCarnet } from '@/lib/guardian';
import { formatCalendarDate, IRON_PRODUCT_LABEL } from '@/lib/labels';

export const metadata: Metadata = { title: 'Hemoglobina' };

interface HemoglobinPageProps {
  params: Promise<{ id: string }>;
}

export default async function HemoglobinPage({ params }: HemoglobinPageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const carnet = await loadCarnet(id);
  const lastSupply = carnet.iron[0];

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold">Hemoglobina y hierro</h2>
        <p className="text-muted">Los dosajes de hemoglobina ayudan a prevenir y tratar la anemia.</p>
      </div>

      {carnet.hemoglobin.length === 0 ? (
        <p className="rounded-[20px] border border-celeste-200 bg-white p-5">Todavía no tiene dosajes de hemoglobina en el carnet.</p>
      ) : (
        <HemoglobinChart tests={carnet.hemoglobin} />
      )}

      <section aria-labelledby="iron" className="flex flex-col gap-3">
        <h2 id="iron" className="text-lg font-semibold">
          Hierro
        </h2>
        {lastSupply === undefined ? (
          <p className="rounded-[20px] border border-celeste-200 bg-white p-5 text-muted">No hay entregas de hierro registradas.</p>
        ) : (
          <>
            <div
              className={`rounded-[20px] border p-5 ${lastSupply.purpose === 'TREATMENT' ? 'border-warn/40 bg-warn/5' : 'border-celeste-200 bg-celeste-50'}`}
            >
              <p className="text-sm font-semibold uppercase tracking-wider text-celeste-800">
                {lastSupply.purpose === 'TREATMENT' ? 'En tratamiento' : 'Prevención'}
              </p>
              <p className="mt-1 font-display text-xl font-semibold">{lastSupply.doseInstructions}</p>
              <p className="text-sm text-muted">
                {IRON_PRODUCT_LABEL[lastSupply.product]}, entregado el {formatCalendarDate(lastSupply.suppliedOn)} en {lastSupply.facilityName}.
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {carnet.iron.map((supply) => (
                <li key={supply.id} className="flex items-center gap-3 rounded-[16px] border border-celeste-200 bg-white px-4 py-3">
                  <Pill aria-hidden="true" className="size-5 shrink-0 text-celeste-700" />
                  <span className="text-sm">
                    <span className="font-semibold">
                      {IRON_PRODUCT_LABEL[supply.product]}, {supply.quantity} {supply.quantity === 1 ? 'unidad' : 'unidades'}
                    </span>
                    <span className="block text-muted">{formatCalendarDate(supply.suppliedOn)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
