import Link from 'next/link';
import { Wordmark } from '@/components/brand';
import { buttonClass } from '@/lib/ui';

export default function NotFound(): React.JSX.Element {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Wordmark />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">No encontramos esta página</h1>
        <p className="text-muted">Puede que el enlace esté incompleto o que la página ya no exista.</p>
      </div>
      <Link href="/" className={buttonClass('primary')}>
        Ir al inicio
      </Link>
    </div>
  );
}
