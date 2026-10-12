import { Injectable } from '@nestjs/common';
import { daysBetween, growthBands, parseCalendarDate } from '@carnet/clinical';
import type {
  CarnetAppointment,
  CarnetDose,
  CarnetGrowthCheck,
  CarnetHemoglobinTest,
  CarnetIronSupply,
  GrowthBands,
  GuardianCarnet,
  GuardianChildCard,
  ImmunizationStatus,
  NextStep,
  Sex,
} from '@carnet/contracts';
import { todayInLima } from '../../common/clinical/record-meta';
import { HemoglobinService } from '../anemia/hemoglobin.service';
import { IronService } from '../anemia/iron.service';
import { GuardianChildrenService, type LinkedChild } from '../children/guardian-children.service';
import { GrowthService } from '../growth/growth.service';
import { ImmunizationService } from '../immunization/immunization.service';
import { ScheduleService } from '../schedule/schedule.service';
import { achievementsFor } from './achievements';

function toDoses(status: ImmunizationStatus): CarnetDose[] {
  return status.doses.map((dose) => ({
    scheduledDoseId: dose.scheduledDoseId,
    vaccineName: dose.vaccineName,
    prevents: dose.prevents,
    doseNumber: dose.doseNumber,
    recommendedAgeDays: dose.recommendedAgeDays,
    recommendedDate: dose.recommendedDate,
    maxAgeDays: dose.maxAgeDays,
    status: dose.status,
    appliedOn: dose.applied?.administeredOn ?? null,
    facilityName: dose.applied?.facilityName ?? null,
    lot: dose.applied?.lot ?? null,
  }));
}

function toCard(child: LinkedChild, doses: readonly CarnetDose[]): GuardianChildCard {
  return {
    id: child.id,
    givenNames: child.givenNames,
    paternalSurname: child.paternalSurname,
    maternalSurname: child.maternalSurname,
    sex: child.sex,
    birthDate: child.birthDate,
    dosesApplied: doses.filter((dose) => dose.status === 'APPLIED').length,
    dosesDue: doses.filter((dose) => dose.status === 'DUE').length,
    dosesOverdue: doses.filter((dose) => dose.status === 'OVERDUE').length,
  };
}

const BANDS_MIN_DAYS = 365;
const BANDS_MAX_DAYS = 1856;
const BANDS_MARGIN_DAYS = 90;

export function bandsFor(sex: Sex, birthDate: string, now: Date): GrowthBands {
  const ageDays = daysBetween(parseCalendarDate(birthDate), todayInLima(now));
  const to = Math.min(BANDS_MAX_DAYS, Math.max(BANDS_MIN_DAYS, ageDays + BANDS_MARGIN_DAYS));
  const step = to <= 730 ? 7 : 14;

  return {
    weightForAge: growthBands('WEIGHT_FOR_AGE', sex, 0, to, step),
    lengthForAge: growthBands('LENGTH_FOR_AGE', sex, 0, to, step),
    headForAge: growthBands('HEAD_FOR_AGE', sex, 0, to, step),
  };
}

function byRecommendedDate(first: CarnetDose, second: CarnetDose): number {
  return first.recommendedDate.localeCompare(second.recommendedDate);
}

export function nextStepFor(doses: readonly CarnetDose[], appointments: readonly CarnetAppointment[]): NextStep {
  const due = doses.filter((dose) => dose.status === 'DUE').sort(byRecommendedDate)[0];
  const appointment = appointments[0];

  if (due !== undefined && !appointments.some((item) => item.type === 'VACCINATION')) {
    return { kind: 'VACCINE', vaccineName: due.vaccineName, doseNumber: due.doseNumber, recommendedDate: due.recommendedDate };
  }

  if (appointment !== undefined) {
    return { kind: 'APPOINTMENT', appointment };
  }

  const overdue = doses.filter((dose) => dose.status === 'OVERDUE');

  if (overdue.length > 0) {
    return { kind: 'OVERDUE_VACCINES', vaccines: [...new Set(overdue.map((dose) => dose.vaccineName))] };
  }

  const future = doses.filter((dose) => dose.status === 'FUTURE').sort(byRecommendedDate)[0];

  return future === undefined
    ? { kind: 'NONE' }
    : { kind: 'VACCINE', vaccineName: future.vaccineName, doseNumber: future.doseNumber, recommendedDate: future.recommendedDate };
}

