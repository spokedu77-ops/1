import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { devLogger } from '@/app/lib/logging/devLogger';
import { getPlanForUser, PLAN_LIMITS, getAiReportUsageThisMonth, incrementAiReportUsage } from '@/app/lib/spokedu-pro/planUtils';

export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY ?? '';

type PhysicalLevel = 1 | 2 | 3;
type PhysicalFunctions = {
  coordination: PhysicalLevel;
  agility: PhysicalLevel;
  endurance: PhysicalLevel;
  balance: PhysicalLevel;
  strength: PhysicalLevel;
};

type ReportRequest = {
  student: {
    id?: string; // tenant 학생 id (spokedu_pro_ai_reports 저장 시 매핑용)
    name: string;
    classGroup: string;
    physical: PhysicalFunctions;
    attendanceStatus: 'present' | 'absent' | 'late';
  };
  sessionNotes: string;
  developmentGoal: string;
  additionalGoal?: string;
  tone: 'warm' | 'professional' | 'friendly';
  language: 'korean' | 'english';
  periodLabel?: string;
};

const PHYSICAL_LABELS: Record<keyof PhysicalFunctions, string> = {
  coordination: '협응력',
  agility: '순발력',
  endurance: '지구력',
  balance: '균형감',
  strength: '근력',
};
const LEVEL_LABELS: Record<PhysicalLevel, string> = { 1: '하', 2: '중', 3: '상' };

const TONE_DESC: Record<string, string> = {
  warm: '따뜻하고 공감적이며 격려 위주의 어조',
  professional: '전문적이고 체계적인 코치 어조',
  friendly: '친근하고 재미있는 선생님 어조',
};

function buildPrompt(req: ReportRequest): string {
  const physicalSummary = Object.entries(req.student.physical)
    .map(([k, v]) => `${PHYSICAL_LABELS[k as keyof PhysicalFunctions]}: ${LEVEL_LABELS[v as PhysicalLevel]}`)
    .join(', ');

  const period = req.periodLabel ?? '이번 수업';
  const toneDesc = TONE_DESC[req.tone] ?? TONE_DESC.warm;

  return `당신은 스포키듀(SPOKEDU) 어린이 스포츠 교육 전문 코치입니다.
학부모에게 전달할 수업 리포트를 아래 정보를 기반으로 작성해 주세요.

[수강생 정보]
- 이름: ${req.student.name}
- 반: ${req.student.classGroup}
- 출결: ${req.student.attendanceStatus === 'present' ? '출석' : req.student.attendanceStatus === 'late' ? '지각' : '결석'}
- 신체 기능 평가: ${physicalSummary}

[수업 기간]: ${period}
[코치 수업 메모]: ${req.sessionNotes || '(메모 없음)'}
[핵심 발달 목표]: ${req.developmentGoal}
${req.additionalGoal ? `[추가 목표]: ${req.additionalGoal}` : ''}
[어조]: ${toneDesc}

아래 JSON 형식으로만 응답해 주세요. JSON 외 다른 텍스트는 절대 포함하지 마세요.

{
  "highlight": "이번 수업 하이라이트 (2-3문장, 구체적인 활동 내용 포함)",
  "growth": "우리 아이 성장 포인트 (신체 기능 데이터 기반, 2-3문장)",
  "homeActivity": "가정 연계 활동 추천 (실천 가능한 3가지, 각 1-2문장)",
  "coachMessage": "코치 한마디 (격려·응원 메시지, 1-2문장)",
  "strengthSummary": "가장 두드러진 강점 한 단어 또는 짧은 문구",
  "growthTag": "성장 중인 영역 태그 (예: 균형감 향상 중)",
  "nextGoal": "다음 수업 목표 한 문장"
}`;
}

