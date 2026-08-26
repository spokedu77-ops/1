import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterCapability } from '@/app/lib/server/spokeduMasterAccess';
import type { MasterScheduleRule } from '@/app/spokedu-master/lib/recurringSchedule';

const SELECT = 'id,class_id,cadence,weekday,start_time,duration_minutes,starts_on,ends_on,occurrence_limit,active,created_at,updated_at';
const dto = (row: Record<string, unknown>): MasterScheduleRule => ({
  id: String(row.id), classId: String(row.class_id), cadence: row.cadence === 'biweekly' ? 'biweekly' : 'weekly',
  weekday: Number(row.weekday), startTime: String(row.start_time).slice(0, 5), durationMinutes: Number(row.duration_minutes),
  startsOn: String(row.starts_on), endsOn: row.ends_on ? String(row.ends_on) : null,
  occurrenceLimit: row.occurrence_limit == null ? null : Number(row.occurrence_limit), active: Boolean(row.active),
  createdAt: String(row.created_at), updatedAt: String(row.updated_at),
});

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
  if (!cadence || !Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !/^\d{2}:\d{2}$/.test(startTime)
    || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || durationMinutes < 15 || durationMinutes > 480
    || occurrences.length < 1 || occurrences.length > 12
    || occurrences.some((item) => !item || typeof item !== 'object' || typeof (item as Record<string, unknown>).startAt !== 'string' || typeof (item as Record<string, unknown>).endAt !== 'string')) {
    return privateNoStoreJson({ error: '정기 일정과 생성 범위를 확인해 주세요.' }, { status: 400 });
  }
  const supabase = getServiceSupabase();
  const { data: classRow } = await supabase.from('spokedu_master_classes').select('id').eq('id', classId).eq('owner_id', access.userId).is('deleted_at', null).maybeSingle();
  if (!classRow) return privateNoStoreJson({ error: '수업반을 찾을 수 없습니다.' }, { status: 404 });
  const { data: rule, error: ruleError } = await supabase.from('spokedu_master_class_schedule_rules').insert({
    owner_id: access.userId, class_id: classId, cadence, weekday, start_time: startTime,
    duration_minutes: durationMinutes, starts_on: startsOn, occurrence_limit: occurrences.length, active: true,
  }).select(SELECT).single();
  if (ruleError || !rule) return privateNoStoreJson({ error: '정기 일정을 저장하지 못했습니다.' }, { status: 500 });
  const { data: generated, error } = await supabase.rpc('spokedu_master_materialize_schedule_rule', {
    p_owner_id: access.userId, p_class_id: classId, p_rule_id: rule.id, p_occurrences: occurrences,
  });
  if (error) {
    await supabase.from('spokedu_master_class_schedule_rules').delete().eq('id', rule.id).eq('owner_id', access.userId);
    return privateNoStoreJson({ error: '수업 일정을 생성하지 못했습니다.' }, { status: 500 });
  }
  return privateNoStoreJson({ data: { rule: dto(rule as Record<string, unknown>), occurrences: generated ?? [] } }, { status: 201 });
}
