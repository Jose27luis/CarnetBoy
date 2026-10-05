import { ApiProperty } from '@nestjs/swagger';
import {
  ANEMIA_CLASSES,
  type AnemiaClass,
  type AnemiaOverview,
  type HemoglobinTestRecord,
  IRON_PRODUCTS,
  IRON_PURPOSES,
  type IronProduct,
  type IronPurpose,
  type IronSupplyRecord,
} from '@carnet/contracts';
import { IsIn, IsInt, IsString, Length, Matches, Max, Min } from 'class-validator';
import { CALENDAR_DATE_MESSAGE, CALENDAR_DATE_PATTERN, RecordMetaDto } from '../../common/clinical/record-meta.dto';

export class RecordHemoglobinTestDto {
  @ApiProperty({ example: '2026-06-15' })
  @Matches(CALENDAR_DATE_PATTERN, { message: CALENDAR_DATE_MESSAGE })
  testedOn!: string;

  @ApiProperty({ example: '11.2', description: 'Hemoglobina observada en g/dL, con un decimal' })
  @Matches(/^\d{1,2}(\.\d)?$/, { message: 'Usa g/dL con un decimal, por ejemplo 11.2.' })
  observed!: string;
}

export class RecordIronSupplyDto {
  @ApiProperty({ example: '2026-06-15' })
  @Matches(CALENDAR_DATE_PATTERN, { message: CALENDAR_DATE_MESSAGE })
  suppliedOn!: string;

  @ApiProperty({ enum: IRON_PRODUCTS })
  @IsIn(IRON_PRODUCTS)
  product!: IronProduct;

  @ApiProperty({ example: '2 gotas por kg al día' })
  @IsString()
  @Length(1, 200)
  doseInstructions!: string;

  @ApiProperty({ minimum: 1, maximum: 100, description: 'Frascos, sobres o tabletas entregados' })
  @IsInt()
  @Min(1)
  @Max(100)
  quantity!: number;

  @ApiProperty({ enum: IRON_PURPOSES })
  @IsIn(IRON_PURPOSES)
  purpose!: IronPurpose;
}

export class HemoglobinTestDto extends RecordMetaDto implements HemoglobinTestRecord {
  @ApiProperty({ format: 'date' })
  testedOn!: string;

  @ApiProperty()
  observed!: string;

  @ApiProperty()
  altitudeMeters!: number;

  @ApiProperty()
  adjustment!: string;

  @ApiProperty()
  adjusted!: string;

  @ApiProperty()
  ageMonths!: number;

  @ApiProperty({ enum: ANEMIA_CLASSES })
  classification!: AnemiaClass;

  @ApiProperty()
  thresholdNorm!: string;
}

export class IronSupplyDto extends RecordMetaDto implements IronSupplyRecord {
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
}

export class AnemiaOverviewDto implements AnemiaOverview {
  @ApiProperty()
  thresholdsPublished!: boolean;

  @ApiProperty({ description: 'Altitud del establecimiento elegido, en m s. n. m.' })
  facilityAltitude!: number;

  @ApiProperty({ type: [HemoglobinTestDto] })
  tests!: HemoglobinTestDto[];

  @ApiProperty({ type: [IronSupplyDto] })
  supplies!: IronSupplyDto[];
}
