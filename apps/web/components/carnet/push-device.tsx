'use client';

import { BellOff, BellRing, LoaderCircle } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { removePushSubscriptionAction, savePushSubscriptionAction } from '@/app/carnet/actions';

type DeviceState = 'checking' | 'unsupported' | 'blocked' | 'off' | 'on';

function keyBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = `${base64Url}${'='.repeat((4 - (base64Url.length % 4)) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));

  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }

  return bytes;
}

function supported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration('/');

  return registration === undefined ? null : registration.pushManager.getSubscription();
}

export function PushDevice({ publicKey }: { publicKey: string }): React.JSX.Element {
  const [state, setState] = useState<DeviceState>('checking');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!supported()) {
      queueMicrotask(() => setState('unsupported'));
      return;
    }

    void currentSubscription().then((subscription) => {
      setState(Notification.permission === 'denied' ? 'blocked' : subscription === null ? 'off' : 'on');
    });
  }, []);

  function enable(): void {
    setMessage(null);
    startTransition(async () => {
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'blocked' : 'off');
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
      const json = subscription.toJSON();
      const result = await savePushSubscriptionAction({
        endpoint: subscription.endpoint,
        keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
      });

      if (!result.ok) {
        await subscription.unsubscribe();
        setMessage(result.message);
        return;
      }

      setState('on');
    });
  }

  function disable(): void {
    setMessage(null);
    startTransition(async () => {
      const subscription = await currentSubscription();

      if (subscription !== null) {
        await removePushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe();
      }

      setState('off');
    });
  }

  if (state === 'unsupported') {
    return <p className="text-sm text-muted">Este navegador no permite avisos en pantalla. En iPhone, agrega el carnet a la pantalla de inicio para activarlos.</p>;
  }

  if (state === 'blocked') {
    return <p className="text-sm text-warn">Bloqueaste los avisos para este sitio. Actívalos desde la configuración del navegador.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={state === 'on' ? disable : enable}
        disabled={pending || state === 'checking'}
        className={`inline-flex min-h-11 w-fit items-center gap-2 rounded-full px-5 font-semibold transition-colors ${
          state === 'on' ? 'border border-celeste-200 bg-white text-ink hover:bg-celeste-50' : 'bg-celeste-700 text-white hover:bg-celeste-800'
        }`}
      >
        {pending || state === 'checking' ? (
          <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
        ) : state === 'on' ? (
          <BellOff aria-hidden="true" className="size-5" />
        ) : (
          <BellRing aria-hidden="true" className="size-5" />
        )}
        {state === 'on' ? 'Dejar de recibir avisos en este equipo' : 'Recibir avisos en este equipo'}
      </button>
      {state === 'on' ? <p className="text-sm text-ok">Este equipo recibirá los avisos.</p> : null}
      {message === null ? null : <p className="text-sm text-danger">{message}</p>}
    </div>
  );
}
