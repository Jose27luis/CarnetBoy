'use client';

import { APPOINTMENT_TYPES, MAX_AGE_DAYS, MAX_AGE_MONTHS, type Vaccine } from '@carnet/contracts';
import { useActionState } from 'react';
import { FormField, SelectField } from '@/components/form-field';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { fieldError, type FormState, IDLE } from '@/lib/form-state';
import { APPOINTMENT_TYPE_LABEL } from '@/lib/labels';
import { addDoseAction, addIntervalAction, addThresholdAction, publishAction, updateNormAction } from '../actions';

export interface VersionRef {
  slug: string;
  versionId: string;
  expectedVersion: number;
}

function VersionFields({ reference }: { reference: VersionRef }): React.JSX.Element {
  return (
    <>
      <input type="hidden" name="slug" value={reference.slug} />
      <input type="hidden" name="versionId" value={reference.versionId} />
      <input type="hidden" name="expectedVersion" value={reference.expectedVersion} />
    </>
  );
}

function EntryForm({
  reference,
  action,
  submitLabel,
  children,
}: {
  reference: VersionRef;
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  children: (state: FormState) => React.ReactNode;
}): React.JSX.Element {
  const [state, formAction] = useActionState(action, IDLE);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <VersionFields reference={reference} />
      {children(state)}
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Guardando">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

const MONTH_FIELDS = (state: FormState): React.JSX.Element => (
  <>
    <FormField
      label="Desde (meses)"
      name="minAgeMonths"
      type="number"
      inputMode="numeric"
      min={0}
      max={MAX_AGE_MONTHS}
      error={fieldError(state, 'minAgeMonths')}
    />
    <FormField
      label="Hasta (meses)"
      name="maxAgeMonths"
      type="number"
      inputMode="numeric"
      min={0}
      max={MAX_AGE_MONTHS}
      help="Inclusive."
      error={fieldError(state, 'maxAgeMonths')}
    />
  </>
);

export function DoseForm({ reference, vaccines }: { reference: VersionRef; vaccines: Vaccine[] }): React.JSX.Element {
  return (
    <EntryForm reference={reference} action={addDoseAction} submitLabel="Agregar dosis">
      {(state) => (
        <div className="grid gap-4 md:grid-cols-4">
          <SelectField
            label="Vacuna"
            name="vaccineId"
            options={vaccines.map((vaccine) => ({ value: vaccine.id, label: vaccine.name }))}
            error={fieldError(state, 'vaccineId')}
          />
          <FormField label="N.° de dosis" name="doseNumber" type="number" inputMode="numeric" min={1} max={10} error={fieldError(state, 'doseNumber')} />
          <FormField
            label="Edad recomendada (días)"
            name="recommendedAgeDays"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_AGE_DAYS}
            help="0 para el recién nacido."
            error={fieldError(state, 'recommendedAgeDays')}
          />
          <FormField
            label="Edad máxima (días)"
            name="maxAgeDays"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_AGE_DAYS}
            help="Después de esta edad la dosis figura como vencida."
            error={fieldError(state, 'maxAgeDays')}
          />
        </div>
      )}
    </EntryForm>
  );
}

export function ThresholdForm({ reference }: { reference: VersionRef }): React.JSX.Element {
  return (
    <EntryForm reference={reference} action={addThresholdAction} submitLabel="Agregar umbral">
      {(state) => (
        <div className="grid gap-4 md:grid-cols-5">
          {MONTH_FIELDS(state)}
          <FormField
            label="Sin anemia desde"
            name="normalFrom"
            inputMode="decimal"
            pattern="[0-9]{1,2}\.[0-9]"
            help="g/dL, por ejemplo 11.0"
            error={fieldError(state, 'normalFrom')}
          />
          <FormField
            label="Leve desde"
            name="mildFrom"
            inputMode="decimal"
            pattern="[0-9]{1,2}\.[0-9]"
            help="g/dL"
            error={fieldError(state, 'mildFrom')}
          />
          <FormField
            label="Moderada desde"
            name="moderateFrom"
            inputMode="decimal"
            pattern="[0-9]{1,2}\.[0-9]"
            help="g/dL. Por debajo es severa."
            error={fieldError(state, 'moderateFrom')}
          />
        </div>
      )}
    </EntryForm>
  );
}

export function IntervalForm({ reference }: { reference: VersionRef }): React.JSX.Element {
  return (
    <EntryForm reference={reference} action={addIntervalAction} submitLabel="Agregar intervalo">
      {(state) => (
        <div className="grid gap-4 md:grid-cols-4">
          <SelectField
            label="Tipo de cita"
            name="appointmentType"
            options={APPOINTMENT_TYPES.map((type) => ({ value: type, label: APPOINTMENT_TYPE_LABEL[type] }))}
            error={fieldError(state, 'appointmentType')}
          />
          {MONTH_FIELDS(state)}
          <FormField
            label="Días hasta la siguiente cita"
            name="intervalDays"
            type="number"
            inputMode="numeric"
            min={1}
            max={366}
            error={fieldError(state, 'intervalDays')}
          />
        </div>
      )}
    </EntryForm>
  );
}

export function NormForm({ reference, norm }: { reference: VersionRef; norm: string }): React.JSX.Element {
  return (
    <EntryForm reference={reference} action={updateNormAction} submitLabel="Guardar norma">
      {(state) => <FormField label="Norma técnica de origen" name="norm" maxLength={240} defaultValue={norm} error={fieldError(state, 'norm')} />}
    </EntryForm>
  );
}

export function PublishForm({ reference, minimumDate }: { reference: VersionRef; minimumDate: string | null }): React.JSX.Element {
  const [state, formAction] = useActionState(publishAction, IDLE);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm('Una versión publicada ya no se puede editar. ¿Publicar ahora?')) {
          event.preventDefault();
        }
      }}
      className="flex flex-col gap-4"
    >
      <VersionFields reference={reference} />
      <div className="max-w-xs">
        <FormField
          label="Rige desde"
          name="validFrom"
          type="date"
          help={minimumDate === null ? 'Fecha desde la que se aplica.' : `Debe ser posterior al ${minimumDate}, inicio de la versión vigente.`}
          error={fieldError(state, 'validFrom')}
        />
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Publicando">Publicar versión</SubmitButton>
      </div>
    </form>
  );
}
