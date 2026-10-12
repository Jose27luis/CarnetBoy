'use client';

import { CalendarDays, IdCard, PencilLine, Venus, Mars, Baby } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

interface ChildHeroProps {
  childId: string;
  fullName: string;
  sex: 'FEMALE' | 'MALE';
  sexLabel: string;
  age: string;
  document: string;
  birthDate: string;
  preterm: string | null;
}

function initials(fullName: string): string {
  return fullName
    .split(' ')
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur">
      {icon}
      {children}
    </span>
  );
}

export function ChildHero({ childId, fullName, sex, sexLabel, age, document, birthDate, preterm }: ChildHeroProps): React.JSX.Element {
  const SexIcon = sex === 'FEMALE' ? Venus : Mars;

  return (
    <motion.section
      aria-label="Datos principales"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative mb-6 overflow-hidden rounded-[24px] bg-linear-to-br from-celeste-900 via-celeste-800 to-celeste-500 p-6 text-white shadow-[0_30px_70px_-40px_rgba(8,106,150,0.9)] print:hidden sm:p-8"
    >
      <div aria-hidden="true" className="absolute -right-16 -top-20 size-64 rounded-full bg-white/10" />
      <div aria-hidden="true" className="absolute -bottom-24 right-24 size-48 rounded-full bg-white/5" />
      <div className="relative flex flex-wrap items-center gap-5">
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          className="grid size-20 shrink-0 place-items-center rounded-[22px] bg-white font-display text-2xl font-semibold text-celeste-800 shadow-lg"
        >
          {initials(fullName)}
        </motion.span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-wider text-celeste-100/90">Ficha del niño</p>
          <h1 className="mt-0.5 text-2xl font-semibold leading-tight sm:text-3xl">{fullName}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip icon={<SexIcon aria-hidden="true" className="size-4" />}>{sexLabel}</Chip>
            <Chip icon={<Baby aria-hidden="true" className="size-4" />}>{age}</Chip>
            <Chip icon={<IdCard aria-hidden="true" className="size-4" />}>{document}</Chip>
            <Chip icon={<CalendarDays aria-hidden="true" className="size-4" />}>Nació el {birthDate}</Chip>
            {preterm === null ? null : <Chip icon={<Baby aria-hidden="true" className="size-4" />}>{preterm}</Chip>}
          </div>
        </div>
        <Link
          href={`/digitador/ninos/${childId}/editar`}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 font-semibold text-celeste-900 shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <PencilLine aria-hidden="true" className="size-4" />
          Corregir datos
        </Link>
      </div>
    </motion.section>
  );
}
