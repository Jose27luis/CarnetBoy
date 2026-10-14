'use client';

import { motion } from 'motion/react';
import { type Accent, ACCENT_BAR } from './palette';

export interface BarItem {
  label: string;
  value: number;
}

export function BarList({ items, accent, unit }: { items: readonly BarItem[]; accent: Accent; unit: string }): React.JSX.Element {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item, index) => (
        <li key={item.label} className="flex flex-col gap-1.5">
          <span className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-semibold">{item.label}</span>
            <span className="shrink-0 text-muted tabular-nums">
              {item.value} {unit}
            </span>
          </span>
          <span className="h-2.5 overflow-hidden rounded-full bg-canvas">
            <motion.span
              className={`block h-full rounded-full bg-linear-to-r ${ACCENT_BAR[accent]}`}
              initial={{ width: 0 }}
              whileInView={{ width: `${(item.value / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + index * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
