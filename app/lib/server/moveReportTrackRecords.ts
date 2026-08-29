import type { SessionChildRecordInput } from '@/app/lib/move-report/track/recordValidation';
import type { SupabaseClient } from '@supabase/supabase-js';

export type MovementExperienceRow = { domain: string; subtag: string };

export function normalizeRecordPayload(body: unknown): SessionChildRecordInput & {
  is_draft?: boolean;
  movement_experiences?: MovementExperienceRow[];
} {
  if (!body || typeof body !== 'object') throw new Error('Invalid body');
  const b = body as Record<string, unknown>;

  const attendance = b.attendance_status;
  if (attendance !== 'present' && attendance !== 'absent') {
    throw new Error('attendance_status required');
  }

  const input: SessionChildRecordInput & { is_draft?: boolean; movement_experiences?: MovementExperienceRow[] } = {
    attendance_status: attendance,
    absence_reason: (b.absence_reason as string | null) ?? null,
    observation_opportunity_band: (b.observation_opportunity_band as SessionChildRecordInput['observation_opportunity_band']) ?? null,
    participation_level: b.participation_level === undefined ? null : (b.participation_level as number | null),
    support_level: b.support_level === undefined ? null : (b.support_level as number | null),
    independent_initiation: b.independent_initiation === undefined ? null : (b.independent_initiation as number | null),
    self_reengagement: b.self_reengagement === undefined ? null : (b.self_reengagement as boolean | null),
    spomove_used: b.spomove_used === undefined ? null : (b.spomove_used as boolean | null),
    frw_seconds: b.frw_seconds === undefined ? null : (b.frw_seconds as number | null),
    frw_status: (b.frw_status as SessionChildRecordInput['frw_status']) ?? null,
    observation_note: (b.observation_note as string | null) ?? null,
    is_draft: b.is_draft !== false,
    movement_experiences: Array.isArray(b.movement_experiences)
      ? (b.movement_experiences as MovementExperienceRow[]).filter((m) => m.domain && m.subtag)
      : [],
  };

  if (input.attendance_status === 'absent') {
    input.observation_opportunity_band = null;
    input.participation_level = null;
    input.support_level = null;
    input.independent_initiation = null;
    input.self_reengagement = null;
    input.spomove_used = null;
    input.frw_seconds = null;
    input.frw_status = null;
    input.movement_experiences = [];
  }

  if (input.observation_opportunity_band == null && input.attendance_status === 'present') {
    input.participation_level = null;
    input.support_level = null;
    input.independent_initiation = null;
    input.self_reengagement = null;
    input.spomove_used = null;
    input.frw_seconds = null;
    input.frw_status = null;
    input.movement_experiences = [];
  }

  if (input.spomove_used === false) {
    input.frw_seconds = null;
    input.frw_status = null;
  }

  return input;
}

export async function upsertSessionChildRecord(
  supabase: SupabaseClient,
  opts: {
    sessionId: string;
    childId: string;
    userId: string;
    input: ReturnType<typeof normalizeRecordPayload>;
  },
) {
  const { sessionId, childId, userId, input } = opts;
  const row = {
    session_id: sessionId,
    child_id: childId,
    attendance_status: input.attendance_status,
    absence_reason: input.attendance_status === 'absent' ? input.absence_reason : null,
    observation_opportunity_band: input.observation_opportunity_band,
    participation_level: input.participation_level,
    support_level: input.support_level,
    independent_initiation: input.independent_initiation,
    self_reengagement: input.self_reengagement,
    spomove_used: input.spomove_used,
    frw_seconds: input.frw_seconds,
    frw_status: input.frw_status,
    observation_note: input.observation_note?.trim() || null,
    is_draft: input.is_draft !== false,
    updated_by: userId,
  };

  const { data: existing } = await supabase
    .from('mr_session_child_records')
    .select('id')
    .eq('session_id', sessionId)
    .eq('child_id', childId)
    .maybeSingle();

  let recordId: string;

  if (existing?.id) {
    const { data, error } = await supabase
      .from('mr_session_child_records')
      .update(row)
      .eq('id', existing.id)
      .select('id, record_version, is_draft, updated_at')
      .single();
    if (error) throw error;
    recordId = data.id;
  } else {
    const { data, error } = await supabase
      .from('mr_session_child_records')
      .insert({ ...row, created_by: userId })
      .select('id, record_version, is_draft, updated_at')
      .single();
    if (error) throw error;
    recordId = data.id;
  }

  if (input.attendance_status === 'present' && input.movement_experiences) {
    await supabase.from('mr_movement_experiences').delete().eq('session_child_record_id', recordId);
    if (input.movement_experiences.length > 0) {
      const { error: mxErr } = await supabase.from('mr_movement_experiences').insert(
        input.movement_experiences.map((m) => ({
          session_child_record_id: recordId,
          domain: m.domain,
          subtag: m.subtag,
        })),
      );
      if (mxErr) throw mxErr;
    }
  } else if (existing?.id) {
    await supabase.from('mr_movement_experiences').delete().eq('session_child_record_id', recordId);
  }

  const { data: full } = await supabase
    .from('mr_session_child_records')
    .select('*')
    .eq('id', recordId)
    .single();

  const { data: movements } = await supabase
    .from('mr_movement_experiences')
    .select('domain, subtag')
    .eq('session_child_record_id', recordId);

  return { record: full, movement_experiences: movements ?? [] };
}
