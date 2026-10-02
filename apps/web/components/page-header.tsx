interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps): React.JSX.Element {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 max-w-2xl flex-col gap-1.5">
        {eyebrow === undefined ? null : (
          <p className="text-sm font-semibold uppercase tracking-wider text-celeste-700">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description === undefined ? null : <p className="text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