@Injectable()
export class CarnetService {
  constructor(
    private readonly guardianChildren: GuardianChildrenService,
    private readonly immunization: ImmunizationService,
    private readonly growth: GrowthService,
    private readonly hemoglobin: HemoglobinService,
    private readonly iron: IronService,
    private readonly schedule: ScheduleService,
  ) {}

  async cards(accountId: string, now: Date = new Date()): Promise<GuardianChildCard[]> {
    const children = await this.guardianChildren.linkedChildren(accountId);

    return Promise.all(
      children.map(async (child) => toCard(child, toDoses(await this.immunization.status(accountId, null, child.id, now)))),
    );
  }

  async carnet(accountId: string, childId: string, now: Date = new Date()): Promise<GuardianCarnet> {
    const child = await this.guardianChildren.linkedChild(accountId, childId);
    const [status, checks, tests, supplies, upcoming] = await Promise.all([
      this.immunization.status(accountId, null, childId, now),
      this.growth.list(accountId, childId, now),
      this.hemoglobin.list(accountId, childId, now),
      this.iron.list(accountId, childId, now),
      this.schedule.upcoming(childId),
    ]);
    const doses = toDoses(status);
    const growth: CarnetGrowthCheck[] = checks.map((check) => ({
      id: check.id,
      measuredOn: check.measuredOn,
      ageDays: check.ageDays,
      correctedAgeDays: check.correctedAgeDays,
      weightKg: check.weightKg,
      lengthCm: check.lengthCm,
      position: check.position,
      headCircumferenceCm: check.headCircumferenceCm,
      zWeightForAge: check.zWeightForAge,
      zLengthForAge: check.zLengthForAge,
      zWeightForLength: check.zWeightForLength,
      zHeadForAge: check.zHeadForAge,
      weightForAge: check.weightForAge,
      lengthForAge: check.lengthForAge,
      weightForLength: check.weightForLength,
      headForAge: check.headForAge,
      facilityName: check.facilityName,
    }));
    const hemoglobin: CarnetHemoglobinTest[] = tests.map((test) => ({
      id: test.id,
      testedOn: test.testedOn,
      ageMonths: test.ageMonths,
      observed: test.observed,
      adjusted: test.adjusted,
      altitudeMeters: test.altitudeMeters,
      classification: test.classification,
      facilityName: test.facilityName,
    }));
    const iron: CarnetIronSupply[] = supplies.map((supply) => ({
      id: supply.id,
      suppliedOn: supply.suppliedOn,
      product: supply.product,
      doseInstructions: supply.doseInstructions,
      quantity: supply.quantity,
      purpose: supply.purpose,
      facilityName: supply.facilityName,
    }));
    const appointments: CarnetAppointment[] = upcoming.map((appointment) => ({
      id: appointment.id,
      type: appointment.type,
      scheduledOn: appointment.scheduledOn,
      facilityName: appointment.facilityName,
      note: appointment.note,
    }));

    return {
      child: { ...toCard(child, doses), gestationalWeeks: child.gestationalWeeks },
      scheduleNorm: status.schedule?.norm ?? null,
      doses,
      growth,
      growthBands: bandsFor(child.sex, child.birthDate, now),
      hemoglobin,
      iron,
      appointments,
      nextStep: nextStepFor(doses, appointments),
      achievements: achievementsFor(doses, growth, hemoglobin),
    };
  }
}
