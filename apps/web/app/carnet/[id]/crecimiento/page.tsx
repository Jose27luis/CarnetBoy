import type { Metadata } from 'next';
import { GrowthCurves } from '@/components/charts/growth-curves';
import { loadCarnet } from '@/lib/guardian';

export const metadata: Metadata = { title: 'Crecimiento' };

interface GrowthPageProps {
  params: Promise<{ id: string }>;
}

export default async function GrowthPage({ params }: GrowthPageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const carnet = await loadCarnet(id);

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold">Crecimiento</h2>
        <p className="text-muted">Sus medidas sobre los patrones de crecimiento de la OMS. Toca un punto para ver el detalle.</p>
      </div>
      <GrowthCurves bands={carnet.growthBands} checks={carnet.growth} audience="family" />
    </>
  );
}
