'use client';

import { MotionConfig } from 'motion/react';

export function MotionRoot({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
