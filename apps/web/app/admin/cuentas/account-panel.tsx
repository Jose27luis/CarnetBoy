'use client';

import type { Facility, FacilityAssignmentItem, StaffAccount } from '@carnet/contracts';
import { Settings2 } from 'lucide-react';
import { useActionState, useCallback, useState } from 'react';
import { ActionForm } from '@/components/action-form';
import { FormField, SelectField } from '@/components/form-field';
import { FormMessage } from '@/components/form-message';
import { CheckboxField, PasswordField } from '@/components/password-field';
import { SidePanel } from '@/components/side-panel';
import { SubmitButton } from '@/components/submit-button';
import { fieldError, IDLE, submittedValue } from '@/lib/form-state';
import { buttonClass } from '@/lib/ui';
import {
  accountCommandAction,
  changeOwnPasswordAction,
  endAssignmentAction,
  resetPasswordAction,
  setPasswordAction,
  updateAccountAction,
} from './actions';
import { AssignFacilityForm } from './assign-facility-form';
import { ROLE_OPTIONS } from './create-account-form';

interface AccountPanelProps {
  account: StaffAccount;
  isSelf: boolean;
  assignments: FacilityAssignmentItem[];
  facilities: Facility[];
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="flex flex-col gap-4 border-b border-line pb-6 last:border-b-0 last:pb-0">
      <div>
        <h3 className="font-semibold">{title}</h3>
        {description === undefined ? null : <p className="text-sm text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function DataForm({ account, isSelf }: { account: StaffAccount; isSelf: boolean }): React.JSX.Element {
  const [state, action] = useActionState(updateAccountAction, IDLE);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="accountId" value={account.id} />
      <FormField label="Nombre completo" name="fullName" maxLength={160} defaultValue={submittedValue(state, 'fullName', account.fullName)} error={fieldError(state, 'fullName')} />
      <FormField label="Correo" name="email" type="email" inputMode="email" defaultValue={submittedValue(state, 'email', account.email)} error={fieldError(state, 'email')} />
      {isSelf ? (
        <input type="hidden" name="role" value={account.role} />
      ) : (
        <SelectField label="Rol" name="role" options={ROLE_OPTIONS} defaultValue={submittedValue(state, 'role', account.role)} error={fieldError(state, 'role')} />
      )}
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Guardando">Guardar datos</SubmitButton>
      </div>
    </form>
  );
}

function SetPasswordForm({ accountId }: { accountId: string }): React.JSX.Element {
  const [state, action] = useActionState(setPasswordAction, IDLE);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="accountId" value={accountId} />
      <PasswordField label="Nueva contraseña" name="password" autoComplete="new-password" generator help="Mínimo 12 caracteres. Entrégala a la persona por un medio seguro." error={fieldError(state, 'password')} />
      <CheckboxField label="Pedir que la cambie en su siguiente ingreso" name="requirePasswordChange" />
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Guardando">Guardar contraseña</SubmitButton>
      </div>
    </form>
  );
}

function OwnPasswordForm(): React.JSX.Element {
  const [state, action] = useActionState(changeOwnPasswordAction, IDLE);

  return (
    <form action={action} className="flex flex-col gap-4">
      <PasswordField label="Contraseña actual" name="currentPassword" autoComplete="current-password" error={fieldError(state, 'currentPassword')} />
      <PasswordField label="Nueva contraseña" name="newPassword" autoComplete="new-password" generator help="Mínimo 12 caracteres." error={fieldError(state, 'newPassword')} />
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Cambiando">Cambiar mi contraseña</SubmitButton>
      </div>
    </form>
  );
}

function Assignments({ account, assignments, facilities }: Omit<AccountPanelProps, 'isSelf'>): React.JSX.Element {
  const assignedIds = new Set(assignments.map((assignment) => assignment.facilityId));
  const assignable = facilities.filter((facility) => facility.active && !assignedIds.has(facility.id));

  return (
    <div className="flex flex-col gap-3">
      {assignments.length === 0 ? (
        <p className="text-sm text-muted">Sin establecimientos. No podrá registrar atenciones hasta tener uno.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {assignments.map((assignment) => (
            <li key={assignment.facilityId} className="flex flex-wrap items-center justify-between gap-2 rounded-(--radius-control) bg-celeste-50 px-3 py-2 text-sm">
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
  );
}

function AccessActions({ account }: { account: StaffAccount }): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-start gap-2">
      {account.status === 'ACTIVE' ? (
        <ActionForm
          action={accountCommandAction}
          label="Desactivar cuenta"
          pendingLabel="Desactivando"
          variant="danger"
          compact={false}
          confirm={`¿Desactivar la cuenta de ${account.fullName}? No podrá ingresar y se cerrarán todas sus sesiones.`}
          fields={{ accountId: account.id, command: 'suspend' }}
        />
      ) : (
        <ActionForm action={accountCommandAction} label="Reactivar cuenta" pendingLabel="Reactivando" compact={false} fields={{ accountId: account.id, command: 'reactivate' }} />
      )}
      <ActionForm
        action={resetPasswordAction}
        label="Generar contraseña temporal"
        pendingLabel="Generando"
        compact={false}
        confirm={`¿Generar una contraseña temporal para ${account.fullName}? Se cerrarán sus sesiones.`}
        fields={{ accountId: account.id }}
      />
      {account.totpEnabled ? (
        <ActionForm
          action={accountCommandAction}
          label="Reiniciar verificación en dos pasos"
          pendingLabel="Reiniciando"
          compact={false}
          confirm={`¿Borrar el segundo factor de ${account.fullName}? Tendrá que configurarlo otra vez.`}
          fields={{ accountId: account.id, command: 'totp-reset' }}
        />
      ) : null}
    </div>
  );
}

export function AccountPanel({ account, isSelf, assignments, facilities }: AccountPanelProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass('secondary', 'min-h-9 px-3 text-sm')}>
        <Settings2 aria-hidden="true" className="size-4" />
        {isSelf ? 'Mi cuenta' : 'Gestionar'}
      </button>
      <SidePanel open={open} title={account.fullName} description={account.email} onClose={close}>
        <div className="flex flex-col gap-6">
          <Section title="Datos" description={isSelf ? 'Tu propio rol no se puede cambiar.' : undefined}>
            <DataForm account={account} isSelf={isSelf} />
          </Section>
          {isSelf ? (
            <Section title="Contraseña">
              <OwnPasswordForm />
            </Section>
          ) : (
            <>
              <Section title="Contraseña" description="Define una contraseña para esta persona. Se desbloquea la cuenta y se cierran sus sesiones.">
                <SetPasswordForm accountId={account.id} />
              </Section>
              {account.role === 'DIGITIZER' ? (
                <Section title="Establecimientos" description="Donde puede registrar atenciones.">
                  <Assignments account={account} assignments={assignments} facilities={facilities} />
                </Section>
              ) : null}
              <Section title="Acceso">
                <AccessActions account={account} />
              </Section>
            </>
          )}
        </div>
      </SidePanel>
    </>
  );
}
