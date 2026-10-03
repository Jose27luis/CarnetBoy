import { FloatingCard } from '@/components/login/floating-card';

export default function ActivationTemplate({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <FloatingCard>{children}</FloatingCard>;
}
