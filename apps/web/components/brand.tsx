import Image from 'next/image';

const LOGO_WIDTH = 512;
const LOGO_HEIGHT = 367;

export function BrandMark({ className = 'h-9 w-auto' }: { className?: string }): React.JSX.Element {
  return <Image src="/logoCarnet.png" alt="" width={LOGO_WIDTH} height={LOGO_HEIGHT} priority className={className} />;
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
