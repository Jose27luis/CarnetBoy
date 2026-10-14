'use client';

import { motion } from 'motion/react';
import { useState } from 'react';
import { AnimatedNumber } from './animated-number';
import { type Accent, ACCENT_COLOR } from './palette';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  accent: Accent;
}

const SIZE = 180;
const STROKE = 22;

export function DonutChart({ slices, centerLabel }: { slices: readonly DonutSlice[]; centerLabel: string }): React.JSX.Element {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const radius = (SIZE - STROKE) / 2;
  const starts = slices.map((_, index) => slices.slice(0, index).reduce((sum, slice) => sum + slice.value, 0) / (total || 1));
  const focus = slices.find((slice) => slice.key === hovered);

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90" role="img" aria-label={`${centerLabel}: ${total}`}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={radius} fill="none" stroke="var(--color-canvas)" strokeWidth={STROKE} />
          {slices.map((slice, index) => {
            const fraction = slice.value / (total || 1);

            return fraction === 0 ? null : (
              <motion.circle
                key={slice.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={radius}
                fill="none"
                stroke={ACCENT_COLOR[slice.accent]}
                strokeWidth={hovered === slice.key ? STROKE + 6 : STROKE}
                strokeLinecap="butt"
                style={{ rotate: `${(starts[index] ?? 0) * 360}deg`, transformOrigin: '50% 50%' }}
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: Math.max(0, fraction - 0.004) }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + index * 0.12, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                onMouseEnter={() => setHovered(slice.key)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer transition-[stroke-width]"
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-display text-3xl font-semibold leading-none">
              <AnimatedNumber value={focus?.value ?? total} />
            </p>
            <p className="mt-1 max-w-24 text-xs text-muted">{focus?.label ?? centerLabel}</p>
          </div>
        </div>
      </div>
      <ul className="flex min-w-40 flex-col gap-2">
        {slices.map((slice) => (
          <li
            key={slice.key}
            onMouseEnter={() => setHovered(slice.key)}
            onMouseLeave={() => setHovered(null)}
            className={`flex items-center justify-between gap-4 rounded-xl px-2 py-1 text-sm transition-colors ${hovered === slice.key ? 'bg-canvas' : ''}`}
          >
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: ACCENT_COLOR[slice.accent] }} />
              {slice.label}
            </span>
            <span className="font-semibold tabular-nums">
              {slice.value} <span className="font-normal text-muted">({total === 0 ? 0 : Math.round((slice.value / total) * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
