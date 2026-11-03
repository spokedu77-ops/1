import { isZeroFeeStaff } from '@/app/lib/staffTeacherFees';
import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { MASTER_EMAIL } from '@/app/lib/constants/admin';
import { fetchTeacherLogCounts } from '@/app/admin/users/fetchTeacherLogCounts';
import { cloneTierFeeMap } from '@/app/lib/teacherTierSchedule';
import { teacherFeePreview, type TierFeeRecord } from '@/app/lib/centers/teacherFeePreview';
import type { InstructorsDefault } from '@/app/lib/centers/types';
import { readCenterSettlementDefaults } from '@/app/lib/centers/settlementDefaults';
import { totalCenterFee } from '@/app/lib/centers/feeBreakdown';
import { centerDisplayName } from '@/app/lib/centers/displayName';

const json = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'private, no-store, max-age=0' },
});

/** Search only operational centers. Policy IDs and historical amounts are never inferred from names. */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) { auth.response.headers.set('Cache-Control', 'private, no-store'); return auth.response; }
  if (auth.email?.toLowerCase() !== MASTER_EMAIL) return json({ error: 'Forbidden' }, 403);
  const params = new URL(request.url).searchParams;
  const recurring = params.get('scope') === 'recurring';
  const search = (params.get('q') ?? '').trim();
  if (!recurring && params.get('scope') !== 'import') return json({ error: 'Unsupported scope' }, 400);
  if (search.length > 100) return json({ error: '검색어가 너무 깁니다.' }, 400);
  try {
    const service = getServiceSupabase();
    const term = search.replace(/[,%()]/g, ' ').trim();
    const centerQuery = () => service.from('centers')
      .select('id,name,region_tag,status,session_fee,main_teacher_id,main_teacher_2_id,main_teacher_3_id,instructors_default,settlement_defaults')
      .neq('status', 'ended').order('name').order('id');
    let query = centerQuery().limit(30);
    if (term) query = query.or(`name.ilike.%${term}%,settlement_defaults->>projectName.ilike.%${term}%`);
    const result = recurring ? { data: [], error: null } : await query;
    if (result.error) throw result.error;
    const centers = recurring ? [] : result.data ?? [];
    if (recurring) {
      // Page through the DB; the import search's 30-result limit must not omit centers.
      for (let offset = 0; ; offset += 500) {
        const page = await centerQuery().range(offset, offset + 499);
        if (page.error) throw page.error;
        const rows = page.data ?? [];
        centers.push(...rows.filter((center) => readCenterSettlementDefaults(center.settlement_defaults).type === 'regular'));
        if (rows.length < 500) break;
      }
    }
    const ids = [...new Set(centers.flatMap((center) => [center.main_teacher_id, center.main_teacher_2_id, center.main_teacher_3_id]).filter((id): id is string => Boolean(id)))];
    const [teachers, tiers, counts] = await Promise.all([
      ids.length ? service.from('users').select('id,name,role,email,is_admin,session_count,fee_center_main,fee_center_assist').in('id', ids) : Promise.resolve({ data: [], error: null }),
      service.from('teacher_tier_fees').select('tier_id,fee_center_main,fee_center_assist'),
      fetchTeacherLogCounts(service, ids),
    ]);
    if (teachers.error || tiers.error) throw teachers.error ?? tiers.error;
    const map = cloneTierFeeMap();
    const tierRows = (tiers.data ?? []) as TierFeeRecord[];
    for (const row of tierRows) if (row.tier_id in map) map[row.tier_id] = {
      ...map[row.tier_id], fee_center_main: row.fee_center_main ?? map[row.tier_id].fee_center_main,
      fee_center_assist: row.fee_center_assist ?? map[row.tier_id].fee_center_assist,
    };
    const teacherRows = (teachers.data ?? []).map((teacher) => ({ ...teacher, logCount: counts[teacher.id] ?? 0 }));
    return json({ centers: centers.map((center) => {
      const overrides = (center.instructors_default as InstructorsDefault | null)?.fees ?? [];
      const fee = (id: string | null, role: 'main' | 'assist') => isZeroFeeStaff(teacherRows.find((teacher) => teacher.id === id)) ? 0 : id
        ? overrides.find((item) => item.teacher_id === id && item.role === role)?.amount
          ?? teacherFeePreview(id, teacherRows, tierRows, map, role).amount
        : null;
      const assistants = [center.main_teacher_2_id, center.main_teacher_3_id].filter((id): id is string => Boolean(id));
      const assistantFees = assistants.map((id) => fee(id, 'assist'));
      const assigned = [center.main_teacher_id, ...assistants].filter(Boolean);
      const defaults = readCenterSettlementDefaults(center.settlement_defaults);
      const breakdown = defaults.billingBreakdown;
      return { id: center.id, name: centerDisplayName({ name: center.name, settlement_defaults: defaults }), region: center.region_tag,
        sessionFee: breakdown ? totalCenterFee(breakdown) : center.session_fee,
        defaults, billingBreakdown: breakdown ?? null,
        mainZeroFee: isZeroFeeStaff(teacherRows.find((teacher) => teacher.id === center.main_teacher_id)),
        assistZeroFee: assistants.length > 0 && assistants.every((id) => isZeroFeeStaff(teacherRows.find((teacher) => teacher.id === id))),
        mainFee: center.main_teacher_id ? fee(center.main_teacher_id, 'main') : 0,
        assistFee: new Set(assigned).size !== assigned.length || assistantFees.some((amount) => amount == null) ? null : assistantFees.reduce<number>((sum, amount) => sum + (amount ?? 0), 0) };
    }) });
  } catch {
    return json({ error: '센터정보를 불러오지 못했습니다.' }, 500);
  }
}
