import { GrowthPanel, MobileGrowthHero } from '@/components/login/growth-panel';

const GRAPH_PAPER =
  'bg-canvas bg-[linear-gradient(var(--color-celeste-100)_1px,transparent_1px),linear-gradient(90deg,var(--color-celeste-100)_1px,transparent_1px)] bg-[size:28px_28px]';

export default function LoginLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="hidden lg:sticky lg:top-0 lg:block lg:h-dvh">
        <GrowthPanel />
      </aside>
      <main className={`flex min-h-dvh flex-col ${GRAPH_PAPER}`}>
        <div className="lg:hidden">
          <MobileGrowthHero />
        </div>
        <div className="relative z-10 -mt-20 flex flex-1 items-start justify-center px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-8 lg:mt-0 lg:items-center lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
