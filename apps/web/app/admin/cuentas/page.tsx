import type { Facility, FacilityAssignmentItem, StaffAccount } from '@carnet/contracts';
import type { Metadata } from 'next';
import { ActionForm } from '@/components/action-form';
import { Badge } from '@/components/badge';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { ACCOUNT_STATUS_LABEL, formatDateTime, ROLE_LABEL } from '@/lib/labels';
import { currentAccount, loadOrFail } from '@/lib/session';
import { PANEL_CLASS } from '@/lib/ui';
import { accountCommandAction, endAssignmentAction, resetPasswordAction } from './actions';
import { AssignFacilityForm } from './assign-facility-form';
import { CreateAccountForm } from './create-account-form';

export const metadata: Metadata = { title: 'Cuentas' };

function AccountStatusBadges({ account }: { account: StaffAccount }): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge tone={account.status === 'ACTIVE' ? 'ok' : 'danger'}>{ACCOUNT_STATUS_LABEL[account.status]}</Badge>
      <Badge tone="celeste">{ROLE_LABEL[account.role]}</Badge>
      {account.passwordChangeRequired ? <Badge tone="warn">Contraseña temporal</Badge> : null}
      {account.totpEnabled ? <Badge tone="neutral">Verificación activa</Badge> : <Badge tone="warn">Sin verificación</Badge>}
      {account.locked && account.lockedUntil !== null ? (
        <Badge tone="danger">Bloqueada hasta {formatDateTime(account.lockedUntil)}</Badge>
      ) : null}
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
  const assignedIds = new Set(assignments.map((assignment) => assignment.facilityId));
  const assignable = facilities.filter((facility) => facility.active && !assignedIds.has(facility.id));

  return (
    <li className={`${PANEL_CLASS} flex flex-col gap-4 p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold">
            {account.fullName}
            {isSelf ? <span className="ml-2 text-sm font-normal text-muted">(tú)</span> : null}
          </p>
          <p className="break-all text-sm text-muted">{account.email}</p>
        </div>
        <AccountStatusBadges account={account} />
      </div>

      {account.role === 'DIGITIZER' ? (
        <div className="flex flex-col gap-3 rounded-(--radius-control) bg-celeste-50 p-4">
          <p className="text-sm font-semibold">Establecimientos asignados</p>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted">Sin establecimientos. No podrá registrar atenciones hasta tener uno.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {assignments.map((assignment) => (
                <li key={assignment.facilityId} className="flex flex-wrap items-start justify-between gap-2 text-sm">
                  <span>
                    {assignment.facilityName} <span className="text-muted">({assignment.ipressCode})</span>
                  </span>
                  <ActionForm
                    action={endAssignmentAction}
                    label="Quitar"
                    pendingLabel="Quitando"
                    variant="ghost"
                    confirm={`¿Quitar ${assignment.facilityName} de ${account.fullName}?`}
                    fields={{ accountId: account.id, facilityId: assignment.facilityId }}
                  />
                </li>
              ))}
            </ul>
          )}
          <AssignFacilityForm accountId={account.id} facilities={assignable} />
        </div>
      ) : null}

      {isSelf ? null : (
        <div className="flex flex-wrap items-start gap-2 border-t border-line pt-4">
          {account.status === 'ACTIVE' ? (
            <ActionForm
              action={accountCommandAction}
              label="Suspender"
              pendingLabel="Suspendiendo"
              variant="danger"
              confirm={`¿Suspender la cuenta de ${account.fullName}? Se cerrarán todas sus sesiones.`}
              fields={{ accountId: account.id, command: 'suspend' }}
            />
          ) : (
            <ActionForm
              action={accountCommandAction}
              label="Reactivar"
              pendingLabel="Reactivando"
              fields={{ accountId: account.id, command: 'reactivate' }}
            />
          )}
          <ActionForm
            action={resetPasswordAction}
            label="Nueva contraseña temporal"
            pendingLabel="Generando"
            confirm={`¿Generar una contraseña temporal nueva para ${account.fullName}? Se cerrarán sus sesiones.`}
            fields={{ accountId: account.id }}
          />
          {account.totpEnabled ? (
            <ActionForm
              action={accountCommandAction}
              label="Reiniciar verificación"
              pendingLabel="Reiniciando"
              confirm={`¿Borrar el segundo factor de ${account.fullName}? Tendrá que configurarlo otra vez.`}
              fields={{ accountId: account.id, command: 'totp-reset' }}
            />
          ) : null}
        </div>
      )}
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
        description="Admins y digitadores. Cada cuenta nueva recibe una contraseña temporal y configura su verificación en dos pasos al primer ingreso."
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
        <ul className="flex flex-col gap-4">
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
