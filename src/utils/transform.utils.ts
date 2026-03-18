import { TransformFnParams } from 'class-transformer';

export function transformToArray({ value }: TransformFnParams): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter((value): value is string => typeof value === 'string');
  }

  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.filter(
          (value): value is string => typeof value === 'string',
        );
      }
    } catch {
      return [];
    }
  }
  return [];
}

export function transformNullableMongoId({
  value,
}: TransformFnParams): string | null {
  if (value === 'null' || value === null) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  return null;
}
