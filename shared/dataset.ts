import { ACTIVITY_KINDS, type Activity, type ActivityKind, type Dataset } from './types.ts';

// Thrown when stored or submitted data does not have the Dataset shape
export class DatasetFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatasetFormatError';
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

// Validates the structural shape of one activity (content rules live in validate.ts)
function parseActivity(raw: unknown, index: number): Activity {
  const where = `activities[${index}]`;
  if (!isObject(raw)) throw new DatasetFormatError(`${where} is not an object`);
  const { id, time, name, kind, shared, participants } = raw;
  if (typeof id !== 'string') throw new DatasetFormatError(`${where}.id must be a string`);
  if (typeof time !== 'string') throw new DatasetFormatError(`${where}.time must be a string`);
  if (typeof name !== 'string') throw new DatasetFormatError(`${where}.name must be a string`);
  if (!ACTIVITY_KINDS.includes(kind as ActivityKind)) throw new DatasetFormatError(`${where}.kind is invalid`);
  if (typeof shared !== 'boolean') throw new DatasetFormatError(`${where}.shared must be a boolean`);
  if (!Array.isArray(participants) || !participants.every((p) => typeof p === 'string')) {
    throw new DatasetFormatError(`${where}.participants must be an array of strings`);
  }
  return { id, time, name, kind: kind as ActivityKind, shared, participants: [...participants] };
}

// Parses unknown input (object or JSON text) into a Dataset, throwing DatasetFormatError on bad shape
export function parseDataset(input: unknown): Dataset {
  let raw = input;
  if (typeof input === 'string') {
    try {
      raw = JSON.parse(input);
    } catch (err) {
      throw new DatasetFormatError(`Invalid JSON: ${(err as Error).message}`);
    }
  }
  if (!isObject(raw)) throw new DatasetFormatError('Dataset must be an object');
  const { version, updatedAt, activities } = raw;
  if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 0) {
    throw new DatasetFormatError('version must be a non-negative integer');
  }
  if (typeof updatedAt !== 'string') throw new DatasetFormatError('updatedAt must be a string');
  if (!Array.isArray(activities)) throw new DatasetFormatError('activities must be an array');
  return { version, updatedAt, activities: activities.map(parseActivity) };
}
