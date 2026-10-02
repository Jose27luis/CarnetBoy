export function EmptyState({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="rounded-(--radius-panel) border border-dashed border-celeste-200 bg-white px-6 py-10 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      <div className="mx-auto mt-1.5 max-w-md text-muted">{children}</div>
    </div>
  );
}
