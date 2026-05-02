import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { normalizeMoveReportAttribution } from '@/app/move-report/lib/attributionSchema';

const ROLES = new Set([
  'preschool_pe',
  'visit_pe',
  'afterschool_pe',
  'center_owner',
  'institution_staff',
  'student_trainee',
  'other',
]);

const TARGET_AGES = new Set(['age_4_7', 'elem_low', 'elem_high', 'teen', 'mixed']);

const NEEDED_FEATURES = new Set([
  'dedicated_link',
  'class_distribution',
  'lesson_plan',
  'parent_feedback_copy',
  'institution_report',
  'curriculum_assets',
]);

const MAX_NAME = 80;
const MAX_CONTACT = 200;
const MAX_ORG = 120;
const MAX_SOURCE = 64;

const SOURCES = new Set(['move_report_result_cta', 'move_report_educator_beta_page']);

function trimStr(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | {
          name?: unknown;
          contact?: unknown;
          role?: unknown;
          organization?: unknown;
          targetAgeGroup?: unknown;
          neededFeature?: unknown;
          consent?: unknown;
          source?: unknown;
          createdAt?: unknown;
          attribution?: unknown;
        }
      | null;

    const name = trimStr(body?.name, MAX_NAME);
    const contact = trimStr(body?.contact, MAX_CONTACT);
    const role = trimStr(body?.role, 40);
    const organizationRaw = trimStr(body?.organization, MAX_ORG);
    const organization = organizationRaw || null;
    const targetAgeGroup = trimStr(body?.targetAgeGroup, 40);
    const neededFeature = trimStr(body?.neededFeature, 48);
    const consent = body?.consent === true;
    const sourceRaw = trimStr(body?.source, MAX_SOURCE);
    if (sourceRaw && !SOURCES.has(sourceRaw)) {
      return NextResponse.json({ ok: false, error: '요청 출처가 올바르지 않습니다.' }, { status: 400 });
    }
    const source = sourceRaw && SOURCES.has(sourceRaw) ? sourceRaw : 'move_report_result_cta';

    if (!name) {
      return NextResponse.json({ ok: false, error: '이름을 입력해 주세요.' }, { status: 400 });
    }
    if (!contact || contact.length < 3) {
      return NextResponse.json({ ok: false, error: '연락처 또는 이메일을 입력해 주세요.' }, { status: 400 });
    }
    if (!ROLES.has(role)) {
      return NextResponse.json({ ok: false, error: '직업·역할을 선택해 주세요.' }, { status: 400 });
    }
    if (!TARGET_AGES.has(targetAgeGroup)) {
      return NextResponse.json({ ok: false, error: '수업 대상 연령을 선택해 주세요.' }, { status: 400 });
    }
    if (!NEEDED_FEATURES.has(neededFeature)) {
      return NextResponse.json({ ok: false, error: '가장 필요한 기능을 선택해 주세요.' }, { status: 400 });
    }
    if (!consent) {
      return NextResponse.json({ ok: false, error: '개인정보 수집에 동의해 주세요.' }, { status: 400 });
    }

    const attribution = normalizeMoveReportAttribution(body?.attribution);
    const clientCreatedAt = typeof body?.createdAt === 'string' ? body.createdAt.trim().slice(0, 40) : null;
    const meta: Record<string, unknown> = { ...attribution };
    if (clientCreatedAt) meta.clientCreatedAt = clientCreatedAt;

    const supabase = getServiceSupabase();
    const { error } = await supabase.from('move_report_educator_leads').insert({
      name,
      contact,
      role,
      organization,
      target_age_group: targetAgeGroup,
      needed_feature: neededFeature,
      consent: true,
      source,
      meta,
    });

    if (error) {
      console.error('[move-report/educator-leads]', error);
      return NextResponse.json({ ok: false, error: '접수 저장 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[move-report/educator-leads] unexpected', e);
    const message = e instanceof Error ? e.message : '';
    if (message.includes('Supabase service role env')) {
      return NextResponse.json({ ok: false, error: '서버 설정 오류입니다.' }, { status: 500 });
    }
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
