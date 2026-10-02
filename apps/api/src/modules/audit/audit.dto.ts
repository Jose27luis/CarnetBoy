import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AuditEventItem, Page } from '@carnet/contracts';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';

export class AuditQueryDto {
  @ApiPropertyOptional({ description: 'Identificador del último evento de la página anterior' })
  @IsOptional()
  @Matches(/^\d{1,19}$/)
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 'account' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  entity?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  actorId?: string;
}

class AuditActorDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  email!: string;
}

export class AuditEventDto implements AuditEventItem {
  @ApiProperty()
  id!: string;

  @ApiProperty({ format: 'date-time' })
  occurredAt!: string;

  @ApiProperty({ type: AuditActorDto, nullable: true })
  actor!: AuditActorDto | null;

  @ApiProperty({ example: 'account.created' })
  action!: string;

  @ApiProperty({ example: 'account' })
  entity!: string;

  @ApiProperty({ format: 'uuid' })
  entityId!: string;

  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true })
  before!: unknown;

  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true })
  after!: unknown;
}

export class AuditPageDto implements Page<AuditEventDto> {
  @ApiProperty({ type: [AuditEventDto] })
  items!: AuditEventDto[];

  @ApiProperty({ nullable: true, type: String })
  nextCursor!: string | null;
}
