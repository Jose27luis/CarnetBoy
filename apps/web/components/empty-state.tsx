import { Sparkles } from 'lucide-react';

export function EmptyState({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-(--radius-panel) border border-dashed border-celeste-200 bg-linear-to-br from-white to-celeste-50/70 px-6 py-10 text-center">
      <span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-linear-to-br from-celeste-100 to-violet-100 text-celeste-700">
        <Sparkles aria-hidden="true" className="size-5" />
      </span>
      <p className="font-display text-lg font-semibold">{title}</p>
      <div className="mx-auto mt-1.5 max-w-md text-muted">{children}</div>
    </div>
  );
}
