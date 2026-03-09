import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

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
  periodLabel?: string; // e.g. "2026년 3월 1주차"
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

const DB_READY = process.env.SPOKEDU_PRO_DB_READY === 'true';
const BASIC_REPORT_LIMIT = 20; // basic 플랜 월 한도

export async function POST(req: NextRequest) {
  // Auth check
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  // basic 플랜 월 사용량 제한 체크
  if (DB_READY) {
    const supabase = getServiceSupabase();
    const { data: ownedCenter } = await supabase
      .from('spokedu_pro_centers')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (ownedCenter) {
      const { data: sub } = await supabase
        .from('spokedu_pro_subscriptions')
        .select('plan, status')
        .eq('center_id', ownedCenter.id)
        .maybeSingle();

      const plan = sub?.plan ?? 'free';
      const isActive = !sub || sub.status === 'active' || sub.status === 'trialing';

      if (plan === 'basic' && isActive) {
        // 이번 달 생성된 리포트 수 조회
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const { count } = await supabase
          .from('spokedu_pro_ai_reports')
          .select('*', { count: 'exact', head: true })
          .eq('center_id', ownedCenter.id)
          .gte('created_at', monthStart);

        if ((count ?? 0) >= BASIC_REPORT_LIMIT) {
          return NextResponse.json(
            {
              error: 'monthly_limit_reached',
              limit: BASIC_REPORT_LIMIT,
              used: count ?? 0,
              message: `Basic 플랜은 월 ${BASIC_REPORT_LIMIT}회 AI 리포트를 제공합니다. Pro로 업그레이드하면 무제한 사용이 가능합니다.`,
            },
            { status: 429 }
          );
        }
      } else if (plan === 'free') {
        return NextResponse.json(
          { error: 'plan_required', message: 'AI 리포트는 Basic 이상 플랜에서 사용 가능합니다.' },
          { status: 403 }
        );
      }
    }
  }

  let body: ReportRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.student?.name) {
    return NextResponse.json({ error: 'student.name is required' }, { status: 400 });
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = buildPrompt(body);
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip markdown code fences if present
    const jsonText = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return NextResponse.json({ error: 'Failed to parse Gemini response', raw: text }, { status: 502 });
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
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
