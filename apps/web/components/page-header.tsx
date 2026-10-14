interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps): React.JSX.Element {
  return (
    <header className="relative mb-8 animate-rise overflow-hidden rounded-[24px] border border-white/60 bg-linear-to-br from-white via-celeste-50 to-violet-50 px-6 py-6 shadow-[0_24px_60px_-40px_rgba(11,79,111,0.55)] print:hidden sm:px-8 sm:py-7">
      <span aria-hidden="true" className="absolute -right-10 -top-16 size-48 animate-float rounded-full bg-celeste-200/50 blur-2xl" />
      <span aria-hidden="true" className="absolute -bottom-20 right-32 size-40 animate-float rounded-full bg-coral-100/70 blur-2xl [animation-delay:-3s]" />
      <span aria-hidden="true" className="absolute -left-12 bottom-0 size-32 animate-float rounded-full bg-violet-100/70 blur-2xl [animation-delay:-6s]" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 max-w-2xl flex-col gap-1.5">
          {eyebrow === undefined ? null : (
            <p className="w-fit rounded-full bg-white/80 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-celeste-700 ring-1 ring-celeste-100">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-semibold sm:text-[2rem] sm:leading-tight">{title}</h1>
          {description === undefined ? null : <p className="text-muted">{description}</p>}
        </div>
        {actions}
      </div>
    </header>
  );
}
