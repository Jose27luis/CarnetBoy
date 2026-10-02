import type { ValidationError } from 'class-validator';
import { DomainError, type FieldErrors } from './domain-error';

function collect(errors: ValidationError[], parentPath: string, fields: FieldErrors): void {
  for (const error of errors) {
    const path = parentPath.length === 0 ? error.property : `${parentPath}.${error.property}`;

    if (error.constraints !== undefined) {
      fields[path] = Object.values(error.constraints);
    }

    if (error.children !== undefined && error.children.length > 0) {
      collect(error.children, path, fields);
    }
  }
}

export function validationExceptionFactory(errors: ValidationError[]): DomainError {
  const fields: FieldErrors = {};
  collect(errors, '', fields);

  return DomainError.validation(fields);
}
