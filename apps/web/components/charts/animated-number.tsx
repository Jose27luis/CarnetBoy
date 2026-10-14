'use client';

import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

const FORMAT = new Intl.NumberFormat('es-PE');

export function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }): React.JSX.Element {
  const reduceMotion = useReducedMotion() === true;
  const [shown, setShown] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      queueMicrotask(() => setShown(value));
      return;
    }

    const controls = animate(0, value, { duration: 1.1, ease: [0.22, 1, 0.36, 1], onUpdate: (latest) => setShown(Math.round(latest)) });

    return () => controls.stop();
  }, [value, reduceMotion]);

  return (
    <span className="tabular-nums">
      {FORMAT.format(shown)}
      {suffix}
    </span>
  );
}
