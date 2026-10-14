'use client';

import type { GrowthBandPoint, GrowthBands } from '@carnet/contracts';
import { motion } from 'motion/react';
import { useState } from 'react';
import { familyGrowthText } from '@/lib/family-labels';
import { describeScheduleAge, formatCalendarDate, GROWTH_CLASS_LABEL } from '@/lib/labels';

export interface GrowthPoint {
  id: string;
  measuredOn: string;
  ageDays: number;
  correctedAgeDays: number;
  weightKg: string;
  lengthCm: string;
  headCircumferenceCm: string | null;
  zWeightForAge: string | null;
  zLengthForAge: string | null;
  zHeadForAge: string | null;
  weightForAge: string | null;
  lengthForAge: string | null;
  headForAge: string | null;
  facilityName: string;
}

type IndicatorKey = 'weight' | 'length' | 'head';

interface Indicator {
  key: IndicatorKey;
  label: string;
  title: string;
  unit: string;
  bands: (bands: GrowthBands) => GrowthBandPoint[];
  value: (check: GrowthPoint) => number | null;
  z: (check: GrowthPoint) => string | null;
  classification: (check: GrowthPoint) => string | null;
}

const INDICATORS: readonly Indicator[] = [
  {
    key: 'weight',
    label: 'Peso',
    title: 'Peso para la edad',
    unit: 'kg',
    bands: (bands) => bands.weightForAge,
    value: (check) => Number(check.weightKg),
    z: (check) => check.zWeightForAge,
    classification: (check) => check.weightForAge,
  },
  {
    key: 'length',
    label: 'Talla',
    title: 'Talla para la edad',
    unit: 'cm',
    bands: (bands) => bands.lengthForAge,
    value: (check) => Number(check.lengthCm),
    z: (check) => check.zLengthForAge,
    classification: (check) => check.lengthForAge,
  },
  {
    key: 'head',
    label: 'Perímetro cefálico',
    title: 'Perímetro cefálico para la edad',
    unit: 'cm',
    bands: (bands) => bands.headForAge,
    value: (check) => (check.headCircumferenceCm === null ? null : Number(check.headCircumferenceCm)),
    z: (check) => check.zHeadForAge,
    classification: (check) => check.headForAge,
  },
];

const LINES: readonly { index: 0 | 1 | 2 | 3 | 4 | 5 | 6; color: string; label: string; width: number }[] = [
  { index: 6, color: '#1f2937', label: '+3', width: 1.4 },
  { index: 5, color: '#e0393e', label: '+2', width: 1.6 },
  { index: 4, color: '#f08c2b', label: '+1', width: 1.2 },
  { index: 3, color: '#1f9d55', label: '0', width: 2 },
  { index: 2, color: '#f08c2b', label: '-1', width: 1.2 },
  { index: 1, color: '#e0393e', label: '-2', width: 1.6 },
  { index: 0, color: '#1f2937', label: '-3', width: 1.4 },
];

const WIDTH = 640;
const HEIGHT = 380;
const PAD = { left: 42, right: 34, top: 16, bottom: 34 };
const MONTH_DAYS = 30.4375;

function linePath(points: readonly [number, number][]): string {
  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

function areaPath(upper: readonly [number, number][], lower: readonly [number, number][]): string {
  return `${linePath(upper)} ${[...lower].reverse().map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} Z`;
}

function niceStep(range: number, count: number): number {
  const raw = range / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));

  return [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= raw) ?? raw;
}

interface PlottedPoint {
  check: GrowthPoint;
  value: number;
  x: number;
  y: number;
}

interface GrowthCurvesProps {
  bands: GrowthBands;
  checks: readonly GrowthPoint[];
  audience: 'family' | 'staff';
}

