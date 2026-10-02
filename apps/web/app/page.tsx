import { redirect } from 'next/navigation';
import { currentAccount, HOME_BY_ROLE } from '@/lib/session';

export default async function RootPage(): Promise<never> {
  const account = await currentAccount();

  redirect(account === null ? '/ingresar' : HOME_BY_ROLE[account.role]);
}
