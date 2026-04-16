import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

type LeadBody = {
  name?: unknown;
  phone?: unknown;
  content?: unknown;
};

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function sendNotifyEmail(params: {
  name: string;
  phone: string;
  content: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const toRaw = process.env.PRIVATE_LEADS_NOTIFY_EMAIL?.trim();
  const from = process.env.PRIVATE_LEADS_EMAIL_FROM?.trim() || 'SPOKEDU <onboarding@resend.dev>';
  if (!apiKey || !toRaw) {
    return false;
  }
  const toList = toRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (toList.length === 0) return false;

  const subject = `[SPOKEDU private] 상담 신청 · ${params.name.slice(0, 40)}`;
  const text = [
    '스포키듀 private 랜딩 상담 신청',
    '',
    `이름/학습자 정보: ${params.name}`,
    `연락처: ${params.phone}`,
    '',
    '--- 본문 ---',
    params.content,
  ].join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: toList,
      subject,
      text,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[private/leads] Resend failed', res.status, errText);
    return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as LeadBody | null;
    if (!body) {
      return NextResponse.json(
        { ok: false, message: '요청 본문이 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    const name = normalize(body.name);
    const phone = normalize(body.phone);
    const content = normalize(body.content);
    if (!name || !content) {
      return NextResponse.json(
        { ok: false, message: '필수 상담 항목이 비어 있습니다.' },
        { status: 400 }
      );
    }
    if (!phone) {
      return NextResponse.json(
        { ok: false, message: '연락처는 필수입니다.' },
        { status: 400 }
      );
    }

    const tableName = process.env.PRIVATE_LEADS_TABLE?.trim() || 'consultations';
    const supabase = getServiceSupabase();
    const { error } = await supabase.from(tableName).insert({
      parent_name: name,
      phone: phone || null,
      child_age: null,
      content,
      consult_type: 'tutoring',
      status: 'pending',
    });

    if (error) {
      console.error('[private/leads] insert error', error);
      return NextResponse.json(
        { ok: false, message: 'DB 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    const webhookUrl = process.env.PRIVATE_LEADS_WEBHOOK_URL?.trim();
    if (webhookUrl) {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 8000);
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'private-landing',
            name,
            phone,
            content,
            createdAt: new Date().toISOString(),
          }),
          signal: controller.signal,
        }).finally(() => clearTimeout(t));
      } catch (e) {
        console.warn('[private/leads] webhook notify failed', e);
      }
    }

    let emailSent = false;
    try {
      emailSent = await sendNotifyEmail({ name, phone, content });
    } catch (e) {
      console.warn('[private/leads] email notify failed', e);
    }

    return NextResponse.json({
      ok: true,
      emailSent,
      message: emailSent
        ? '접수 내용이 운영 메일로 발송되었습니다.'
        : '접수가 저장되었습니다. 메일 자동발송은 RESEND_API_KEY·PRIVATE_LEADS_NOTIFY_EMAIL 설정 시 동작합니다.',
    });
  } catch (error) {
    console.error('[private/leads] unexpected', error);
    return NextResponse.json(
      { ok: false, message: '서버 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

