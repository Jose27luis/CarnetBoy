import type { ChildSummary } from '@carnet/contracts';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { childDocument, describeAgeFrom, SEX_LABEL } from '@/lib/labels';

const AVATAR = ['from-celeste-500 to-celeste-700', 'from-mint-500 to-mint-700', 'from-coral-500 to-coral-700', 'from-violet-500 to-violet-700', 'from-sun-500 to-sun-700'] as const;

function avatarOf(id: string): string {
  const sum = [...id].reduce((total, character) => total + character.charCodeAt(0), 0);

  return AVATAR[sum % AVATAR.length] ?? AVATAR[0];
}

export function ChildCard({ child, today, index }: { child: ChildSummary; today: string; index: number }): React.JSX.Element {
  return (
    <li className="animate-rise" style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}>
      <Link
        href={`/digitador/ninos/${child.id}`}
        className="group flex h-full items-center gap-4 rounded-[18px] border border-line/70 bg-white p-4 shadow-[0_14px_32px_-28px_rgba(11,79,111,0.5)] transition-all hover:-translate-y-0.5 hover:border-celeste-200 hover:shadow-[0_20px_40px_-26px_rgba(11,79,111,0.55)]"
      >
        <span className={`grid size-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br font-display text-base font-semibold text-white ${avatarOf(child.id)}`}>
          {child.givenNames.charAt(0)}
          {child.paternalSurname.charAt(0)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">
            {child.givenNames} {child.paternalSurname} {child.maternalSurname}
          </span>
          <span className="block truncate text-sm text-muted">
            {SEX_LABEL[child.sex]}, {describeAgeFrom(child.birthDate, today)}. {childDocument(child)}
          </span>
        </span>
        <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-celeste-700" />
      </Link>
    </li>
  );
}
