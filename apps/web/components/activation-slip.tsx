'use client';

import { Printer } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { buttonClass } from '@/lib/ui';
import { BrandMark } from './brand';

interface ActivationSlipProps {
  code: string;
  expiresAt: string;
  childName: string;
  guardianName: string;
  activationUrl: string;
}

const EXPIRY_FORMAT = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' });

export function ActivationSlip({ code, expiresAt, childName, guardianName, activationUrl }: ActivationSlipProps): React.JSX.Element {
  const reduceMotion = useReducedMotion() === true;

  return (
    <motion.div
      data-print-area
      initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      className="flex flex-col gap-5 rounded-(--radius-panel) border-2 border-dashed border-celeste-500 bg-white p-6"
    >
      <div className="flex items-center gap-3">
        <BrandMark className="h-10 w-auto" />
        <div>
          <p className="font-display text-lg font-semibold">Código de activación</p>
          <p className="text-sm text-muted">Para {guardianName}</p>
        </div>
      </div>
      <p className="text-center font-mono text-4xl font-semibold tracking-[0.3em] text-celeste-900 sm:text-5xl" aria-label={`Código ${code.split('').join(' ')}`}>
        {code.slice(0, 4)} {code.slice(4)}
      </p>
      <p className="text-center text-sm text-muted">Vence el {EXPIRY_FORMAT.format(new Date(expiresAt))}. Sirve una sola vez.</p>
      <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm">
        <li>
          Entra a <span className="font-semibold">{activationUrl}</span> desde tu celular.
        </li>
        <li>Escribe tu DNI y este código.</li>
        <li>Crea tu contraseña. Desde ese momento verás el carnet de {childName}.</li>
      </ol>
      <div className="print:hidden">
        <button type="button" onClick={() => window.print()} className={buttonClass('secondary')}>
          <Printer aria-hidden="true" className="size-4" />
          Imprimir para entregar
        </button>
      </div>
    </motion.div>
  );
}
