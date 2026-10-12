'use client';

import type { NextStep } from '@carnet/contracts';
import { CalendarPlus, CircleCheck, MapPin, TriangleAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { FAMILY_APPOINTMENT_TEXT } from '@/lib/family-labels';
import { formatLongDate } from '@/lib/labels';

interface CalendarEvent {
  title: string;
  date: string;
  location: string | null;
  description: string;
}

function icsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function downloadEvent(event: CalendarEvent): void {
  const day = event.date.replaceAll('-', '');
  const next = new Date(Date.parse(`${event.date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10).replaceAll('-', '');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Carnet CRED//ES',
    'BEGIN:VEVENT',
    `UID:${crypto.randomUUID()}@carnet-cred`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${day}`,
    `DTEND;VALUE=DATE:${next}`,
    `SUMMARY:${icsText(event.title)}`,
    `DESCRIPTION:${icsText(event.description)}`,
    ...(event.location === null ? [] : [`LOCATION:${icsText(event.location)}`]),
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(event.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'cita-carnet-cred.ics';
  link.click();
  URL.revokeObjectURL(url);
}

function describe(step: NextStep, childName: string): { title: string; detail: string; event: CalendarEvent | null; tone: 'celeste' | 'warn' | 'ok' } {
  if (step.kind === 'APPOINTMENT') {
    const type = FAMILY_APPOINTMENT_TEXT[step.appointment.type];

    return {
      title: `${type} el ${formatLongDate(step.appointment.scheduledOn)}`,
      detail: step.appointment.note === null ? `En ${step.appointment.facilityName}.` : `En ${step.appointment.facilityName}. ${step.appointment.note}`,
      tone: 'celeste',
      event: {
        title: `${type} de ${childName}`,
        date: step.appointment.scheduledOn,
        location: step.appointment.facilityName,
        description: step.appointment.note ?? 'Lleva el DNI del niño.',
      },
    };
  }

  if (step.kind === 'VACCINE') {
    return {
      title: `${step.vaccineName}, dosis ${step.doseNumber}`,
      detail: `Le corresponde desde el ${formatLongDate(step.recommendedDate)}. Acércate a tu establecimiento de salud.`,
      tone: 'celeste',
      event: {
        title: `Vacuna de ${childName}: ${step.vaccineName}`,
        date: step.recommendedDate,
        location: null,
        description: `Dosis ${step.doseNumber}. Lleva el DNI del niño.`,
      },
    };
  }

  if (step.kind === 'OVERDUE_VACCINES') {
    return {
      title: 'Hay vacunas atrasadas',
      detail: `Consulta en tu establecimiento qué hacer con: ${step.vaccines.join(', ')}.`,
      tone: 'warn',
      event: null,
    };
  }

  return { title: 'Todo al día', detail: 'No hay nada pendiente por ahora. Te avisaremos cuando toque lo siguiente.', tone: 'ok', event: null };
}

const TONE_CLASS = {
  celeste: 'from-celeste-700 to-celeste-500 text-white',
  warn: 'from-[#8a4b06] to-[#c27411] text-white',
  ok: 'from-ok to-[#22a06b] text-white',
} as const;

export function NextStepCard({ step, childName }: { step: NextStep; childName: string }): React.JSX.Element {
  const content = describe(step, childName);
  const Icon = content.tone === 'warn' ? TriangleAlert : content.tone === 'ok' ? CircleCheck : MapPin;
  const event = content.event;

  return (
    <motion.section
      aria-labelledby="next-step"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`relative overflow-hidden rounded-[24px] bg-linear-to-br p-6 shadow-[0_24px_60px_-30px_rgba(11,79,111,0.6)] ${TONE_CLASS[content.tone]}`}
    >
      <div aria-hidden="true" className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10" />
      <p className="text-sm font-semibold uppercase tracking-wider text-white/80">Próximo paso</p>
      <h2 id="next-step" className="mt-2 flex items-start gap-2 text-2xl font-semibold leading-tight first-letter:uppercase">
        <Icon aria-hidden="true" className="mt-1 size-6 shrink-0" />
        {content.title}
      </h2>
      <p className="mt-2 text-white/90">{content.detail}</p>
      {event === null ? null : (
        <button
          type="button"
          onClick={() => downloadEvent(event)}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 font-semibold text-celeste-900 transition-transform active:scale-95"
        >
          <CalendarPlus aria-hidden="true" className="size-5" />
          Agregar al calendario
        </button>
      )}
    </motion.section>
  );
}
