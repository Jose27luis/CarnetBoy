export function BrandMark({ className = 'size-9' }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <rect x="2" y="6" width="36" height="28" rx="6" fill="#0b7fb3" />
      <rect x="2" y="6" width="36" height="8" rx="6" fill="#38b6e8" />
      <rect x="2" y="11" width="36" height="3" fill="#38b6e8" />
      <path d="M8 29 C14 28, 17 24, 21 22 S29 17, 33 16" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="33" cy="16" r="2.2" fill="#ffffff" />
    </svg>
  );
}

export function Wordmark(): React.JSX.Element {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark />
      <span className="font-display text-lg font-semibold leading-none text-ink">
        Carnet <span className="text-celeste-700">CRED</span>
      </span>
    </span>
  );
}
