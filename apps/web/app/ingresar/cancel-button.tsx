import { buttonClass } from '@/lib/ui';
import { cancelLoginAction } from './actions';

export function CancelLoginButton(): React.JSX.Element {
  return (
    <form action={cancelLoginAction}>
      <button type="submit" className={buttonClass('ghost', 'w-full')}>
        Volver a ingresar con otra cuenta
      </button>
    </form>
  );
}
