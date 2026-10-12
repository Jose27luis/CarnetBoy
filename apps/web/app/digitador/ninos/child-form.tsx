'use client';

import { BLOOD_TYPES, type ChildRecord, DELIVERY_TYPES, SEXES } from '@carnet/contracts';
import { useActionState, useState } from 'react';
import { FormField, SelectField } from '@/components/form-field';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { fieldError, IDLE, submittedValue } from '@/lib/form-state';
import { DELIVERY_TYPE_LABEL, SEX_LABEL } from '@/lib/labels';
import { PANEL_CLASS } from '@/lib/ui';
import { registerChildAction, updateChildAction } from './actions';

interface ChildFormProps {
  child?: ChildRecord;
  initialDocument?: string;
}

function initialFor(child: ChildRecord | undefined, initialDocument: string | undefined): Record<string, string | undefined> {
  if (child === undefined) {
    const document = initialDocument ?? '';

    return document.length === 8 ? { dni: document } : document.length > 8 ? { cnv: document } : {};
  }

  return {
    dni: child.dni ?? undefined,
    cnv: child.cnv ?? undefined,
    givenNames: child.givenNames,
    paternalSurname: child.paternalSurname,
    maternalSurname: child.maternalSurname,
    sex: child.sex,
    birthDate: child.birthDate,
    gestationalWeeks: child.gestationalWeeks?.toString(),
    bloodType: child.bloodType ?? undefined,
    birthPlace: child.birth?.birthPlace ?? undefined,
    deliveryType: child.birth?.deliveryType ?? undefined,
    weightGrams: child.birth?.weightGrams?.toString(),
    lengthCm: child.birth?.lengthCm ?? undefined,
    headCircumferenceCm: child.birth?.headCircumferenceCm ?? undefined,
    apgar1: child.birth?.apgar1?.toString(),
    apgar5: child.birth?.apgar5?.toString(),
  };
}

export function ChildForm({ child, initialDocument }: ChildFormProps): React.JSX.Element {
  const [state, action] = useActionState(child === undefined ? registerChildAction : updateChildAction, IDLE);
  const [idempotencyKey] = useState(() => crypto.randomUUID().replaceAll('-', ''));
  const initial = initialFor(child, initialDocument);
  const value = (field: string): string | undefined => submittedValue(state, field, initial[field]);
  const error = (field: string): string | undefined => fieldError(state, field);

  return (
    <form action={action} className="flex flex-col gap-6">
      {child === undefined ? (
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      ) : (
        <>
          <input type="hidden" name="childId" value={child.id} />
          <input type="hidden" name="expectedVersion" value={child.version} />
        </>
      )}

      <section aria-labelledby="identity" className={`${PANEL_CLASS} flex flex-col gap-4 p-5 sm:p-6`}>
        <div>
          <h2 id="identity" className="text-lg font-semibold">
            Identificación
          </h2>
          <p className="text-sm text-muted">Registra el DNI o, si aún no lo tiene, el CNV. Cuando obtenga el DNI podrás agregarlo sin perder su historial.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="DNI" name="dni" inputMode="numeric" maxLength={8} pattern="[0-9]{8}" required={false} defaultValue={value('dni')} error={error('dni')} />
          <FormField
            label="CNV (certificado de nacido vivo)"
            name="cnv"
            inputMode="numeric"
            maxLength={12}
            pattern="[0-9]{8,12}"
            required={false}
            help="Número del certificado que se entrega al nacer, solo dígitos (8 a 12). Úsalo si el niño aún no tiene DNI."
            defaultValue={value('cnv')}
            error={error('cnv')}
          />
        </div>
        <FormField label="Nombres" name="givenNames" maxLength={120} defaultValue={value('givenNames')} error={error('givenNames')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Apellido paterno" name="paternalSurname" maxLength={80} defaultValue={value('paternalSurname')} error={error('paternalSurname')} />
          <FormField label="Apellido materno" name="maternalSurname" maxLength={80} defaultValue={value('maternalSurname')} error={error('maternalSurname')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <SelectField
            label="Sexo"
            name="sex"
            options={SEXES.map((sex) => ({ value: sex, label: SEX_LABEL[sex] }))}
            defaultValue={value('sex')}
            error={error('sex')}
          />
          <FormField label="Fecha de nacimiento" name="birthDate" type="date" defaultValue={value('birthDate')} error={error('birthDate')} />
          <FormField
            label="Semanas de gestación al nacer"
            name="gestationalWeeks"
            type="number"
            inputMode="numeric"
            min={22}
            max={44}
            required={false}
            help="Semanas de embarazo cuando nació, entre 22 y 44 (a término: 37 a 41). Déjalo vacío si no lo sabes."
            defaultValue={value('gestationalWeeks')}
            error={error('gestationalWeeks')}
          />
          <SelectField
            label="Grupo sanguíneo"
            name="bloodType"
            required={false}
            options={BLOOD_TYPES.map((bloodType) => ({ value: bloodType, label: bloodType }))}
            defaultValue={value('bloodType')}
            error={error('bloodType')}
          />
        </div>
      </section>

      <section aria-labelledby="birth" className={`${PANEL_CLASS} flex flex-col gap-4 p-5 sm:p-6`}>
        <div>
          <h2 id="birth" className="text-lg font-semibold">
            Datos de nacimiento
          </h2>
          <p className="text-sm text-muted">Opcional. Cópialos del carné o del CNV si están disponibles.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Lugar de nacimiento" name="birthPlace" maxLength={160} required={false} defaultValue={value('birthPlace')} error={error('birthPlace')} />
          <SelectField
            label="Tipo de parto"
            name="deliveryType"
            required={false}
            options={DELIVERY_TYPES.map((deliveryType) => ({ value: deliveryType, label: DELIVERY_TYPE_LABEL[deliveryType] }))}
            defaultValue={value('deliveryType')}
            error={error('deliveryType')}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-5">
          <FormField label="Peso (g)" name="weightGrams" type="number" inputMode="numeric" min={300} max={6500} required={false} defaultValue={value('weightGrams')} error={error('weightGrams')} />
          <FormField label="Talla (cm)" name="lengthCm" inputMode="decimal" pattern="[0-9]{2}(\.[0-9])?" required={false} defaultValue={value('lengthCm')} error={error('lengthCm')} />
          <FormField
            label="Perímetro cefálico (cm)"
            name="headCircumferenceCm"
            inputMode="decimal"
            pattern="[0-9]{2}(\.[0-9])?"
            required={false}
            defaultValue={value('headCircumferenceCm')}
            error={error('headCircumferenceCm')}
          />
          <FormField label="APGAR 1 min" name="apgar1" type="number" inputMode="numeric" min={0} max={10} required={false} defaultValue={value('apgar1')} error={error('apgar1')} />
          <FormField label="APGAR 5 min" name="apgar5" type="number" inputMode="numeric" min={0} max={10} required={false} defaultValue={value('apgar5')} error={error('apgar5')} />
        </div>
      </section>

      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Guardando">{child === undefined ? 'Registrar niño' : 'Guardar cambios'}</SubmitButton>
      </div>
    </form>
  );
}
