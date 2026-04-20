/**
 * 스포키듀 PRO — 플랜 업그레이드(도입) 문의 접수.
 * 인증된 사용자만 호출. Resend + 수신 메일 환경변수가 있으면 운영 메일 발송.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

type Body = { plan?: unknown };

function notifyEmail(params: { subject: string; text: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const toRaw = (
    process.env.SPOKEDU_PRO_INQUIRY_NOTIFY_EMAIL ||
    process.env.PRIVATE_LEADS_NOTIFY_EMAIL ||
    ''
  ).trim();
  const from = process.env.PRIVATE_LEADS_EMAIL_FROM?.trim() || 'SPOKEDU <onboarding@resend.dev>';
  if (!apiKey || !toRaw) return Promise.resolve(false);
  const toList = toRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (toList.length === 0) return Promise.resolve(false);

  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: toList,
      subject: params.subject,
      text: params.text,
    }),
  }).then((r) => r.ok);
}

export async function POST(req: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const plan = body.plan === 'basic' || body.plan === 'pro' ? body.plan : null;
  if (!plan) {
    return NextResponse.json({ ok: false, error: 'invalid_plan' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data: centers } = await supabase
    .from('spokedu_pro_centers')
    .select('id, name')
    .eq('owner_id', user.id)
    .limit(1);
  const centerName = centers?.[0]?.name ?? '(센터 미생성)';

  const planLabel = plan === 'basic' ? 'Basic' : 'Pro';
  const subject = `[SPOKEDU PRO] ${planLabel} 도입 문의`;
  const text = [
    '스포키듀 PRO 플랜 업그레이드 문의(앱 내 버튼)',
    '',
    `요청 플랜: ${planLabel}`,
    `사용자 ID: ${user.id}`,
    `이메일: ${user.email ?? '(없음)'}`,
    `센터(추정): ${centerName}`,
    '',
    `접수 시각(UTC): ${new Date().toISOString()}`,
  ].join('\n');

  let notified = false;
  try {
    notified = await notifyEmail({ subject, text });
  } catch (e) {
    console.warn('[plan-inquiry] email failed', e);
  }

  if (!notified) {
    console.warn('[plan-inquiry] email skipped or failed — 로그용 본문:\n', text);
  }

  return NextResponse.json({
    ok: true,
    notified,
    message: notified
      ? '도입 문의가 운영 메일로 전달되었습니다. 빠른 시일 내에 연락드리겠습니다.'
      : '문의가 접수되었습니다. 자동 메일이 설정되지 않은 경우 contact@spokedu.co.kr 로 곧 연락드립니다.',
  });
}
