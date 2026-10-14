export type Accent = 'celeste' | 'mint' | 'coral' | 'sun' | 'violet' | 'rose';

export const ACCENT_COLOR: Record<Accent, string> = {
  celeste: '#0b7fb3',
  mint: '#22b07d',
  coral: '#ff7a59',
  sun: '#f5b23c',
  violet: '#7c5cff',
  rose: '#ef5579',
};

export const ACCENT_SOFT: Record<Accent, string> = {
  celeste: 'from-celeste-100 to-celeste-50 text-celeste-800',
  mint: 'from-mint-100 to-mint-50 text-mint-700',
  coral: 'from-coral-100 to-coral-50 text-coral-700',
  sun: 'from-sun-100 to-sun-50 text-sun-700',
  violet: 'from-violet-100 to-violet-50 text-violet-700',
  rose: 'from-rose-100 to-rose-50 text-rose-700',
};

export const ACCENT_BAR: Record<Accent, string> = {
  celeste: 'from-celeste-700 to-celeste-500',
  mint: 'from-mint-700 to-mint-500',
  coral: 'from-coral-700 to-coral-500',
  sun: 'from-sun-700 to-sun-500',
  violet: 'from-violet-700 to-violet-500',
  rose: 'from-rose-700 to-rose-500',
};

export const SERIES_ORDER: readonly Accent[] = ['celeste', 'mint', 'coral', 'violet', 'sun', 'rose'];
