import { Wordmark } from '@/components/brand';

export default function LoginLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex min-h-dvh flex-col bg-[linear-gradient(180deg,var(--color-celeste-50)_0%,var(--color-canvas)_45%)]">
      <header className="px-4 pt-8 sm:px-8">
        <Wordmark />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-10 sm:pt-16">
        <div className="w-full max-w-md rounded-(--radius-panel) border border-line bg-white p-6 shadow-[0_18px_40px_-28px_rgba(11,79,111,0.45)] sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
