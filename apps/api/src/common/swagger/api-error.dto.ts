import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ApiErrorBody, ErrorCode } from '@carnet/contracts';

export class ApiErrorDto implements ApiErrorBody {
  @ApiProperty({ example: 'VALIDATION_FAILED' })
  code!: ErrorCode;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } })
  fields?: Record<string, string[]>;
}
