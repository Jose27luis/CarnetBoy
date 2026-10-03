import { AuthShell } from '@/components/login/auth-shell';

export default function ActivationLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <AuthShell>{children}</AuthShell>;
}
