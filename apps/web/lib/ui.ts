export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const BUTTON_BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-(--radius-control) px-4 font-semibold transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-linear-to-br from-celeste-700 to-celeste-500 text-white shadow-[0_10px_24px_-12px_rgba(11,127,179,0.9)] hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-12px_rgba(11,127,179,0.95)]',
  secondary: 'border border-line bg-white text-ink shadow-sm hover:border-celeste-500 hover:bg-celeste-50',
  danger: 'border border-danger/30 bg-white text-danger hover:bg-danger/5',
  ghost: 'text-muted hover:bg-celeste-50 hover:text-ink',
};

export function buttonClass(variant: ButtonVariant = 'primary', extra = ''): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${extra}`.trim();
}

export const INPUT_CLASS =
  'min-h-11 w-full rounded-(--radius-control) border border-line bg-white px-3 text-ink shadow-[inset_0_1px_2px_rgba(14,42,58,0.04)] outline-none transition-colors focus:border-celeste-500 focus:ring-4 focus:ring-celeste-100 aria-[invalid=true]:border-danger';

export const PANEL_CLASS =
  'rounded-(--radius-panel) border border-line/70 bg-white shadow-[0_1px_2px_rgba(14,42,58,0.04),0_18px_40px_-30px_rgba(11,79,111,0.45)]';
