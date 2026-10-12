'use client';

import type { CarnetGrowthCheck, GrowthBandPoint, GrowthBands } from '@carnet/contracts';
import { motion } from 'motion/react';
import { useState } from 'react';
import { familyGrowthText } from '@/lib/family-labels';
import { describeScheduleAge, formatCalendarDate } from '@/lib/labels';

type IndicatorKey = 'weight' | 'length' | 'head';

interface Indicator {
  key: IndicatorKey;
  label: string;
  unit: string;
  bands: (bands: GrowthBands) => GrowthBandPoint[];
  value: (check: CarnetGrowthCheck) => number | null;
  classification: (check: CarnetGrowthCheck) => string | null;
}

const INDICATORS: readonly Indicator[] = [
  { key: 'weight', label: 'Peso', unit: 'kg', bands: (bands) => bands.weightForAge, value: (check) => Number(check.weightKg), classification: (check) => check.weightForAge },
  { key: 'length', label: 'Talla', unit: 'cm', bands: (bands) => bands.lengthForAge, value: (check) => Number(check.lengthCm), classification: (check) => check.lengthForAge },
  {
    key: 'head',
    label: 'Cabeza',
    unit: 'cm',
    bands: (bands) => bands.headForAge,
    value: (check) => (check.headCircumferenceCm === null ? null : Number(check.headCircumferenceCm)),
    classification: (check) => check.headForAge,
  },
];

const WIDTH = 360;
const HEIGHT = 260;
const PAD = { left: 38, right: 12, top: 12, bottom: 30 };

function linePath(points: readonly [number, number][]): string {
  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

function areaPath(upper: readonly [number, number][], lower: readonly [number, number][]): string {
  return `${linePath(upper)} ${[...lower].reverse().map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} Z`;
}

function niceTicks(min: number, max: number, count: number): number[] {
  const raw = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= raw) ?? raw;
  const ticks: number[] = [];

  for (let value = Math.ceil(min / step) * step; value <= max; value += step) {
    ticks.push(Math.round(value * 100) / 100);
  }

  return ticks;
}

interface PlottedPoint {
  check: CarnetGrowthCheck;
  value: number;
  x: number;
  y: number;
}

