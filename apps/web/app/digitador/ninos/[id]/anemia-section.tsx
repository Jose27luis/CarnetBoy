import type { AnemiaOverview } from '@carnet/contracts';
import { Badge } from '@/components/badge';
import { EmptyState } from '@/components/empty-state';
import { ANEMIA_LABEL, ANEMIA_TONE, formatCalendarDate, IRON_PRODUCT_LABEL, IRON_PURPOSE_LABEL } from '@/lib/labels';
import { PANEL_CLASS } from '@/lib/ui';
import { CorrectRecord, RecordHemoglobin, RecordIron } from './clinical-forms';
import { CatalogNotice, RecordFooter } from './record-footer';

interface AnemiaSectionProps {
  childId: string;
  birthDate: string;
  overview: AnemiaOverview;
  pendingIds: ReadonlySet<string>;
}

export function AnemiaSection({ childId, birthDate, overview, pendingIds }: AnemiaSectionProps): React.JSX.Element {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="hemoglobin" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="hemoglobin" className="text-lg font-semibold">
            Dosajes de hemoglobina
          </h2>
          {overview.thresholdsPublished ? <RecordHemoglobin childId={childId} birthDate={birthDate} altitude={overview.facilityAltitude} /> : null}
        </div>
        {overview.thresholdsPublished ? null : (
          <CatalogNotice>No hay umbrales de hemoglobina publicados. Pide al administrador que los publique para registrar dosajes.</CatalogNotice>
        )}
        {overview.tests.length === 0 ? (
          <EmptyState title="Sin dosajes">Los dosajes se ajustan por la altitud del establecimiento según la NTS 213.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {overview.tests.map((test) => {
              const pending = pendingIds.has(test.id);

              return (
                <li key={test.id} className={`${PANEL_CLASS} flex flex-col gap-3 p-4`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{formatCalendarDate(test.testedOn)}</p>
                      <p className="text-sm text-muted">
                        {test.ageMonths} meses. Observada {test.observed} g/dL, menos {test.adjustment} por {test.altitudeMeters} m s. n. m.
                      </p>
                    </div>
                    {pending ? null : (
                      <CorrectRecord
                        childId={childId}
                        recordType="HEMOGLOBIN_TEST"
                        recordId={test.id}
                        birthDate={birthDate}
                        canCorrectDirectly={test.canCorrectDirectly}
                        defaults={{ testedOn: test.testedOn, observed: test.observed }}
                      />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-2xl font-semibold tabular-nums">{test.adjusted}</span>
                    <span className="text-sm text-muted">g/dL ajustada</span>
                    <Badge tone={ANEMIA_TONE[test.classification]}>{ANEMIA_LABEL[test.classification]}</Badge>
                  </div>
                  <RecordFooter record={test} pending={pending} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="iron" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="iron" className="text-lg font-semibold">
            Entregas de hierro
          </h2>
          <RecordIron childId={childId} birthDate={birthDate} />
        </div>
        {overview.supplies.length === 0 ? (
          <EmptyState title="Sin entregas">Registra los suplementos de hierro entregados al apoderado.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {overview.supplies.map((supply) => {
              const pending = pendingIds.has(supply.id);

              return (
                <li key={supply.id} className={`${PANEL_CLASS} flex flex-col gap-3 p-4`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {formatCalendarDate(supply.suppliedOn)}. {IRON_PRODUCT_LABEL[supply.product]}, {supply.quantity} {supply.quantity === 1 ? 'unidad' : 'unidades'}
                      </p>
                      <p className="text-sm text-muted">{supply.doseInstructions}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={supply.purpose === 'TREATMENT' ? 'warn' : 'celeste'}>{IRON_PURPOSE_LABEL[supply.purpose]}</Badge>
                      {pending ? null : (
                        <CorrectRecord
                          childId={childId}
                          recordType="IRON_SUPPLY"
                          recordId={supply.id}
                          birthDate={birthDate}
                          canCorrectDirectly={supply.canCorrectDirectly}
                          defaults={{
                            suppliedOn: supply.suppliedOn,
                            product: supply.product,
                            purpose: supply.purpose,
                            doseInstructions: supply.doseInstructions,
                            quantity: String(supply.quantity),
                          }}
                        />
                      )}
                    </div>
                  </div>
                  <RecordFooter record={supply} pending={pending} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