/** 사용자가 접근 가능한 center_id 1개 반환 (소유 우선, 없으면 멤버십) */
async function getActiveCenterId(
  supabase: ReturnType<typeof getServiceSupabase>,
  userId: string
): Promise<string | null> {
  const { data: owned } = await supabase
    .from('spokedu_pro_centers')
    .select('id')
    .eq('owner_id', userId)
    .limit(1)
    .maybeSingle();
  if (owned?.id) return owned.id;
  const { data: member } = await supabase
    .from('spokedu_pro_center_members')
    .select('center_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return member?.center_id ?? null;
}

/** center_id + tenant_student_id에 해당하는 spokedu_pro_students id 반환 (없으면 INSERT 후 반환) */
async function ensureStudentRow(
  supabase: ReturnType<typeof getServiceSupabase>,
  centerId: string,
  tenantStudentId: string,
  { name, classGroup }: { name: string; classGroup: string }
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('spokedu_pro_students')
    .select('id')
    .eq('center_id', centerId)
    .eq('tenant_student_id', tenantStudentId)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const now = new Date().toISOString();
  const dateOnly = now.slice(0, 10);
  const { data: inserted, error } = await supabase
    .from('spokedu_pro_students')
    .insert({
      center_id: centerId,
      tenant_student_id: tenantStudentId,
      name,
      class_group: classGroup,
      enrolled_at: dateOnly,
      status: 'active',
    })
    .select('id')
    .single();
  if (error || !inserted?.id) return null;
  return inserted.id;
}

const BADGES_KEY = 'badges';
const MAX_BADGES = 50;

type Badge = {
  id: string;
  studentName: string;
  classGroup: string;
  strengthSummary: string;
  growthTag: string;
  period: string;
  generatedAt: string;
};

async function saveBadge(
  supabase: ReturnType<typeof getServiceSupabase>,
  userId: string,
  badge: Badge
): Promise<void> {
  const { data } = await supabase
    .from('spokedu_pro_tenant_content')
    .select('draft_value')
    .eq('owner_id', userId)
    .eq('key', BADGES_KEY)
    .maybeSingle();

  const existing = (data?.draft_value as { badges?: Badge[] })?.badges ?? [];
  const next = [badge, ...existing].slice(0, MAX_BADGES);
  const now = new Date().toISOString();

  await supabase
    .from('spokedu_pro_tenant_content')
    .upsert(
      {
        owner_id: userId,
        key: BADGES_KEY,
        draft_value: { badges: next },
        published_value: { badges: next },
        draft_updated_at: now,
        published_at: now,
      },
      { onConflict: 'owner_id,key' }
    );
}

/** GET /api/spokedu-pro/ai-report?studentId=xxx — 해당 학생(tenant id)의 과거 리포트 목록 */
export async function GET(req: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const studentId = url.searchParams.get('studentId'); // tenant 학생 id
  const serviceSupabase = getServiceSupabase();
  const centerId = await getActiveCenterId(serviceSupabase, user.id);
  if (!centerId) return NextResponse.json({ ok: true, reports: [] });

  if (!studentId) {
    return NextResponse.json({ ok: true, reports: [] });
  }

  const { data: studentRow } = await serviceSupabase
    .from('spokedu_pro_students')
    .select('id')
    .eq('center_id', centerId)
    .eq('tenant_student_id', studentId)
    .maybeSingle();
  if (!studentRow?.id) return NextResponse.json({ ok: true, reports: [] });

  const { data: rows } = await serviceSupabase
    .from('spokedu_pro_ai_reports')
    .select('id, goal, content, created_at')
    .eq('student_id', studentRow.id)
    .order('created_at', { ascending: false })
    .limit(100);

  const reports = (rows ?? []).map((r) => ({
    id: r.id,
    goal: r.goal,
    content: r.content,
    created_at: r.created_at,
  }));

  return NextResponse.json({ ok: true, reports });
}

export async function POST(req: NextRequest) {
  // ── 인증 ───────────────────────────────────────────────────────────
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ── 플랜 & 사용량 병렬 조회 + 구독 status 명시 검증 ─────────────────
  const serviceSupabase = getServiceSupabase();

  const [plan, usageThisMonth] = await Promise.all([
    getPlanForUser(user.id),
    getAiReportUsageThisMonth(user.id),
  ]);

  // 구독 status 이중 체크: past_due/expired/canceled 상태면 차단
  const { data: subRow } = await serviceSupabase
    .from('spokedu_pro_subscriptions')
    .select('status')
    .in(
      'center_id',
      (await serviceSupabase
        .from('spokedu_pro_centers')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
      ).data?.map((r: { id: string }) => r.id) ?? []
    )
    .maybeSingle();

  if (subRow && subRow.status !== 'active' && subRow.status !== 'trialing') {
    return NextResponse.json(
      {
        error: 'subscription_inactive',
        status: subRow.status,
        message: '구독이 만료되었거나 일시 정지 상태입니다. 플랜을 확인해 주세요.',
      },
      { status: 403 }
    );
  }

  const monthlyLimit = PLAN_LIMITS[plan].aiReportsPerMonth;

  if (monthlyLimit === 0) {
    return NextResponse.json(
      {
        error: 'plan_restriction',
        plan,
        message: 'AI 리포트는 Basic 이상 플랜에서 사용 가능합니다.',
      },
      { status: 403 }
    );
  }

  if (usageThisMonth >= monthlyLimit) {
    return NextResponse.json(
      {
        error: 'monthly_limit_exceeded',
        plan,
        limit: monthlyLimit,
        used: usageThisMonth,
        message: `이번 달 AI 리포트 한도(${monthlyLimit}회)를 모두 사용했습니다. Pro 플랜으로 업그레이드하세요.`,
      },
      { status: 403 }
    );
  }

  // ── API key 확인 ───────────────────────────────────────────────────
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  // ── 요청 파싱 ──────────────────────────────────────────────────────
  let body: ReportRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.student?.name) {
    return NextResponse.json({ error: 'student.name is required' }, { status: 400 });
  }

  if ((body.sessionNotes?.length ?? 0) > 2000) {
    return NextResponse.json({ error: 'sessionNotes too long (max 2000 chars)' }, { status: 400 });
  }

  // ── Gemini 생성 ────────────────────────────────────────────────────
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = buildPrompt(body);
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonText = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return NextResponse.json({ error: '리포트 생성 중 오류가 발생했습니다. 다시 시도해주세요.' }, { status: 502 });
    }

    // 사용량 증가 (비동기, 실패해도 응답에 영향 없음)
    incrementAiReportUsage(user.id).catch((err) => devLogger.error('[spokedu-pro ai-report] incrementAiReportUsage', err));

    // 성취 뱃지 저장 (비동기, 실패해도 응답에 영향 없음)
    const strengthSummary = parsed.strengthSummary ?? '';
    const growthTag = parsed.growthTag ?? '';
    if (strengthSummary || growthTag) {
      saveBadge(serviceSupabase, user.id, {
        id: crypto.randomUUID(),
        studentName: body.student.name,
        classGroup: body.student.classGroup ?? '',
        strengthSummary,
        growthTag,
        period: body.periodLabel ?? '이번 수업',
        generatedAt: new Date().toISOString(),
      }).catch((err) => devLogger.error('[spokedu-pro ai-report] saveBadge', err));
    }

    // spokedu_pro_ai_reports 저장 (center_id + tenant_student_id 있으면). 실패해도 응답은 200, savedToHistory로 안내.
    let savedToHistory = false;
    const tenantStudentId = body.student.id;
    const centerId = await getActiveCenterId(serviceSupabase, user.id);
    if (centerId && tenantStudentId) {
      try {
        const studentId = await ensureStudentRow(serviceSupabase, centerId, tenantStudentId, {
          name: body.student.name,
          classGroup: body.student.classGroup ?? '',
        });
        if (studentId) {
          const meta = {
            studentName: body.student.name,
            classGroup: body.student.classGroup,
            periodLabel: body.periodLabel,
            generatedAt: new Date().toISOString(),
          };
          const content = JSON.stringify({ report: parsed, meta });
          const { error: insertErr } = await serviceSupabase.from('spokedu_pro_ai_reports').insert({
            student_id: studentId,
            center_id: centerId,
            goal: body.periodLabel ?? null,
            content,
            created_by: user.id,
          });
          if (!insertErr) savedToHistory = true;
          else console.error('[spokedu-pro ai-report] save report failed:', insertErr.message);
        }
      } catch (e) {
        console.error('[spokedu-pro ai-report] save report error:', e);
      }
    }

    return NextResponse.json({
      ok: true,
      report: parsed,
      meta: {
        studentName: body.student.name,
        classGroup: body.student.classGroup,
        period: body.periodLabel,
        generatedAt: new Date().toISOString(),
      },
      usage: {
        used: usageThisMonth + 1,
        limit: monthlyLimit === Infinity ? null : monthlyLimit,
      },
      savedToHistory,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
