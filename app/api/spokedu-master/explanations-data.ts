import type {
  CreateExplanationInput,
  ExplanationAudience,
  MasterExplanationDto,
} from '@/app/spokedu-master/types/explanation';

export type MasterExplanationAudience = ExplanationAudience;

export type MasterExplanationRow = {
  id: string;
  owner_id: string;
  program_id: string;
  program_title: string;
  audience: MasterExplanationAudience;
  explanation_text: string;
  created_at: string;
};

export type { MasterExplanationDto };

export type NormalizedExplanationInput = CreateExplanationInput;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requiredText(value: unknown, field: string) {
  if (typeof value !== 'string') throw new Error(`${field} is required`);
  const text = value.trim();
  if (!text) throw new Error(`${field} is required`);
  return text;
}

function normalizeAudience(value: unknown): MasterExplanationAudience {
  if (value === 'parent' || value === 'center' || value === 'school') return value;
  throw new Error('audience is invalid');
}

export function normalizeExplanationInput(body: unknown): NormalizedExplanationInput {
  if (!isPlainObject(body)) throw new Error('Invalid explanation payload');

  return {
    programId: requiredText(body.programId, 'programId'),
    programTitle: requiredText(body.programTitle, 'programTitle'),
    audience: normalizeAudience(body.audience),
    text: requiredText(body.text, 'text'),
  };
}

export function explanationInsertPayload(input: NormalizedExplanationInput, ownerId: string) {
  return {
    owner_id: ownerId,
    program_id: input.programId,
    program_title: input.programTitle,
    audience: input.audience,
    explanation_text: input.text,
  };
}

export function toExplanationDto(row: MasterExplanationRow): MasterExplanationDto {
  return {
    id: row.id,
    programId: row.program_id,
    programTitle: row.program_title,
    audience: row.audience,
    text: row.explanation_text,
    createdAt: row.created_at,
  };
}
