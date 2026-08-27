import { describe, expect, it, vi } from 'vitest';
import {
  buildEnvelopeOrThrow,
  createConsultLead,
  isConsultSchemaCompatibilityError,
} from './leadEnvelope';

describe('isConsultSchemaCompatibilityError', () => {
  it('allows undefined_column / schema cache missing column', () => {
    expect(isConsultSchemaCompatibilityError({ code: '42703', message: 'column "lead_route" does not exist' })).toBe(
      true,
    );
    expect(
      isConsultSchemaCompatibilityError({
        code: 'PGRST204',
        message: "Could not find the 'lead_context' column of 'consultations' in the schema cache",
      }),
    ).toBe(true);
    expect(
      isConsultSchemaCompatibilityError({
        message: 'Could not find the lead_route column in the schema cache',
      }),
    ).toBe(true);
  });

  it('rejects constraint, permission, and generic failures', () => {
    expect(isConsultSchemaCompatibilityError({ code: '23505', message: 'duplicate key value' })).toBe(false);
    expect(isConsultSchemaCompatibilityError({ code: '23502', message: 'null value in column' })).toBe(false);
    expect(isConsultSchemaCompatibilityError({ code: '42501', message: 'permission denied' })).toBe(false);
    expect(isConsultSchemaCompatibilityError({ message: 'JWT expired' })).toBe(false);
    expect(isConsultSchemaCompatibilityError({ message: 'connection refused' })).toBe(false);
    expect(isConsultSchemaCompatibilityError({ message: 'Internal Server Error' })).toBe(false);
  });
});

function makeEnvelope() {
  return buildEnvelopeOrThrow({
    schemaVersion: 1,
    route: 'private',
    acquisition: { entrySurface: 'direct' },
    selection: { route: 'private', preferredFormat: 'undecided' },
    ctaIntentId: 'private_fit_consult',
  });
}

function mockSupabaseInsertSequence(
  results: Array<{ data: { id: string } | null; error: { code?: string; message: string } | null }>,
) {
  let call = 0;
  const insert = vi.fn(() => {
    const result = results[call] ?? results[results.length - 1];
    call += 1;
    return {
      select: () => ({
        single: async () => result,
      }),
    };
  });
  return {
    from: vi.fn(() => ({ insert })),
    __insert: insert,
  };
}

describe('createConsultLead fallback gating', () => {
  it('returns structured id on success', async () => {
    const supabase = mockSupabaseInsertSequence([{ data: { id: 'c1' }, error: null }]);
    const result = await createConsultLead(supabase as never, {
      envelope: makeEnvelope(),
      parentName: '테스트',
      phone: '01012345678',
      content: 'hello',
      consultType: 'tutoring',
    });
    expect(result).toEqual({ ok: true, id: 'c1', structured: true });
    expect(supabase.__insert).toHaveBeenCalledTimes(1);
  });

  it('falls back to legacy only on schema compatibility error', async () => {
    const supabase = mockSupabaseInsertSequence([
      {
        data: null,
        error: {
          code: 'PGRST204',
          message: "Could not find the 'lead_route' column of 'consultations' in the schema cache",
        },
      },
      { data: { id: 'legacy-1' }, error: null },
    ]);
    const result = await createConsultLead(supabase as never, {
      envelope: makeEnvelope(),
      parentName: '테스트',
      phone: '01012345678',
      content: 'hello',
      consultType: 'tutoring',
    });
    expect(result).toEqual({ ok: true, id: 'legacy-1', structured: false });
    expect(supabase.__insert).toHaveBeenCalledTimes(2);
  });

  it('does not legacy-fallback on constraint / permission errors', async () => {
    const supabase = mockSupabaseInsertSequence([
      { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } },
    ]);
    const result = await createConsultLead(supabase as never, {
      envelope: makeEnvelope(),
      parentName: '테스트',
      phone: '01012345678',
      content: 'hello',
      consultType: 'tutoring',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/duplicate/i);
    expect(supabase.__insert).toHaveBeenCalledTimes(1);
  });
});
