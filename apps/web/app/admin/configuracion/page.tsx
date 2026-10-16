import type { SecuritySettings } from '@carnet/contracts';
import { TriangleAlert } from 'lucide-react';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { formatDateTime } from '@/lib/labels';
import { loadOrFail } from '@/lib/session';
import { PANEL_CLASS } from '@/lib/ui';
import { SecurityForm } from './security-form';

export const metadata: Metadata = { title: 'Configuración' };

export default async function SettingsPage(): Promise<React.JSX.Element> {
  const settings = await loadOrFail<SecuritySettings>('/v1/admin/settings/security');
  const relaxed = !settings.totpRequired || !settings.staffPasswordChange;

  return (
    <>
      <PageHeader eyebrow="Control" title="Configuración" description="Ajustes del sistema que aplican a todo el personal." />

      <section aria-labelledby="security" className={`${PANEL_CLASS} flex flex-col gap-5 p-5 sm:p-6`}>
        <div>
          <h2 id="security" className="text-lg font-semibold">
            Seguridad del ingreso
          </h2>
          <p className="text-sm text-muted">
            Aplica a admins y digitadores; los apoderados siempre entran con su DNI y contraseña. Los cambios rigen desde el siguiente ingreso de cada persona.
          </p>
          <p className="mt-1 text-xs text-muted">
            {settings.updatedAt === null
              ? 'Todavía rigen los valores definidos en el servidor.'
              : `Último cambio: ${settings.updatedByName ?? 'administrador'}, ${formatDateTime(settings.updatedAt)}.`}
          </p>
        </div>

        {relaxed ? (
          <p className="flex items-start gap-2 rounded-2xl border border-sun-500/40 bg-sun-50 px-4 py-3 text-sm text-sun-700">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Con alguna protección apagada, la contraseña es la única barrera de las cuentas del personal. Actívalas antes de registrar datos reales de niños.
          </p>
        ) : null}

        <SecurityForm settings={settings} />
      </section>
    </>
  );
}
