'use client';

import { motion } from 'motion/react';
import { useState } from 'react';
import { type Accent, ACCENT_COLOR } from './palette';

export interface ColumnSeries {
  key: string;
  label: string;
  accent: Accent;
}

export interface ColumnGroup {
  label: string;
  values: Record<string, number>;
}

const HEIGHT = 200;

export function ColumnChart({ series, groups }: { series: readonly ColumnSeries[]; groups: readonly ColumnGroup[] }): React.JSX.Element {
  const [hovered, setHovered] = useState<number | null>(null);
  const totals = groups.map((group) => series.reduce((sum, item) => sum + (group.values[item.key] ?? 0), 0));
  const max = Math.max(1, ...totals);
  const active = hovered === null ? null : groups[hovered];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {series.map((item) => (
          <span key={item.key} className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: ACCENT_COLOR[item.accent] }} />
            {item.label}
          </span>
        ))}
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height: HEIGHT }}>
          {[0, 1, 2, 3].map((line) => (
            <span key={line} className="border-t border-dashed border-line/80" />
          ))}
        </div>
        <ul className="relative flex items-end gap-2 sm:gap-4" style={{ height: HEIGHT }} onMouseLeave={() => setHovered(null)}>
          {groups.map((group, groupIndex) => {
            const total = totals[groupIndex] ?? 0;

            return (
              <li
                key={group.label}
                className="flex h-full flex-1 cursor-default flex-col justify-end"
                onMouseEnter={() => setHovered(groupIndex)}
                onFocus={() => setHovered(groupIndex)}
                tabIndex={0}
                aria-label={`${group.label}: ${series.map((item) => `${item.label} ${group.values[item.key] ?? 0}`).join(', ')}`}
              >
                <motion.div
                  className={`flex flex-col-reverse overflow-hidden rounded-t-xl transition-opacity ${hovered !== null && hovered !== groupIndex ? 'opacity-45' : ''}`}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${(total / max) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + groupIndex * 0.07, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                  {series.map((item) => {
                    const value = group.values[item.key] ?? 0;

                    return value === 0 ? null : (
                      <span key={item.key} style={{ flexGrow: value, backgroundColor: ACCENT_COLOR[item.accent] }} className="block min-h-1 border-t border-white/40" />
                    );
                  })}
                </motion.div>
              </li>
            );
          })}
        </ul>
        <ul className="mt-2 flex gap-2 sm:gap-4">
          {groups.map((group, groupIndex) => (
            <li key={group.label} className={`flex-1 text-center text-xs font-semibold ${hovered === groupIndex ? 'text-ink' : 'text-muted'}`}>
              {group.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="min-h-12 rounded-2xl bg-canvas px-4 py-2.5 text-sm">
        {active === null || active === undefined ? (
          <span className="text-muted">Pasa el cursor sobre un mes para ver el detalle.</span>
        ) : (
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="font-semibold">{active.label}</span>
            {series.map((item) => (
              <span key={item.key} className="text-muted">
                {item.label}: <span className="font-semibold text-ink tabular-nums">{active.values[item.key] ?? 0}</span>
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
