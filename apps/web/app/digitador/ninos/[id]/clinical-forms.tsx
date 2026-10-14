'use client';

import { type ClinicalRecordType, IRON_PRODUCTS, IRON_PURPOSES, MEASUREMENT_POSITIONS } from '@carnet/contracts';
import { PencilLine, Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { FormField, SelectField } from '@/components/form-field';
import { PanelForm, TextAreaField } from '@/components/panel-form';
import { fieldError, type FormState, submittedValue } from '@/lib/form-state';
import { daysBetween, describeScheduleAge, IRON_PRODUCT_LABEL, IRON_PURPOSE_LABEL, POSITION_LABEL, todayInLima } from '@/lib/labels';
import { buttonClass, INPUT_CLASS } from '@/lib/ui';
import { recordDoseAction, recordGrowthAction, recordHemoglobinAction, recordIronAction, requestCorrectionAction } from './clinical-actions';

type Defaults = Partial<Record<string, string>>;

export interface DoseContext {
  birthDate: string;
  recommendedAgeDays: number;
  maxAgeDays: number;
  lots: readonly string[];
}

function value(state: FormState, defaults: Defaults, field: string): string | undefined {
  return submittedValue(state, field, defaults[field]);
}

function DoseFields({ state, defaults, dose }: { state: FormState; defaults: Defaults; dose: DoseContext }): React.JSX.Element {
  const [administeredOn, setAdministeredOn] = useState(value(state, defaults, 'administeredOn') ?? todayInLima());
  const lotId = useId();
  const listId = useId();
  const ageDays = daysBetween(dose.birthDate, administeredOn);
  const outOfRange = Number.isFinite(ageDays) && (ageDays < dose.recommendedAgeDays || ageDays > dose.maxAgeDays);
  const lotError = fieldError(state, 'lot');

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${lotId}-date`} className="text-sm font-semibold">
          Fecha de aplicación
        </label>
        <input
          id={`${lotId}-date`}
          name="administeredOn"
          type="date"
          required
          min={dose.birthDate}
          max={todayInLima()}
          value={administeredOn}
          onChange={(event) => setAdministeredOn(event.target.value)}
          aria-invalid={fieldError(state, 'administeredOn') ? true : undefined}
          className={INPUT_CLASS}
        />
        {fieldError(state, 'administeredOn') ? <p className="text-sm text-danger">{fieldError(state, 'administeredOn')}</p> : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={lotId} className="text-sm font-semibold">
          Lote
        </label>
        <input
          id={lotId}
          name="lot"
          list={listId}
          required
          maxLength={40}
          autoComplete="off"
          autoCapitalize="characters"
          defaultValue={value(state, defaults, 'lot')}
          aria-invalid={lotError ? true : undefined}
          className={`${INPUT_CLASS} uppercase`}
        />
        <datalist id={listId}>
          {dose.lots.map((lot) => (
            <option key={lot} value={lot} />
          ))}
        </datalist>
        {dose.lots.length > 0 ? <p className="text-sm text-muted">Últimos lotes del establecimiento: {dose.lots.join(', ')}.</p> : null}
        {lotError ? <p className="text-sm text-danger">{lotError}</p> : null}
      </div>
      {outOfRange || fieldError(state, 'outOfRangeReason') !== undefined ? (
        <div className="flex flex-col gap-3 rounded-(--radius-control) border border-warn/40 bg-warn/5 p-4">
          <p className="text-sm">
            Con {describeScheduleAge(Math.max(ageDays, 0))} de edad esta dosis queda fuera del rango del esquema ({describeScheduleAge(dose.recommendedAgeDays)} a{' '}
            {describeScheduleAge(dose.maxAgeDays)}). Indica el motivo para registrarla.
          </p>
          <TextAreaField label="Motivo" name="outOfRangeReason" defaultValue={value(state, defaults, 'outOfRangeReason')} error={fieldError(state, 'outOfRangeReason')} />
        </div>
      ) : null}
    </>
  );
}

function GrowthFields({ state, defaults, birthDate }: { state: FormState; defaults: Defaults; birthDate: string }): React.JSX.Element {
  const confirmId = useId();
  const needsConfirmation = fieldError(state, 'confirmed');

  return (
    <>
      <FormField label="Fecha del control" name="measuredOn" type="date" min={birthDate} max={todayInLima()} defaultValue={value(state, defaults, 'measuredOn') ?? todayInLima()} error={fieldError(state, 'measuredOn')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Peso" name="weightKg" inputMode="decimal" pattern="[0-9]{1,2}(\.[0-9]{1,3})?" help="kg, por ejemplo 8.250" defaultValue={value(state, defaults, 'weightKg')} error={fieldError(state, 'weightKg')} />
        <FormField label="Talla" name="lengthCm" inputMode="decimal" pattern="[0-9]{2,3}(\.[0-9])?" help="cm, por ejemplo 72.5" defaultValue={value(state, defaults, 'lengthCm')} error={fieldError(state, 'lengthCm')} />
      </div>
      <SelectField
        label="Posición al medir"
        name="position"
        options={MEASUREMENT_POSITIONS.map((position) => ({ value: position, label: POSITION_LABEL[position] }))}
        defaultValue={value(state, defaults, 'position')}
        error={fieldError(state, 'position')}
      />
      <FormField
        label="Perímetro cefálico"
        name="headCircumferenceCm"
        inputMode="decimal"
        pattern="[0-9]{2}(\.[0-9])?"
        required={false}
        help="cm, opcional"
        defaultValue={value(state, defaults, 'headCircumferenceCm')}
        error={fieldError(state, 'headCircumferenceCm')}
      />
      {needsConfirmation === undefined ? null : (
        <div className="flex items-start gap-3 rounded-(--radius-control) border border-warn/40 bg-warn/5 p-4">
          <input id={confirmId} name="confirmed" type="checkbox" required className="mt-1 size-4 accent-celeste-700" />
          <label htmlFor={confirmId} className="text-sm">
            {needsConfirmation} Marca para confirmar que la medida es correcta.
          </label>
        </div>
      )}
    </>
  );
}

function HemoglobinFields({ state, defaults, birthDate }: { state: FormState; defaults: Defaults; birthDate: string }): React.JSX.Element {
  return (
    <>
      <FormField label="Fecha del dosaje" name="testedOn" type="date" min={birthDate} max={todayInLima()} defaultValue={value(state, defaults, 'testedOn') ?? todayInLima()} error={fieldError(state, 'testedOn')} />
      <FormField
        label="Hemoglobina observada"
        name="observed"
        inputMode="decimal"
        pattern="[0-9]{1,2}(\.[0-9])?"
        help="g/dL, tal como sale del hemoglobinómetro"
        defaultValue={value(state, defaults, 'observed')}
        error={fieldError(state, 'observed')}
      />
    </>
  );
}

function IronFields({ state, defaults, birthDate }: { state: FormState; defaults: Defaults; birthDate: string }): React.JSX.Element {
  return (
    <>
      <FormField label="Fecha de entrega" name="suppliedOn" type="date" min={birthDate} max={todayInLima()} defaultValue={value(state, defaults, 'suppliedOn') ?? todayInLima()} error={fieldError(state, 'suppliedOn')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Producto"
          name="product"
          options={IRON_PRODUCTS.map((product) => ({ value: product, label: IRON_PRODUCT_LABEL[product] }))}
          defaultValue={value(state, defaults, 'product')}
          error={fieldError(state, 'product')}
        />
        <SelectField
          label="Finalidad"
          name="purpose"
          options={IRON_PURPOSES.map((purpose) => ({ value: purpose, label: IRON_PURPOSE_LABEL[purpose] }))}
          defaultValue={value(state, defaults, 'purpose')}
          error={fieldError(state, 'purpose')}
        />
      </div>
      <FormField label="Indicación" name="doseInstructions" maxLength={200} help="Por ejemplo: 2 gotas por kg al día" defaultValue={value(state, defaults, 'doseInstructions')} error={fieldError(state, 'doseInstructions')} />
      <FormField label="Cantidad entregada" name="quantity" type="number" min={1} max={100} help="Frascos, sobres o tabletas" defaultValue={value(state, defaults, 'quantity') ?? '1'} error={fieldError(state, 'quantity')} />
    </>
  );
}

const RECORD_TRIGGER = buttonClass('primary', 'min-h-9 px-3 text-sm');
const ADD_TRIGGER = buttonClass('primary');

export function RecordDose({ childId, scheduledDoseId, title, dose }: { childId: string; scheduledDoseId: string; title: string; dose: DoseContext }): React.JSX.Element {
  return (
    <PanelForm
      trigger="Registrar"
      triggerClassName={RECORD_TRIGGER}
      title={title}
      description="Registra la fecha y el lote de la vacuna aplicada."
      action={recordDoseAction}
      hidden={{ childId, scheduledDoseId }}
      submitLabel="Registrar vacuna"
      pendingLabel="Registrando"
    >
      {(state) => <DoseFields state={state} defaults={{}} dose={dose} />}
    </PanelForm>
  );
}

interface RecordGrowthProps {
  childId: string;
  birthDate: string;
  measuredOn?: string;
  compact?: boolean;
  title?: string;
}

export function RecordGrowth({ childId, birthDate, measuredOn, compact = false, title = 'Control de crecimiento' }: RecordGrowthProps): React.JSX.Element {
  return (
    <PanelForm
      trigger={
        <>
          <Plus aria-hidden="true" className="size-4" />
          {compact ? 'Registrar' : 'Nuevo control'}
        </>
      }
      triggerClassName={compact ? RECORD_TRIGGER : ADD_TRIGGER}
      title={title}
      description="Los puntajes Z se calculan con los patrones de la OMS 2006 y la edad corregida si es prematuro."
      action={recordGrowthAction}
      hidden={{ childId }}
      submitLabel="Registrar control"
      pendingLabel="Registrando"
    >
      {(state) => <GrowthFields state={state} defaults={measuredOn === undefined ? {} : { measuredOn }} birthDate={birthDate} />}
    </PanelForm>
  );
}

export function RecordHemoglobin({ childId, birthDate, altitude }: { childId: string; birthDate: string; altitude: number }): React.JSX.Element {
  return (
    <PanelForm
      trigger={
        <>
          <Plus aria-hidden="true" className="size-4" />
          Nuevo dosaje
        </>
      }
      triggerClassName={ADD_TRIGGER}
      title="Dosaje de hemoglobina"
      description={`Se ajustará con la altitud del establecimiento elegido: ${altitude} m s. n. m.`}
      action={recordHemoglobinAction}
      hidden={{ childId }}
      submitLabel="Registrar dosaje"
      pendingLabel="Registrando"
    >
      {(state) => <HemoglobinFields state={state} defaults={{}} birthDate={birthDate} />}
    </PanelForm>
  );
}

export function RecordIron({ childId, birthDate }: { childId: string; birthDate: string }): React.JSX.Element {
  return (
    <PanelForm
      trigger={
        <>
          <Plus aria-hidden="true" className="size-4" />
          Nueva entrega
        </>
      }
      triggerClassName={buttonClass('secondary')}
      title="Entrega de hierro"
      action={recordIronAction}
      hidden={{ childId }}
      submitLabel="Registrar entrega"
      pendingLabel="Registrando"
    >
      {(state) => <IronFields state={state} defaults={{}} birthDate={birthDate} />}
    </PanelForm>
  );
}

interface CorrectRecordProps {
  childId: string;
  recordType: ClinicalRecordType;
  recordId: string;
  birthDate: string;
  canCorrectDirectly: boolean;
  defaults: Defaults;
  dose?: DoseContext;
}

function CorrectionFields({ state, recordType, defaults, birthDate, dose }: { state: FormState } & Omit<CorrectRecordProps, 'childId' | 'recordId' | 'canCorrectDirectly'>): React.JSX.Element {
  if (recordType === 'DOSE' && dose !== undefined) {
    return <DoseFields state={state} defaults={defaults} dose={dose} />;
  }

  if (recordType === 'GROWTH_CHECK') {
    return <GrowthFields state={state} defaults={defaults} birthDate={birthDate} />;
  }

  if (recordType === 'HEMOGLOBIN_TEST') {
    return <HemoglobinFields state={state} defaults={defaults} birthDate={birthDate} />;
  }

  return <IronFields state={state} defaults={defaults} birthDate={birthDate} />;
}

export function CorrectRecord({ childId, recordType, recordId, canCorrectDirectly, ...fields }: CorrectRecordProps): React.JSX.Element {
  return (
    <PanelForm
      trigger={
        <>
          <PencilLine aria-hidden="true" className="size-4" />
          Corregir
        </>
      }
      triggerClassName={buttonClass('ghost', 'min-h-9 px-3 text-sm')}
      title="Corregir registro"
      description={
        canCorrectDirectly
          ? 'Lo registraste hace menos de 72 horas: la corrección se aplica de inmediato y la versión anterior queda en el historial.'
          : 'La corrección quedará pendiente hasta que el administrador la apruebe.'
      }
      action={requestCorrectionAction}
      hidden={{ childId, recordId, recordType }}
      submitLabel={canCorrectDirectly ? 'Aplicar corrección' : 'Enviar para aprobación'}
      pendingLabel="Enviando"
      closeOnSuccess={false}
    >
      {(state) => (
        <>
          <CorrectionFields state={state} recordType={recordType} {...fields} />
          <TextAreaField label="Motivo de la corrección" name="reason" help="Queda registrado en la auditoría." defaultValue={submittedValue(state, 'reason', undefined)} error={fieldError(state, 'reason')} />
        </>
      )}
    </PanelForm>
  );
}
