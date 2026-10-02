import { Wordmark } from '@/components/brand';
import { GrowthPanel } from '@/components/login/growth-panel';

const GRAPH_PAPER =
  'bg-canvas bg-[linear-gradient(var(--color-celeste-100)_1px,transparent_1px),linear-gradient(90deg,var(--color-celeste-100)_1px,transparent_1px)] bg-[size:28px_28px]';

export default function LoginLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="hidden lg:sticky lg:top-0 lg:block lg:h-dvh">
        <GrowthPanel />
      </aside>
      <main className={`flex min-h-dvh flex-col ${GRAPH_PAPER}`}>
        <header className="px-5 pt-6 lg:hidden">
          <Wordmark />
        </header>
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">{children}</div>
      </main>
    </div>
  );
}
