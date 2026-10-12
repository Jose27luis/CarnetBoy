import { ApiProperty } from '@nestjs/swagger';
import {
  type Achievement,
  ANEMIA_CLASSES,
  type AnemiaClass,
  APPOINTMENT_TYPES,
  type AppointmentType,
  type CarnetAppointment,
  type CarnetDose,
  type CarnetGrowthCheck,
  type CarnetHemoglobinTest,
  type CarnetIronSupply,
  DOSE_STATUSES,
  type DoseStatus,
  type GrowthBands,
  type GuardianCarnet,
  type GuardianChildCard,
  IRON_PRODUCTS,
  IRON_PURPOSES,
  type IronProduct,
  type IronPurpose,
  MEASUREMENT_POSITIONS,
  type MeasurementPosition,
  type NextStep,
  SEXES,
  type Sex,
} from '@carnet/contracts';

export class GuardianChildCardDto implements GuardianChildCard {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  givenNames!: string;

  @ApiProperty()
  paternalSurname!: string;

  @ApiProperty()
  maternalSurname!: string;

  @ApiProperty({ enum: SEXES })
  sex!: Sex;

  @ApiProperty({ format: 'date' })
  birthDate!: string;

  @ApiProperty()
  dosesApplied!: number;

  @ApiProperty({ description: 'Dosis que ya le tocan y aún puede recibir' })
  dosesDue!: number;

  @ApiProperty({ description: 'Dosis cuya edad máxima ya pasó' })
  dosesOverdue!: number;
}

class CarnetChildDto extends GuardianChildCardDto {
  @ApiProperty({ type: Number, nullable: true })
  gestationalWeeks!: number | null;
}

class CarnetDoseDto implements CarnetDose {
  @ApiProperty({ format: 'uuid' })
  scheduledDoseId!: string;

  @ApiProperty()
  vaccineName!: string;

  @ApiProperty()
  prevents!: string;

  @ApiProperty()
  doseNumber!: number;

  @ApiProperty()
  recommendedAgeDays!: number;

  @ApiProperty({ format: 'date' })
  recommendedDate!: string;

  @ApiProperty()
  maxAgeDays!: number;

  @ApiProperty({ enum: DOSE_STATUSES })
  status!: DoseStatus;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  appliedOn!: string | null;

  @ApiProperty({ type: String, nullable: true })
  facilityName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  lot!: string | null;
}

class CarnetGrowthCheckDto implements CarnetGrowthCheck {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date' })
  measuredOn!: string;

  @ApiProperty()
  ageDays!: number;

  @ApiProperty()
  correctedAgeDays!: number;

  @ApiProperty()
  weightKg!: string;

  @ApiProperty()
  lengthCm!: string;

  @ApiProperty({ enum: MEASUREMENT_POSITIONS })
  position!: MeasurementPosition;

  @ApiProperty({ type: String, nullable: true })
  headCircumferenceCm!: string | null;

  @ApiProperty({ type: String, nullable: true })
  zWeightForAge!: string | null;

  @ApiProperty({ type: String, nullable: true })
  zLengthForAge!: string | null;

  @ApiProperty({ type: String, nullable: true })
  zWeightForLength!: string | null;

  @ApiProperty({ type: String, nullable: true })
  zHeadForAge!: string | null;

  @ApiProperty({ type: String, nullable: true })
  weightForAge!: string | null;

  @ApiProperty({ type: String, nullable: true })
  lengthForAge!: string | null;

  @ApiProperty({ type: String, nullable: true })
  weightForLength!: string | null;

  @ApiProperty({ type: String, nullable: true })
  headForAge!: string | null;

  @ApiProperty()
  facilityName!: string;
}

class CarnetHemoglobinTestDto implements CarnetHemoglobinTest {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date' })
  testedOn!: string;

  @ApiProperty()
  ageMonths!: number;

  @ApiProperty()
  observed!: string;

  @ApiProperty()
  adjusted!: string;

  @ApiProperty()
  altitudeMeters!: number;

  @ApiProperty({ enum: ANEMIA_CLASSES })
  classification!: AnemiaClass;

  @ApiProperty()
  facilityName!: string;
}

class CarnetIronSupplyDto implements CarnetIronSupply {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date' })
  suppliedOn!: string;

  @ApiProperty({ enum: IRON_PRODUCTS })
  product!: IronProduct;

  @ApiProperty()
  doseInstructions!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty({ enum: IRON_PURPOSES })
  purpose!: IronPurpose;

  @ApiProperty()
  facilityName!: string;
}

class CarnetAppointmentDto implements CarnetAppointment {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: APPOINTMENT_TYPES })
  type!: AppointmentType;

  @ApiProperty({ format: 'date' })
  scheduledOn!: string;

  @ApiProperty()
  facilityName!: string;

  @ApiProperty({ type: String, nullable: true })
  note!: string | null;
}

class AchievementDto implements Achievement {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ format: 'date' })
  achievedOn!: string;
}

export class GuardianCarnetDto implements GuardianCarnet {
  @ApiProperty({ type: CarnetChildDto })
  child!: CarnetChildDto;

  @ApiProperty({ type: String, nullable: true })
  scheduleNorm!: string | null;

  @ApiProperty({ type: [CarnetDoseDto] })
  doses!: CarnetDoseDto[];

  @ApiProperty({ type: [CarnetGrowthCheckDto] })
  growth!: CarnetGrowthCheckDto[];

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Bandas de la OMS por indicador: x en días y valores para z -3, -2, 0, 2 y 3',
  })
  growthBands!: GrowthBands;

  @ApiProperty({ type: [CarnetHemoglobinTestDto] })
  hemoglobin!: CarnetHemoglobinTestDto[];

  @ApiProperty({ type: [CarnetIronSupplyDto] })
  iron!: CarnetIronSupplyDto[];

  @ApiProperty({ type: [CarnetAppointmentDto] })
  appointments!: CarnetAppointmentDto[];

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'kind: OVERDUE_VACCINES (vaccines), APPOINTMENT (appointment), VACCINE (vaccineName, doseNumber, recommendedDate) o NONE',
  })
  nextStep!: NextStep;

  @ApiProperty({ type: [AchievementDto] })
  achievements!: AchievementDto[];
}
