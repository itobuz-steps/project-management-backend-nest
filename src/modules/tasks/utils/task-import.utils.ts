import { BadRequestException } from '@nestjs/common';
import { IMPORT_DEFAULT_FIELDS, CSV_NULLISH_VALUES } from './import-constant';

type SchemaPathWithDefault = {
  getDefault: (scope?: unknown, init?: boolean) => unknown;
};

export type ImportSchemaWithPath = {
  path: (field: string) => SchemaPathWithDefault | undefined;
};

export function parseCsvFile(buffer: Buffer): string[][] {
  const content = buffer.toString('utf8').replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let currentValue = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        currentValue += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(currentValue);
      currentValue = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      row.push(currentValue);
      currentValue = '';

      if (row.some((value) => value.trim().length > 0)) {
        rows.push(row.map((value) => value.trim()));
      }

      row = [];

      if (char === '\r' && content[i + 1] === '\n') {
        i += 1;
      }

      continue;
    }

    currentValue += char;
  }

  if (inQuotes) {
    throw new BadRequestException(
      'Invalid CSV: unmatched quote found in file content',
    );
  }

  row.push(currentValue);

  if (row.some((value) => value.trim().length > 0)) {
    rows.push(row.map((value) => value.trim()));
  }

  return rows;
}

export function normalizeCsvHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '');
}

export function splitCsvArrayValue(value: string): string[] {
  const separator = value.includes('|') ? '|' : ',';

  return value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isCsvNullishValue(value: string): boolean {
  return CSV_NULLISH_VALUES.has(value.trim().toLowerCase());
}

export function normalizeCsvEnumValue(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeCsvStatusValue(
  value: string,
  availableStatuses: Set<string>,
): string {
  const normalizedInput = value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');

  for (const status of availableStatuses) {
    const normalizedStatus = status
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-');

    if (normalizedStatus === normalizedInput) {
      return status;
    }
  }

  return value.trim();
}

function cloneDefaultValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return [...value] as T;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }

  if (value && typeof value === 'object') {
    return { ...(value as object) } as T;
  }

  return value;
}

export function getTaskSchemaDefaultsForImport(
  schema: ImportSchemaWithPath,
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  for (const field of IMPORT_DEFAULT_FIELDS) {
    const schemaPath = schema.path(field);

    if (!schemaPath) {
      continue;
    }

    const value = schemaPath.getDefault(null, false);

    if (value === undefined) {
      continue;
    }

    defaults[field] = cloneDefaultValue(value);
  }

  return defaults;
}
