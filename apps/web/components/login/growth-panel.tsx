'use client';

import { CircleCheck } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { BrandMark } from '../brand';
import { CHART_SEQUENCE_END, GrowthChartArt, LAST_CONTROL_POSITION } from './growth-chart-art';

function PanelBrand(): React.JSX.Element {
  return (
    <div className="flex items-center gap-2.5">
      <span className="rounded-[10px] bg-white p-1">
        <BrandMark className="h-8 w-auto" />
      </span>
      <span className="font-display text-lg font-semibold">Carnet CRED</span>
    </div>
  );
}

export function MobileGrowthHero(): React.JSX.Element {
  return (
    <div className="rounded-b-[28px] bg-celeste-700 px-5 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] text-white sm:px-8">
      <PanelBrand />
      <div className="mx-auto mt-4 w-[78%] max-w-[340px]">
        <GrowthChartArt compact />
      </div>
      <p className="mx-auto max-w-sm text-center font-display text-lg font-medium leading-snug">
        El crecimiento de cada niño, registrado control a control.
      </p>
    </div>
  );
}

export function GrowthPanel(): React.JSX.Element {
  const reduceMotion = useReducedMotion() === true;

  return (
    <div className="relative flex h-full flex-col justify-between gap-10 overflow-hidden bg-celeste-700 px-6 py-8 text-white sm:px-10 lg:px-14 lg:py-12">
      <PanelBrand />

      <div className="relative mx-auto w-full max-w-[560px]">
        <GrowthChartArt />
        <motion.div
          className="absolute w-max -translate-x-[92%] -translate-y-[135%] rounded-(--radius-panel) bg-white px-4 py-3 text-ink shadow-[0_20px_40px_-20px_rgba(4,40,60,0.6)]"
          style={LAST_CONTROL_POSITION}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: CHART_SEQUENCE_END + 0.1, duration: 0.45, ease: 'easeOut' }}
        >
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <CircleCheck aria-hidden="true" className="size-4 text-ok" />
            Control de los 24 meses
          </p>
          <p className="text-sm text-muted">Crece dentro de lo esperado</p>
        </motion.div>
      </div>

      <div className="flex max-w-md flex-col gap-3">
        <h2 className="text-2xl font-semibold leading-tight sm:text-3xl">El crecimiento de cada niño, registrado control a control.</h2>
        <p className="text-celeste-100">
          Vacunas, controles y hemoglobina en un solo carnet, con la misma información para el establecimiento y para la familia.
        </p>
      </div>
    </div>
  );
}
