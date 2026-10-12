'use client';

import { motion } from 'motion/react';
import { useRef, useState } from 'react';

export function ChildCarousel({ children, count }: { children: React.ReactNode; count: number }): React.JSX.Element {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function onScroll(): void {
    const element = track.current;

    if (element === null || element.clientWidth === 0) {
      return;
    }

    setActive(Math.round(element.scrollLeft / element.clientWidth));
  }

  function goTo(index: number): void {
    track.current?.scrollTo({ left: index * (track.current.clientWidth || 0), behavior: 'smooth' });
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={track}
        onScroll={onScroll}
        className="-mx-4 flex snap-x snap-mandatory overflow-x-auto scroll-smooth px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {count > 1 ? (
        <div className="flex justify-center gap-2" role="tablist" aria-label="Elegir niño">
          {Array.from({ length: count }, (_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={`Niño ${index + 1} de ${count}`}
              onClick={() => goTo(index)}
              className="grid h-6 w-6 place-items-center"
            >
              <motion.span
                className="block h-2 rounded-full bg-celeste-700"
                animate={{ width: index === active ? 24 : 8, opacity: index === active ? 1 : 0.35 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
