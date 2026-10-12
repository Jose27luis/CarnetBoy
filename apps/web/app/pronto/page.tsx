import { redirect } from 'next/navigation';

export default function LegacyGuardianHomePage(): never {
  redirect('/carnet');
}
