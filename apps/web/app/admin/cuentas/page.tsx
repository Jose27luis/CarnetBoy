import type { Facility, FacilityAssignmentItem, StaffAccount } from '@carnet/contracts';
import { Building2 } from 'lucide-react';
import type { Metadata } from 'next';
import { Badge } from '@/components/badge';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { ACCOUNT_STATUS_LABEL, formatDateTime, ROLE_LABEL } from '@/lib/labels';
import { currentAccount, loadOrFail } from '@/lib/session';
import { PANEL_CLASS } from '@/lib/ui';
import { AccountPanel } from './account-panel';
import { CreateAccountForm } from './create-account-form';

export const metadata: Metadata = { title: 'Cuentas' };

function AccountStatusBadges({ account }: { account: StaffAccount }): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge tone={account.status === 'ACTIVE' ? 'ok' : 'danger'}>{ACCOUNT_STATUS_LABEL[account.status]}</Badge>
      <Badge tone="celeste">{ROLE_LABEL[account.role]}</Badge>
      {account.passwordChangeRequired ? <Badge tone="warn">Debe cambiar su contraseña</Badge> : null}
      {account.totpEnabled ? <Badge tone="neutral">Verificación en dos pasos</Badge> : null}
      {account.locked && account.lockedUntil !== null ? <Badge tone="danger">Bloqueada hasta {formatDateTime(account.lockedUntil)}</Badge> : null}
    </div>
  );
}

function AccountCard({
  account,
  isSelf,
  assignments,
  facilities,
}: {
  account: StaffAccount;
  isSelf: boolean;
  assignments: FacilityAssignmentItem[];
  facilities: Facility[];
}): React.JSX.Element {
  return (
    <li className={`${PANEL_CLASS} flex flex-col gap-3 p-5 ${account.status === 'ACTIVE' ? '' : 'bg-canvas'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold">
            {account.fullName}
            {isSelf ? <span className="ml-2 text-sm font-normal text-muted">(tú)</span> : null}
          </p>
          <p className="break-all text-sm text-muted">{account.email}</p>
        </div>
        <AccountPanel account={account} isSelf={isSelf} assignments={assignments} facilities={facilities} />
      </div>
      <AccountStatusBadges account={account} />
      {account.role === 'DIGITIZER' ? (
        <p className="flex items-start gap-2 text-sm text-muted">
          <Building2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {assignments.length === 0 ? 'Sin establecimientos asignados.' : assignments.map((assignment) => assignment.facilityName).join(', ')}
        </p>
      ) : null}
    </li>
  );
}

export default async function AccountsPage(): Promise<React.JSX.Element> {
  const [me, accounts, assignments, facilities] = await Promise.all([
    currentAccount(),
    loadOrFail<StaffAccount[]>('/v1/admin/accounts'),
    loadOrFail<FacilityAssignmentItem[]>('/v1/admin/facilities/assignments'),
    loadOrFail<Facility[]>('/v1/admin/facilities'),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="General"
        title="Cuentas del personal"
        description="Admins y digitadores. Con Gestionar editas sus datos, defines su contraseña, asignas establecimientos o desactivas la cuenta."
      />

      <section aria-labelledby="new-account" className={`${PANEL_CLASS} mb-8 p-5`}>
        <h2 id="new-account" className="mb-4 text-lg font-semibold">
          Nueva cuenta
        </h2>
        <CreateAccountForm />
      </section>

      {accounts.length === 0 ? (
        <EmptyState title="Todavía no hay cuentas">Crea la primera cuenta de digitador con el formulario de arriba.</EmptyState>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              isSelf={account.id === me?.id}
              assignments={assignments.filter((assignment) => assignment.accountId === account.id)}
              facilities={facilities}
            />
          ))}
        </ul>
      )}
    </>
  );
}
