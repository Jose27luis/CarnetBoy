'use client';

import { CONSENT_TEXT, RELATIONSHIPS } from '@carnet/contracts';
import { CircleCheck, Search } from 'lucide-react';
import { useActionState, useId, useState } from 'react';
import { ActivationSlip } from '@/components/activation-slip';
import { FormField, SelectField } from '@/components/form-field';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { fieldError, IDLE, submittedValue } from '@/lib/form-state';
import { personName, RELATIONSHIP_LABEL } from '@/lib/labels';
import { buttonClass, INPUT_CLASS } from '@/lib/ui';
import { createLinkAction, type LinkState, lookupGuardianAction, type LookupState } from './actions';

interface LinkGuardianProps {
  childId: string;
  childName: string;
  activationUrl: string;
}

const LOOKUP_IDLE: LookupState = { status: 'idle' };

function LookupStep({ onFound }: { onFound: (state: Extract<LookupState, { dni: string }>) => void }): React.JSX.Element {
  const [state, action] = useActionState(async (previous: LookupState, formData: FormData) => {
    const next = await lookupGuardianAction(previous, formData);

    if (next.status === 'found' || next.status === 'new') {
      onFound(next);
    }

    return next;
  }, LOOKUP_IDLE);
  const id = useId();

  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        DNI del apoderado
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          name="guardianDni"
          inputMode="numeric"
          pattern="[0-9]{8}"
          maxLength={8}
          required
          autoComplete="off"
          aria-invalid={state.status === 'error' ? true : undefined}
          className={`${INPUT_CLASS} sm:max-w-xs`}
        />
        <SubmitButton pendingLabel="Buscando" variant="secondary">
          <Search aria-hidden="true" className="size-4" />
          Continuar
        </SubmitButton>
      </div>
      {state.status === 'error' ? <p className="text-sm text-danger">{state.message}</p> : null}
    </form>
  );
}

function DetailsStep({
  childId,
  lookup,
  onLinked,
  onBack,
}: {
  childId: string;
  lookup: Extract<LookupState, { dni: string }>;
  onLinked: (state: Extract<LinkState, { status: 'linked' }>) => void;
  onBack: () => void;
}): React.JSX.Element {
  const [state, action] = useActionState(async (previous: LinkState, formData: FormData) => {
    const next = await createLinkAction(previous, formData);

    if (next.status === 'linked') {
      onLinked(next);
    }

    return next;
  }, IDLE);
  const formState = state.status === 'linked' ? IDLE : state;
  const consentId = useId();
  const value = (field: string): string | undefined => submittedValue(formState, field, undefined);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="childId" value={childId} />
      <input type="hidden" name="guardianDni" value={lookup.dni} />
      <input type="hidden" name="isNewGuardian" value={String(lookup.status === 'new')} />

      {lookup.status === 'found' ? (
        <div className="rounded-(--radius-control) bg-celeste-50 px-4 py-3">
          <p className="font-semibold">{personName(lookup.guardian)}</p>
          <p className="text-sm text-muted">
            DNI {lookup.guardian.dni}
            {lookup.guardian.hasAccount ? '. Ya usa Carnet CRED: verá a este niño apenas guardes el vínculo.' : '. Ya está registrado.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">DNI {lookup.dni} no está registrado. Completa sus datos.</p>
          <FormField label="Nombres" name="givenNames" maxLength={120} defaultValue={value('givenNames')} error={fieldError(formState, 'givenNames')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Apellido paterno" name="paternalSurname" maxLength={80} defaultValue={value('paternalSurname')} error={fieldError(formState, 'paternalSurname')} />
            <FormField label="Apellido materno" name="maternalSurname" maxLength={80} defaultValue={value('maternalSurname')} error={fieldError(formState, 'maternalSurname')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Celular" name="phone" inputMode="numeric" maxLength={15} pattern="[0-9]{7,15}" required={false} defaultValue={value('phone')} error={fieldError(formState, 'phone')} />
            <FormField label="Correo" name="email" type="email" inputMode="email" required={false} defaultValue={value('email')} error={fieldError(formState, 'email')} />
          </div>
        </div>
      )}

      <SelectField
        label="Parentesco con el niño"
        name="relationship"
        options={RELATIONSHIPS.map((relationship) => ({ value: relationship, label: RELATIONSHIP_LABEL[relationship] }))}
        defaultValue={value('relationship')}
        error={fieldError(formState, 'relationship')}
      />

      <fieldset className="flex flex-col gap-3 rounded-(--radius-control) border border-line p-4">
        <legend className="px-1 text-sm font-semibold">Consentimiento: léelo en voz alta al apoderado</legend>
        {CONSENT_TEXT.map((paragraph) => (
          <p key={paragraph} className="text-sm leading-relaxed">
            {paragraph}
          </p>
        ))}
        <label htmlFor={consentId} className="flex items-start gap-2.5 rounded-(--radius-control) bg-celeste-50 p-3 text-sm font-semibold">
          <input id={consentId} type="checkbox" name="consentAccepted" required className="mt-0.5 size-4 accent-celeste-700" />
          El apoderado escuchó el texto y acepta
        </label>
      </fieldset>

      <FormMessage state={formState} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Vinculando">Vincular apoderado</SubmitButton>
        <button type="button" onClick={onBack} className={buttonClass('ghost')}>
          Cambiar DNI
        </button>
      </div>
    </form>
  );
}

export function LinkGuardian({ childId, childName, activationUrl }: LinkGuardianProps): React.JSX.Element {
  const [round, setRound] = useState(0);
  const [lookup, setLookup] = useState<Extract<LookupState, { dni: string }> | null>(null);
  const [linked, setLinked] = useState<Extract<LinkState, { status: 'linked' }> | null>(null);

  function restart(): void {
    setLookup(null);
    setLinked(null);
    setRound((current) => current + 1);
  }

  if (linked !== null) {
    return (
      <div className="flex flex-col gap-4">
        {linked.activationCode !== null && linked.codeExpiresAt !== null ? (
          <ActivationSlip
            code={linked.activationCode}
            expiresAt={linked.codeExpiresAt}
            childName={childName}
            guardianName={linked.guardianName}
            activationUrl={activationUrl}
          />
        ) : (
          <p className="flex items-center gap-2 rounded-(--radius-control) bg-ok/10 px-4 py-3 font-semibold text-ok">
            <CircleCheck aria-hidden="true" className="size-5" />
            {linked.guardianName} ya puede ver a {childName} desde su cuenta.
          </p>
        )}
        <div>
          <button type="button" onClick={restart} className={buttonClass('secondary')}>
            Vincular otro apoderado
          </button>
        </div>
      </div>
    );
  }

  return lookup === null ? (
    <LookupStep key={round} onFound={setLookup} />
  ) : (
    <DetailsStep key={`${round}-${lookup.dni}`} childId={childId} lookup={lookup} onLinked={setLinked} onBack={() => setLookup(null)} />
  );
}
