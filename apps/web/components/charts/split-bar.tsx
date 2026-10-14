'use client';

import { motion } from 'motion/react';
import { type Accent, ACCENT_COLOR } from './palette';

export interface SplitPart {
  key: string;
  label: string;
  value: number;
  accent: Accent;
}

export function SplitBar({ parts }: { parts: readonly SplitPart[] }): React.JSX.Element {
  const total = parts.reduce((sum, part) => sum + part.value, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-4 overflow-hidden rounded-full bg-canvas">
        {parts.map((part, index) =>
          part.value === 0 ? null : (
            <motion.span
              key={part.key}
              className="h-full border-r-2 border-white last:border-r-0"
              style={{ backgroundColor: ACCENT_COLOR[part.accent] }}
              initial={{ width: 0 }}
              whileInView={{ width: `${(part.value / (total || 1)) * 100}%` }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + index * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
          ),
        )}
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {parts.map((part) => (
          <li key={part.key} className="flex flex-col rounded-2xl bg-canvas px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <span className="size-2 rounded-full" style={{ backgroundColor: ACCENT_COLOR[part.accent] }} />
              {part.label}
            </span>
            <span className="font-display text-xl font-semibold tabular-nums">
              {part.value}
              <span className="ml-1 text-xs font-normal text-muted">{total === 0 ? '' : `${Math.round((part.value / total) * 100)}%`}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