export function GrowthCurves({ bands, checks, audience }: GrowthCurvesProps): React.JSX.Element {
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
    .filter((item): item is { check: GrowthPoint; value: number } => item.value !== null)
    .sort((first, second) => first.check.correctedAgeDays - second.check.correctedAgeDays);
  const values = [...band.flatMap((point) => [point.values[0], point.values[6]]), ...measured.map((item) => item.value)];
  const step = niceStep(Math.max(...values) - Math.min(...values), 8);
  const minY = Math.floor(Math.min(...values) / step) * step;
  const maxY = Math.ceil(Math.max(...values) / step) * step;
  const scaleX = (x: number): number => PAD.left + (x / maxX) * (WIDTH - PAD.left - PAD.right);
  const scaleY = (y: number): number => HEIGHT - PAD.bottom - ((y - minY) / (maxY - minY || 1)) * (HEIGHT - PAD.top - PAD.bottom);
  const curve = (index: 0 | 1 | 2 | 3 | 4 | 5 | 6): [number, number][] => band.map((point) => [scaleX(point.x), scaleY(point.values[index])]);
  const plotted: PlottedPoint[] = measured.map((item) => ({ ...item, x: scaleX(item.check.correctedAgeDays), y: scaleY(item.value) }));
  const selected = plotted.find((point) => point.check.id === selectedId) ?? plotted.at(-1);
  const months = Math.floor(maxX / MONTH_DAYS);
  const yTicks = Array.from({ length: Math.round((maxY - minY) / step) + 1 }, (_, index) => Math.round((minY + index * step) * 100) / 100);
  const lastBand = band.at(-1);

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Indicador" className="grid grid-cols-3 gap-1 rounded-2xl border border-line bg-white p-1">
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
            className="relative min-h-10 rounded-xl px-2 text-sm font-semibold"
          >
            {item.key === indicatorKey ? (
              <motion.span layoutId="growth-curves-tab" className="absolute inset-0 rounded-xl bg-linear-to-br from-celeste-700 to-celeste-500" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
            ) : null}
            <span className={`relative ${item.key === indicatorKey ? 'text-white' : 'text-muted'}`}>{item.label}</span>
          </button>
        ))}
      </div>

      <figure className="overflow-hidden rounded-[20px] border border-line bg-white p-2 sm:p-3">
        <p className="px-2 pb-1 text-sm font-semibold text-ink">
          {indicator.title} <span className="font-normal text-muted">({indicator.unit}). Patrón OMS 2006</span>
        </p>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Curva de ${indicator.title.toLowerCase()} sobre los patrones de la OMS`} className="w-full">
          <rect x={PAD.left} y={PAD.top} width={WIDTH - PAD.left - PAD.right} height={HEIGHT - PAD.top - PAD.bottom} fill="#fbfdfe" />
          {Array.from({ length: months + 1 }, (_, month) => (
            <line
              key={`v${month}`}
              x1={scaleX(month * MONTH_DAYS)}
              x2={scaleX(month * MONTH_DAYS)}
              y1={PAD.top}
              y2={HEIGHT - PAD.bottom}
              stroke={month % 12 === 0 ? '#9fb6c3' : '#e3edf2'}
              strokeWidth={month % 12 === 0 ? 1.2 : 0.6}
            />
          ))}
          {yTicks.map((tick) => (
            <g key={`h${tick}`}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={scaleY(tick)} y2={scaleY(tick)} stroke="#e3edf2" strokeWidth={0.6} />
              <text x={PAD.left - 6} y={scaleY(tick) + 3} textAnchor="end" fontSize={10} fill="var(--color-muted)">
                {tick}
              </text>
            </g>
          ))}
          {Array.from({ length: months + 1 }, (_, month) => month)
            .filter((month) => (months <= 24 ? month % 2 === 0 : month % 6 === 0))
            .map((month) => (
              <text key={`m${month}`} x={scaleX(month * MONTH_DAYS)} y={HEIGHT - 14} textAnchor="middle" fontSize={10} fill="var(--color-muted)">
                {month === 0 ? 'Nac.' : month % 12 === 0 ? `${month / 12} a` : `${month} m`}
              </text>
            ))}
          <path d={areaPath(curve(5), curve(1))} fill="#1f9d55" opacity={0.07} />
          {LINES.map((line) => (
            <motion.path
              key={`${indicator.key}-${line.index}`}
              d={linePath(curve(line.index))}
              fill="none"
              stroke={line.color}
              strokeWidth={line.width}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: Math.abs(line.index - 3) * 0.06 }}
            />
          ))}
          {lastBand === undefined
            ? null
            : LINES.map((line) => (
                <text key={`l${line.index}`} x={WIDTH - PAD.right + 4} y={scaleY(lastBand.values[line.index]) + 3} fontSize={10} fontWeight={700} fill={line.color}>
                  {line.label}
                </text>
              ))}
          {plotted.length > 1 ? (
            <motion.path
              key={`child-${indicator.key}`}
              d={linePath(plotted.map((point) => [point.x, point.y]))}
              fill="none"
              stroke="var(--color-celeste-900)"
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          ) : null}
          {plotted.map((point, index) => (
            <motion.circle
              key={`${indicator.key}-${point.check.id}`}
              cx={point.x}
              cy={point.y}
              r={point.check.id === selected?.check.id ? 7.5 : 5.5}
              fill={point.check.id === selected?.check.id ? 'var(--color-celeste-700)' : '#fff'}
              stroke="var(--color-celeste-900)"
              strokeWidth={2.2}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.7 + index * 0.08, type: 'spring', stiffness: 300, damping: 18 }}
              onClick={() => setSelectedId(point.check.id)}
              className="cursor-pointer"
              role="button"
              aria-label={`${formatCalendarDate(point.check.measuredOn)}: ${point.value} ${indicator.unit}`}
            />
          ))}
        </svg>
        <figcaption className="flex flex-wrap gap-x-4 gap-y-1 px-2 pt-1 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 border-t-2 border-[#1f9d55]" />
            Mediana
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 border-t-2 border-[#f08c2b]" />
            ±1 desvío
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 border-t-2 border-[#e0393e]" />
            ±2 desvíos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 border-t-2 border-[#1f2937]" />
            ±3 desvíos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full border-2 border-celeste-900 bg-white" />
            Medidas del niño
          </span>
        </figcaption>
      </figure>

      {selected === undefined ? (
        <p className="rounded-[20px] border border-line bg-white p-5 text-muted">
          {indicator.key === 'head' ? 'Todavía no hay medidas del perímetro cefálico.' : 'Todavía no hay controles registrados.'}
        </p>
      ) : (
        <motion.div
          key={`${indicator.key}-${selected.check.id}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-line bg-white p-5"
        >
          <div>
            <p className="text-sm text-muted">
              {formatCalendarDate(selected.check.measuredOn)}, a los {describeScheduleAge(selected.check.ageDays)}
              {selected.check.correctedAgeDays !== selected.check.ageDays ? ` (edad corregida ${describeScheduleAge(selected.check.correctedAgeDays)})` : ''}
            </p>
            <p className="font-display text-3xl font-semibold tabular-nums">
              {selected.value.toLocaleString('es-PE', { maximumFractionDigits: 3 })} {indicator.unit}
            </p>
            <p className="mt-1 text-sm text-muted">Medido en {selected.check.facilityName}.</p>
          </div>
          <div className="text-right">
            {audience === 'staff' ? (
              <p className="font-display text-2xl font-semibold tabular-nums">z {indicator.z(selected.check) ?? 'fuera de tabla'}</p>
            ) : null}
            <p className="font-semibold">
              {audience === 'staff'
                ? (GROWTH_CLASS_LABEL[indicator.classification(selected.check) ?? ''] ?? 'Sin referencia')
                : familyGrowthText(indicator.classification(selected.check))}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
