import type { NotificationSettings } from '@carnet/contracts';
import { ChevronLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { NotificationForm } from '@/components/carnet/notification-form';
import { PushDevice } from '@/components/carnet/push-device';
import { loadOrFail } from '@/lib/session';

export const metadata: Metadata = { title: 'Avisos' };

const CARD = 'flex flex-col gap-4 rounded-[24px] border border-celeste-200 bg-white p-6';

export default async function NotificationsPage(): Promise<React.JSX.Element> {
  const settings = await loadOrFail<NotificationSettings>('/v1/me/notifications');

  return (
    <main className="flex flex-col gap-6">
      <Link href="/carnet" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-celeste-700 hover:underline">
        <ChevronLeft aria-hidden="true" className="size-4" />
        Mis hijos
      </Link>
      <div>
        <h1 className="text-3xl font-semibold">Avisos</h1>
        <p className="mt-1 text-muted">
          Te recordamos las citas 3 días antes y el mismo día, te avisamos si una vacuna se atrasa y cuando hay novedades en el carnet. Los avisos no incluyen datos de salud.
        </p>
      </div>

      <section aria-labelledby="preferences" className={CARD}>
        <h2 id="preferences" className="text-lg font-semibold">
          Cómo quieres recibirlos
        </h2>
        {settings.emailConfigured ? null : <p className="text-sm text-muted">El envío de correos todavía no está activo en el servidor; tus preferencias se guardan igual.</p>}
        <NotificationForm settings={settings} />
      </section>

      <section aria-labelledby="device" className={CARD}>
        <h2 id="device" className="text-lg font-semibold">
          Avisos en este equipo
        </h2>
        <p className="text-sm text-muted">
          {settings.pushDevices === 0 ? 'Todavía no activaste ningún equipo.' : `Tienes ${settings.pushDevices} ${settings.pushDevices === 1 ? 'equipo activo' : 'equipos activos'}.`}
        </p>
        {settings.pushPublicKey === null ? (
          <p className="text-sm text-muted">Los avisos en pantalla todavía no están activos en el servidor.</p>
        ) : (
          <PushDevice publicKey={settings.pushPublicKey} />
        )}
      </section>
    </main>
  );
}
