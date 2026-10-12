'use client';

import { motion } from 'motion/react';

interface ProgressRingProps {
  done: number;
  total: number;
  size?: number;
  label: string;
}

const STROKE = 10;

export function ProgressRing({ done, total, size = 132, label }: ProgressRingProps): React.JSX.Element {
  const ratio = total === 0 ? 0 : Math.min(1, done / total);
  const radius = (size - STROKE) / 2;

  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${done} de ${total}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-celeste-100)" strokeWidth={STROKE} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-celeste-700)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: ratio }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display text-3xl font-semibold leading-none tabular-nums">{Math.round(ratio * 100)}%</p>
          <p className="mt-1 text-xs text-muted">{label}</p>
        </div>
      </div>
    </div>
  );
}
