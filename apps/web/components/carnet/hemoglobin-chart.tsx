'use client';

import type { AnemiaClass, CarnetHemoglobinTest } from '@carnet/contracts';
import { motion } from 'motion/react';
import { FAMILY_ANEMIA_TEXT } from '@/lib/family-labels';
import { formatCalendarDate } from '@/lib/labels';

const WIDTH = 360;
const HEIGHT = 200;
const PAD = { left: 34, right: 16, top: 24, bottom: 28 };

const COLOR: Record<AnemiaClass, string> = {
  NONE: 'var(--color-ok)',
  MILD: 'var(--color-warn)',
  MODERATE: 'var(--color-danger)',
  SEVERE: 'var(--color-danger)',
  UNCLASSIFIED: 'var(--color-muted)',
};

const SHORT_DATE = new Intl.DateTimeFormat('es-PE', { month: 'short', year: '2-digit', timeZone: 'America/Lima' });

export function HemoglobinChart({ tests }: { tests: readonly CarnetHemoglobinTest[] }): React.JSX.Element {
  const ordered = [...tests].sort((first, second) => first.testedOn.localeCompare(second.testedOn));
  const values = ordered.map((test) => Number(test.adjusted));
  const minY = Math.floor(Math.min(...values, 8) - 1);
  const maxY = Math.ceil(Math.max(...values, 13) + 1);
  const scaleX = (index: number): number => (ordered.length === 1 ? WIDTH / 2 : PAD.left + (index / (ordered.length - 1)) * (WIDTH - PAD.left - PAD.right));
  const scaleY = (value: number): number => HEIGHT - PAD.bottom - ((value - minY) / (maxY - minY)) * (HEIGHT - PAD.top - PAD.bottom);
  const path = ordered.map((test, index) => `${index === 0 ? 'M' : 'L'}${scaleX(index).toFixed(1)},${scaleY(Number(test.adjusted)).toFixed(1)}`).join(' ');

  return (
    <figure className="rounded-[24px] border border-celeste-200 bg-white p-3">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Hemoglobina ajustada de cada dosaje" className="w-full">
        {[minY, Math.round((minY + maxY) / 2), maxY].map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={scaleY(tick)} y2={scaleY(tick)} stroke="var(--color-line)" strokeWidth={0.6} />
            <text x={PAD.left - 6} y={scaleY(tick) + 3} textAnchor="end" fontSize={9} fill="var(--color-muted)">
              {tick}
            </text>
          </g>
        ))}
        {ordered.length > 1 ? (
          <motion.path
            d={path}
            fill="none"
            stroke="var(--color-celeste-700)"
            strokeWidth={2.2}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          />
        ) : null}
        {ordered.map((test, index) => (
          <g key={test.id}>
            <motion.circle
              cx={scaleX(index)}
              cy={scaleY(Number(test.adjusted))}
              r={6}
              fill={COLOR[test.classification]}
              stroke="#fff"
              strokeWidth={2}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 + index * 0.1, type: 'spring', stiffness: 300, damping: 18 }}
            />
            <text x={scaleX(index)} y={scaleY(Number(test.adjusted)) - 11} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--color-ink)">
              {test.adjusted}
            </text>
            <text x={scaleX(index)} y={HEIGHT - 10} textAnchor="middle" fontSize={9} fill="var(--color-muted)">
              {SHORT_DATE.format(new Date(`${test.testedOn}T12:00:00Z`))}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="px-2 pt-1 text-xs text-muted">g/dL ajustados por la altitud. El color indica el resultado de cada dosaje.</figcaption>
      <ul className="mt-3 flex flex-col divide-y divide-line">
        {[...ordered].reverse().map((test) => (
          <li key={test.id} className="flex items-center justify-between gap-3 px-2 py-2.5">
            <span className="text-sm">
              {formatCalendarDate(test.testedOn)}
              <span className="block text-xs text-muted">{test.facilityName}</span>
            </span>
            <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: COLOR[test.classification] }}>
              <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: COLOR[test.classification] }} />
              {FAMILY_ANEMIA_TEXT[test.classification]}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
