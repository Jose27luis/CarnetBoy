export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const BUTTON_BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-(--radius-control) px-4 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-celeste-700 text-white hover:bg-celeste-800',
  secondary: 'border border-line bg-white text-ink hover:border-celeste-500 hover:bg-celeste-50',
  danger: 'border border-danger/40 bg-white text-danger hover:bg-danger/5',
  ghost: 'text-muted hover:bg-celeste-50 hover:text-ink',
};

export function buttonClass(variant: ButtonVariant = 'primary', extra = ''): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${extra}`.trim();
}

export const INPUT_CLASS =
  'min-h-11 w-full rounded-(--radius-control) border border-line bg-white px-3 text-ink outline-none transition-colors focus:border-celeste-500 focus:ring-2 focus:ring-celeste-100 aria-[invalid=true]:border-danger';

export const PANEL_CLASS = 'rounded-(--radius-panel) border border-line bg-white';
