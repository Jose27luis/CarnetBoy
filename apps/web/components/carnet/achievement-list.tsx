'use client';

import type { Achievement } from '@carnet/contracts';
import { Award } from 'lucide-react';
import { motion } from 'motion/react';
import { formatCalendarDate } from '@/lib/labels';

export function AchievementList({ achievements }: { achievements: readonly Achievement[] }): React.JSX.Element {
  if (achievements.length === 0) {
    return <p className="text-muted">Cada vacuna y control que cumpla se convertirá en un logro aquí.</p>;
  }

  return (
    <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
      {achievements.map((achievement, index) => (
        <motion.li
          key={achievement.key}
          initial={{ opacity: 0, scale: 0.85, y: 10 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: Math.min(index, 6) * 0.06 }}
          className="flex w-56 shrink-0 snap-start flex-col gap-2 rounded-[20px] border border-celeste-200 bg-white p-4"
        >
          <span className="grid size-11 place-items-center rounded-full bg-celeste-100 text-celeste-800">
            <Award aria-hidden="true" className="size-6" />
          </span>
          <p className="font-display font-semibold leading-snug">{achievement.title}</p>
          <p className="text-sm text-muted">{achievement.description}</p>
          <p className="mt-auto text-xs font-semibold text-celeste-700">{formatCalendarDate(achievement.achievedOn)}</p>
        </motion.li>
      ))}
    </ul>
  );
}
