type ServiceSupabase = ReturnType<typeof import('@/app/lib/server/adminAuth').getServiceSupabase>;

export type SpokeduMasterProfileRow = {
  user_id: string;
  name: string;
  school: string;
  role: 'teacher' | 'director';
  age_groups: string[];
  program_types: string[];
  onboarding_done: boolean;
  created_at: string;
  updated_at: string;
};

export type SpokeduMasterProfileDto = {
  name: string;
  school: string;
  role: 'teacher' | 'director';
  ageGroups: string[];
  programTypes: string[];
  onboardingDone: boolean;
};

const PROFILE_SELECT = 'user_id,name,school,role,age_groups,program_types,onboarding_done,created_at,updated_at';

function textOrEmpty(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeRole(value: unknown): 'teacher' | 'director' {
  return value === 'director' ? 'director' : 'teacher';
}

export function toSpokeduMasterProfileDto(row: SpokeduMasterProfileRow): SpokeduMasterProfileDto {
  return {
    name: row.name,
    school: row.school,
    role: row.role,
    ageGroups: row.age_groups ?? [],
    programTypes: row.program_types ?? [],
    onboardingDone: row.onboarding_done,
  };
}

export function normalizeSpokeduMasterProfileInput(body: unknown): {
  name: string;
  school: string;
  role: 'teacher' | 'director';
  ageGroups: string[];
  programTypes: string[];
  onboardingDone: boolean;
} {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Invalid profile payload');
  }
  const record = body as Record<string, unknown>;
  const name = textOrEmpty(record.name, '선생님').slice(0, 20) || '선생님';
  return {
    name,
    school: textOrEmpty(record.school),
    role: normalizeRole(record.role),
    ageGroups: normalizeStringArray(record.ageGroups),
    programTypes: normalizeStringArray(record.programTypes),
    onboardingDone: record.onboardingDone === true,
  };
}

export async function getSpokeduMasterProfile(
  serviceSupabase: ServiceSupabase,
  userId: string,
): Promise<{ row: SpokeduMasterProfileRow | null; error: unknown | null }> {
  const { data, error } = await serviceSupabase
    .from('spokedu_master_profiles')
    .select(PROFILE_SELECT)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { row: null, error };
  return { row: (data as SpokeduMasterProfileRow | null) ?? null, error: null };
}

export async function upsertSpokeduMasterProfile(
  serviceSupabase: ServiceSupabase,
  userId: string,
  input: ReturnType<typeof normalizeSpokeduMasterProfileInput>,
): Promise<{ row: SpokeduMasterProfileRow | null; error: unknown | null }> {
  const { data, error } = await serviceSupabase
    .from('spokedu_master_profiles')
    .upsert(
      {
        user_id: userId,
        name: input.name,
        school: input.school,
        role: input.role,
        age_groups: input.ageGroups,
        program_types: input.programTypes,
        onboarding_done: input.onboardingDone,
      },
      { onConflict: 'user_id' },
    )
    .select(PROFILE_SELECT)
    .single();

  if (error) return { row: null, error };
  return { row: data as SpokeduMasterProfileRow, error: null };
}
