'use client';

import { APPOINTMENT_TYPES, type Appointment, type AppointmentProposal } from '@carnet/contracts';
import { CalendarClock, CalendarPlus, X } from 'lucide-react';
import { ActionForm } from '@/components/action-form';
import { FormField, SelectField } from '@/components/form-field';
import { PanelForm, TextAreaField } from '@/components/panel-form';
import { fieldError, submittedValue } from '@/lib/form-state';
import { APPOINTMENT_TYPE_LABEL, formatCalendarDate, todayInLima } from '@/lib/labels';
import { buttonClass } from '@/lib/ui';
import { closeAppointmentAction, rescheduleAppointmentAction, scheduleAppointmentAction } from './schedule-actions';

const TYPE_OPTIONS = APPOINTMENT_TYPES.map((type) => ({ value: type, label: APPOINTMENT_TYPE_LABEL[type] }));
const SMALL = 'min-h-9 px-3 text-sm';

export function ScheduleAppointment({ childId, proposal }: { childId: string; proposal?: AppointmentProposal }): React.JSX.Element {
  return (
    <PanelForm
      trigger={
        <>
          <CalendarPlus aria-hidden="true" className="size-4" />
          {proposal === undefined ? 'Nueva cita' : 'Programar'}
        </>
      }
      triggerClassName={buttonClass(proposal === undefined ? 'primary' : 'secondary', proposal === undefined ? '' : SMALL)}
      title={proposal === undefined ? 'Nueva cita' : `Programar ${APPOINTMENT_TYPE_LABEL[proposal.type].toLowerCase()}`}
      description={proposal === undefined ? 'La cita queda en el establecimiento donde estás trabajando.' : `Fecha sugerida: ${proposal.basis}.`}
      action={scheduleAppointmentAction}
      hidden={{ childId, suggestedOn: proposal?.suggestedOn ?? '' }}
      submitLabel="Programar cita"
      pendingLabel="Programando"
    >
      {(state) => (
        <>
          <SelectField label="Tipo de cita" name="type" options={TYPE_OPTIONS} defaultValue={submittedValue(state, 'type', proposal?.type)} error={fieldError(state, 'type')} />
          <FormField
            label="Fecha"
            name="scheduledOn"
            type="date"
            min={todayInLima()}
            defaultValue={submittedValue(state, 'scheduledOn', proposal?.suggestedOn)}
            error={fieldError(state, 'scheduledOn')}
          />
          <TextAreaField label="Indicación para la familia" name="note" required={false} maxLength={200} help="Opcional. Por ejemplo: traer el carnet físico." defaultValue={submittedValue(state, 'note', undefined)} error={fieldError(state, 'note')} />
        </>
      )}
    </PanelForm>
  );
}

export function AppointmentActions({ appointment }: { appointment: Appointment }): React.JSX.Element {
  const reference = { appointmentId: appointment.id, expectedVersion: appointment.version };

  return (
    <div className="flex flex-wrap items-start gap-2">
      <ActionForm
        action={closeAppointmentAction}
        label="Atendida"
        pendingLabel="Guardando"
        variant="primary"
        fields={{ ...reference, status: 'ATTENDED' }}
      />
      <ActionForm
        action={closeAppointmentAction}
        label="No asistió"
        pendingLabel="Guardando"
        confirm={`¿Marcar que ${appointment.childName} no asistió a la cita?`}
        fields={{ ...reference, status: 'MISSED' }}
      />
      <PanelForm
        trigger={
          <>
            <CalendarClock aria-hidden="true" className="size-4" />
            Reprogramar
          </>
        }
        triggerClassName={buttonClass('ghost', SMALL)}
        title="Reprogramar cita"
        description={`${APPOINTMENT_TYPE_LABEL[appointment.type]} de ${appointment.childName}, programada para el ${formatCalendarDate(appointment.scheduledOn)}.`}
        action={rescheduleAppointmentAction}
        hidden={{ appointmentId: appointment.id, expectedVersion: String(appointment.version) }}
        submitLabel="Guardar nueva fecha"
        pendingLabel="Guardando"
      >
        {(state) => (
          <FormField
            label="Nueva fecha"
            name="scheduledOn"
            type="date"
            min={todayInLima()}
            defaultValue={submittedValue(state, 'scheduledOn', appointment.scheduledOn)}
            error={fieldError(state, 'scheduledOn')}
          />
        )}
      </PanelForm>
      <PanelForm
        trigger={
          <>
            <X aria-hidden="true" className="size-4" />
            Cancelar
          </>
        }
        triggerClassName={buttonClass('ghost', SMALL)}
        title="Cancelar cita"
        description={`${APPOINTMENT_TYPE_LABEL[appointment.type]} de ${appointment.childName}, el ${formatCalendarDate(appointment.scheduledOn)}.`}
        action={closeAppointmentAction}
        hidden={{ appointmentId: appointment.id, expectedVersion: String(appointment.version), status: 'CANCELLED' }}
        submitLabel="Cancelar cita"
        pendingLabel="Cancelando"
        submitVariant="danger"
      >
        {(state) => <TextAreaField label="Motivo" name="reason" maxLength={200} defaultValue={submittedValue(state, 'reason', undefined)} error={fieldError(state, 'reason')} />}
      </PanelForm>
    </div>
  );
}