export function GrowthChart({ bands, checks }: { bands: GrowthBands; checks: readonly CarnetGrowthCheck[] }): React.JSX.Element {
  const [indicatorKey, setIndicatorKey] = useState<IndicatorKey>('weight');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const indicator = INDICATORS.find((item) => item.key === indicatorKey) ?? INDICATORS[0];

  if (indicator === undefined) {
    return <p className="text-muted">No hay curvas para mostrar.</p>;
  }

  const band = indicator.bands(bands);
  const maxX = band.at(-1)?.x ?? 365;
  const measured = [...checks]
    .filter((check) => check.correctedAgeDays <= maxX)
    .map((check) => ({ check, value: indicator.value(check) }))
    .filter((item): item is { check: CarnetGrowthCheck; value: number } => item.value !== null)
    .sort((first, second) => first.check.correctedAgeDays - second.check.correctedAgeDays);
  const values = [...band.flatMap((point) => [point.values[0], point.values[4]]), ...measured.map((item) => item.value)];
  const minY = Math.floor(Math.min(...values));
  const maxY = Math.ceil(Math.max(...values));
  const scaleX = (x: number): number => PAD.left + (x / maxX) * (WIDTH - PAD.left - PAD.right);
  const scaleY = (y: number): number => HEIGHT - PAD.bottom - ((y - minY) / (maxY - minY || 1)) * (HEIGHT - PAD.top - PAD.bottom);
  const curve = (index: 0 | 1 | 2 | 3 | 4): [number, number][] => band.map((point) => [scaleX(point.x), scaleY(point.values[index])]);
  const plotted: PlottedPoint[] = measured.map((item) => ({ ...item, x: scaleX(item.check.correctedAgeDays), y: scaleY(item.value) }));
  const selected = plotted.find((point) => point.check.id === selectedId) ?? plotted.at(-1);
  const monthStep = maxX <= 730 ? 3 : 6;
  const monthTicks = Array.from({ length: Math.floor(maxX / 30.4375 / monthStep) + 1 }, (_, index) => index * monthStep);

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Indicador" className="grid grid-cols-3 gap-1 rounded-full border border-celeste-200 bg-white p-1">
        {INDICATORS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={item.key === indicatorKey}
            onClick={() => {
              setIndicatorKey(item.key);
              setSelectedId(null);
            }}
            className="relative min-h-10 rounded-full text-sm font-semibold"
          >
            {item.key === indicatorKey ? (
              <motion.span layoutId="growth-indicator" className="absolute inset-0 rounded-full bg-celeste-700" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
            ) : null}
            <span className={`relative ${item.key === indicatorKey ? 'text-white' : 'text-muted'}`}>{item.label}</span>
          </button>
        ))}
      </div>

      <figure className="rounded-[24px] border border-celeste-200 bg-white p-3">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Curva de ${indicator.label.toLowerCase()} sobre las bandas de la OMS`} className="w-full">
          {niceTicks(minY, maxY, 5).map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={scaleY(tick)} y2={scaleY(tick)} stroke="var(--color-line)" strokeWidth={0.6} />
              <text x={PAD.left - 6} y={scaleY(tick) + 3} textAnchor="end" fontSize={9} fill="var(--color-muted)">
                {tick}
              </text>
            </g>
          ))}
          {monthTicks.map((month) => (
            <text key={month} x={scaleX(month * 30.4375)} y={HEIGHT - 12} textAnchor="middle" fontSize={9} fill="var(--color-muted)">
              {month < 24 ? `${month}m` : `${month / 12}a`}
            </text>
          ))}
          <path d={areaPath(curve(4), curve(0))} fill="var(--color-warn)" opacity={0.08} />
          <path d={areaPath(curve(3), curve(1))} fill="var(--color-celeste-100)" />
          <path d={linePath(curve(2))} fill="none" stroke="var(--color-celeste-500)" strokeWidth={1.2} strokeDasharray="4 3" />
          {plotted.length > 1 ? (
            <motion.path
              key={indicator.key}
              d={linePath(plotted.map((point) => [point.x, point.y]))}
              fill="none"
              stroke="var(--color-celeste-900)"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            />
          ) : null}
          {plotted.map((point, index) => (
            <motion.circle
              key={`${indicator.key}-${point.check.id}`}
              cx={point.x}
              cy={point.y}
              r={point.check.id === selected?.check.id ? 7 : 5}
              fill={point.check.id === selected?.check.id ? 'var(--color-celeste-700)' : '#fff'}
              stroke="var(--color-celeste-900)"
              strokeWidth={2}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + index * 0.08, type: 'spring', stiffness: 300, damping: 18 }}
              onClick={() => setSelectedId(point.check.id)}
              className="cursor-pointer"
              role="button"
              aria-label={`${formatCalendarDate(point.check.measuredOn)}: ${point.value} ${indicator.unit}`}
            />
          ))}
        </svg>
        <figcaption className="flex flex-wrap gap-x-4 gap-y-1 px-2 pt-2 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 rounded-sm bg-celeste-100" />
            Rango esperado para su edad
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 border-t-2 border-dashed border-celeste-500" />
            Promedio OMS
          </span>
        </figcaption>
      </figure>

      {selected === undefined ? (
        <p className="rounded-[20px] border border-celeste-200 bg-white p-5 text-muted">
          {indicator.key === 'head' ? 'Todavía no hay medidas de la cabeza en el carnet.' : 'Todavía no hay controles en el carnet.'}
        </p>
      ) : (
        <motion.div
          key={`${indicator.key}-${selected.check.id}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[20px] border border-celeste-200 bg-white p-5"
        >
          <p className="text-sm text-muted">
            {formatCalendarDate(selected.check.measuredOn)}, a los {describeScheduleAge(selected.check.ageDays)}
            {selected.check.correctedAgeDays !== selected.check.ageDays ? ` (edad corregida ${describeScheduleAge(selected.check.correctedAgeDays)})` : ''}
          </p>
          <p className="font-display text-3xl font-semibold tabular-nums">
            {selected.value.toLocaleString('es-PE', { maximumFractionDigits: 2 })} {indicator.unit}
          </p>
          <p className="mt-1 font-semibold">{familyGrowthText(indicator.classification(selected.check))}</p>
          <p className="mt-1 text-sm text-muted">Medido en {selected.check.facilityName}.</p>
        </motion.div>
      )}
    </div>
  );
}
