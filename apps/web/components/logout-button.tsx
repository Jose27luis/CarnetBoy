import { LogOut } from 'lucide-react';
import { buttonClass } from '@/lib/ui';

export function LogoutButton({ className = '' }: { className?: string }): React.JSX.Element {
  return (
    <form action="/salir" method="post">
      <button type="submit" className={buttonClass('ghost', `min-h-10 px-3 text-sm ${className}`)}>
        <LogOut aria-hidden="true" className="size-4" />
        Cerrar sesión
      </button>
    </form>
  );
}
