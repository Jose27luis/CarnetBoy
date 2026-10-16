'use client';

import type { SecuritySettings } from '@carnet/contracts';
import { KeyRound, type LucideIcon, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useActionState, useId, useState } from 'react';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { IDLE } from '@/lib/form-state';
import { updateSecurityAction } from './actions';

interface ToggleProps {
  name: string;
  title: string;
  description: string;
  onLabel: string;
  offLabel: string;
  icon: LucideIcon;
  defaultChecked: boolean;
}

function Toggle({ name, title, description, onLabel, offLabel, icon: Icon, defaultChecked }: ToggleProps): React.JSX.Element {
  const [checked, setChecked] = useState(defaultChecked);
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-start gap-4 rounded-[18px] border p-5 transition-colors ${checked ? 'border-mint-500/40 bg-mint-50/60' : 'border-line bg-white hover:bg-canvas'}`}
    >
      <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${checked ? 'bg-mint-500 text-white' : 'bg-canvas text-muted'}`}>
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{description}</span>
        <span className={`mt-2 inline-block text-xs font-semibold ${checked ? 'text-mint-700' : 'text-sun-700'}`}>{checked ? onLabel : offLabel}</span>
      </span>
      <input id={id} name={name} type="checkbox" role="switch" checked={checked} onChange={(event) => setChecked(event.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={`relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-celeste-700 ${
          checked ? 'bg-mint-500' : 'bg-line'
        }`}
      >
        <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 32 }} className={`block size-5 rounded-full bg-white shadow ${checked ? 'ml-auto' : ''}`} />
      </span>
    </label>
  );
}

export function SecurityForm({ settings }: { settings: SecuritySettings }): React.JSX.Element {
  const [state, action] = useActionState(updateSecurityAction, IDLE);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="expectedVersion" value={settings.version} />
      <Toggle
        name="totpRequired"
        title="Verificación en dos pasos"
        description="Al ingresar, admins y digitadores escriben además el código de 6 dígitos de una app autenticadora en su celular."
        onLabel="Activa: se pide el código en cada ingreso"
        offLabel="Apagada: el personal entra solo con correo y contraseña"
        icon={ShieldCheck}
        defaultChecked={settings.totpRequired}
      />
      <Toggle
        name="staffPasswordChange"
        title="Cambio de la contraseña temporal"
        description="Cuando una cuenta se crea o se le genera una contraseña temporal, la persona debe cambiarla en su primer ingreso."
        onLabel="Activo: se pide cambiar la contraseña temporal"
        offLabel="Apagado: la persona entra directo con la contraseña que le entregaste"
        icon={KeyRound}
        defaultChecked={settings.staffPasswordChange}
      />
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Guardando">Guardar configuración</SubmitButton>
      </div>
    </form>
  );
}
