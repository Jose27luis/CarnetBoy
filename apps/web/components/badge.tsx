export type BadgeTone = 'celeste' | 'ok' | 'warn' | 'danger' | 'neutral';

const TONES: Record<BadgeTone, string> = {
  celeste: 'bg-celeste-100 text-celeste-900',
  ok: 'bg-ok/10 text-ok',
  warn: 'bg-warn/10 text-warn',
  danger: 'bg-danger/10 text-danger',
  neutral: 'bg-canvas text-muted ring-1 ring-line',
};

export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }): React.JSX.Element {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}
