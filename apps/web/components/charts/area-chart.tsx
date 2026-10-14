'use client';

import { motion } from 'motion/react';
import { useId, useState } from 'react';
import { type Accent, ACCENT_COLOR } from './palette';

export interface AreaPoint {
  label: string;
  value: number;
}

const WIDTH = 520;
const HEIGHT = 180;
const PAD = { top: 18, right: 12, bottom: 26, left: 12 };

export function AreaChart({ points, accent, unit }: { points: readonly AreaPoint[]; accent: Accent; unit: string }): React.JSX.Element {
  const gradientId = useId();
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((point) => point.value));
  const step = points.length > 1 ? (WIDTH - PAD.left - PAD.right) / (points.length - 1) : 0;
  const coordinates = points.map((point, index): [number, number] => [
    PAD.left + index * step,
    HEIGHT - PAD.bottom - (point.value / max) * (HEIGHT - PAD.top - PAD.bottom),
  ]);
  const line = coordinates.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${(coordinates.at(-1)?.[0] ?? 0).toFixed(1)},${HEIGHT - PAD.bottom} L${PAD.left},${HEIGHT - PAD.bottom} Z`;
  const color = ACCENT_COLOR[accent];
  const focus = hovered === null ? points.at(-1) : points[hovered];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">
        {focus === undefined ? null : (
          <>
            <span className="font-display text-2xl font-semibold text-ink tabular-nums">{focus.value}</span> {unit}, {focus.label}
          </>
        )}
      </p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={points.map((point) => `${point.label}: ${point.value}`).join(', ')}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <motion.path d={area} fill={`url(#${gradientId})`} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.5, duration: 0.6 }} />
        <motion.path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
        {coordinates.map(([x, y], index) => (
          <g key={points[index]?.label ?? index} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} className="cursor-pointer">
            <rect x={x - step / 2} y={0} width={Math.max(step, 24)} height={HEIGHT} fill="transparent" />
            <motion.circle
              cx={x}
              cy={y}
              r={hovered === index ? 7 : 4.5}
              fill="#fff"
              stroke={color}
              strokeWidth={2.5}
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + index * 0.06, type: 'spring', stiffness: 300, damping: 18 }}
            />
            <text x={x} y={HEIGHT - 6} textAnchor="middle" fontSize={11} fill={hovered === index ? 'var(--color-ink)' : 'var(--color-muted)'}>
              {points[index]?.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
