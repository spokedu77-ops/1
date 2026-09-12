import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterCapability } from '@/app/lib/server/spokeduMasterAccess';
import { CLASS_TIME_COLLISION_MESSAGE } from '@/app/spokedu-master/lib/sessionIntegrity';
import { buildScheduleOccurrencePreview, type MasterScheduleRule } from '@/app/spokedu-master/lib/recurringSchedule';
import { findOfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';

const SELECT = 'id,class_id,cadence,weekday,start_time,duration_minutes,starts_on,ends_on,occurrence_limit,active,created_at,updated_at';
const dto = (row: Record<string, unknown>): MasterScheduleRule => ({
  id: String(row.id), classId: String(row.class_id), cadence: row.cadence === 'biweekly' ? 'biweekly' : 'weekly',
  weekday: Number(row.weekday), startTime: String(row.start_time).slice(0, 5), durationMinutes: Number(row.duration_minutes),
  startsOn: String(row.starts_on), endsOn: row.ends_on ? String(row.ends_on) : null,
  occurrenceLimit: row.occurrence_limit == null ? null : Number(row.occurrence_limit), active: Boolean(row.active),
  createdAt: String(row.created_at), updatedAt: String(row.updated_at),
});
const occurrenceKey = (value: unknown) => {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (typeof item.startAt !== 'string' || typeof item.endAt !== 'string') return null;
  const startAt = new Date(item.startAt); const endAt = new Date(item.endAt);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) return null;
  return `${startAt.toISOString()}|${endAt.toISOString()}`;
};

export async function GET(_: Request, context: { params: Promise<{ classId: string }> }) {
  const access = await requireSpokeduMasterCapability('attendance');
  if (!access.ok) return withPrivateNoStore(access.response);
  const { classId } = await context.params;
  const { data, error } = await getServiceSupabase().from('spokedu_master_class_schedule_rules').select(SELECT)
    .eq('owner_id', access.userId).eq('class_id', classId).order('weekday').order('start_time');
  if (error) return privateNoStoreJson({ error: '정기 일정을 불러오지 못했습니다.' }, { status: 500 });
  return privateNoStoreJson({ data: (data ?? []).map((row) => dto(row as Record<string, unknown>)) });
}

export async function POST(request: Request, context: { params: Promise<{ classId: string }> }) {
  const access = await requireSpokeduMasterCapability('attendance');
  if (!access.ok) return withPrivateNoStore(access.response);
  const { classId } = await context.params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const cadence = body?.cadence === 'biweekly' ? 'biweekly' : body?.cadence === 'weekly' ? 'weekly' : null;
  const weekday = Number(body?.weekday); const durationMinutes = Number(body?.durationMinutes);
  const startTime = typeof body?.startTime === 'string' ? body.startTime : '';
  const startsOn = typeof body?.startsOn === 'string' ? body.startsOn : '';
  const occurrences = Array.isArray(body?.occurrences) ? body.occurrences : [];
  const activities = Array.isArray(body?.activities) ? body.activities : [];
  const memo = typeof body?.memo === 'string' ? body.memo.trim() || null : null;
  const expectedOccurrences = cadence && Number.isInteger(weekday) && /^\d{2}:\d{2}$/.test(startTime) && /^\d{4}-\d{2}-\d{2}$/.test(startsOn)
    ? buildScheduleOccurrencePreview({ cadence, weekday, startTime, startsOn, count: 12, durationMinutes })
    : [];
  const expectedOccurrenceKeys = new Set(expectedOccurrences.map((item) => `${item.startAt}|${item.endAt}`));
  const occurrenceKeys = occurrences.map(occurrenceKey);
  if (!cadence || !Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !/^\d{2}:\d{2}$/.test(startTime)
    || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || durationMinutes < 15 || durationMinutes > 480
    || occurrences.length < 1 || occurrences.length > 12
    || occurrences.some((item) => !item || typeof item !== 'object' || typeof (item as Record<string, unknown>).startAt !== 'string' || typeof (item as Record<string, unknown>).endAt !== 'string')
    || occurrenceKeys.some((key) => !key || !expectedOccurrenceKeys.has(key)) || new Set(occurrenceKeys).size !== occurrenceKeys.length
    || activities.length > 50) {
    return privateNoStoreJson({ error: '정기 일정과 생성 범위를 확인해 주세요.' }, { status: 400 });
  }
  if (access.plan === 'lite' && memo) {
    return privateNoStoreJson({ error: '수업 메모와 누적 기록은 Premium에서 사용할 수 있습니다.' }, { status: 403 });
  }
  const supabase = getServiceSupabase();
  const { data: classRow } = await supabase.from('spokedu_master_classes').select('id').eq('id', classId).eq('owner_id', access.userId).is('deleted_at', null).maybeSingle();
  if (!classRow) return privateNoStoreJson({ error: '수업반을 찾을 수 없습니다.' }, { status: 404 });
  const { data: rule, error: ruleError } = await supabase.from('spokedu_master_class_schedule_rules').insert({
    owner_id: access.userId, class_id: classId, cadence, weekday, start_time: startTime,
    duration_minutes: durationMinutes, starts_on: startsOn, occurrence_limit: occurrences.length, active: true,
  }).select(SELECT).single();
  if (ruleError || !rule) return privateNoStoreJson({ error: '정기 일정을 저장하지 못했습니다.' }, { status: 500 });
  let canonicalActivities: Array<Record<string, unknown>>;
  try {
    canonicalActivities = activities.map((item) => {
      if (!item || typeof item !== 'object') throw new Error('Invalid activity');
      const value = item as Record<string, unknown>;
      if (value.sourceType === 'program') {
        const programId = Number(value.programId);
        if (!Number.isInteger(programId) || programId < 1) throw new Error('Invalid program');
        return { sourceType: 'program', programId };
      }
      if (value.sourceType === 'spomove') {
        const preset = findOfficialSpomovePreset(typeof value.spomovePresetId === 'string' ? value.spomovePresetId : '');
        if (!preset?.isReady || preset.catalogStatus === 'hold') throw new Error('Invalid SPOMOVE activity');
        return { sourceType: 'spomove', spomovePresetId: preset.id, programTitle: preset.title };
      }
      throw new Error('Invalid activity');
    });
  } catch {
    await supabase.from('spokedu_master_class_schedule_rules').delete().eq('id', rule.id).eq('owner_id', access.userId);
    return privateNoStoreJson({ error: 'Invalid session activity' }, { status: 400 });
  }
  const { data: generated, error } = await supabase.rpc('spokedu_master_materialize_schedule_rule_with_activities', {
    p_owner_id: access.userId, p_class_id: classId, p_rule_id: rule.id, p_occurrences: occurrences,
    p_memo: memo, p_activities: canonicalActivities,
  });
  if (error) {
    await supabase.from('spokedu_master_class_schedule_rules').delete().eq('id', rule.id).eq('owner_id', access.userId);
    if (error.code === '23505') return privateNoStoreJson({ error: CLASS_TIME_COLLISION_MESSAGE }, { status: 400 });
    return privateNoStoreJson({ error: '수업 일정을 생성하지 못했습니다.' }, { status: 500 });
  }
  return privateNoStoreJson({ data: { rule: dto(rule as Record<string, unknown>), occurrences: generated ?? [] } }, { status: 201 });
}
