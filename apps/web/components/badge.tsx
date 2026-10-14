export type BadgeTone = 'celeste' | 'ok' | 'warn' | 'danger' | 'neutral';

const TONES: Record<BadgeTone, string> = {
  celeste: 'bg-celeste-100 text-celeste-900 ring-celeste-200',
  ok: 'bg-mint-50 text-mint-700 ring-mint-100',
  warn: 'bg-sun-50 text-sun-700 ring-sun-100',
  danger: 'bg-rose-50 text-rose-700 ring-rose-100',
  neutral: 'bg-canvas text-muted ring-line',
};

const DOTS: Record<BadgeTone, string> = {
  celeste: 'bg-celeste-500',
  ok: 'bg-mint-500',
  warn: 'bg-sun-500',
  danger: 'bg-rose-500',
  neutral: 'bg-muted/50',
};

export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }): React.JSX.Element {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${TONES[tone]}`}>
      <span aria-hidden="true" className={`size-1.5 rounded-full ${DOTS[tone]}`} />
      {children}
    </span>
  );
}
