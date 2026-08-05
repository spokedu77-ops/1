import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import {
  buildEnvelopeOrThrow,
  consultInsertFromEnvelope,
  LeadEnvelopeValidationError,
  parseAcquisitionFromBody,
} from '@/app/lib/server/leadEnvelope';
import {
  isPrivatePreferredFormat,
  isPrivateStartDirection,
  privateFormatLabel,
  privateStartDirectionLabel,
  type PrivatePreferredFormat,
  type PrivateStartDirection,
} from '@/app/spokedu/data/private-page';

type LeadBody = {
  type?: unknown;
  name?: unknown;
  phone?: unknown;
  content?: unknown;
  start_direction?: unknown;
  preferred_format?: unknown;
  sport?: unknown;
  instructor_preference?: unknown;
  region?: unknown;
  schedule?: unknown;
  acquisition?: unknown;
  conversion_evidence_slug?: unknown;
  cta_intent_id?: unknown;
};

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function sendNotifyEmail(params: {
  name: string;
  phone: string;
  content: string;
  startDirection?: PrivateStartDirection | null;
  preferredFormat?: PrivatePreferredFormat | null;
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

  const directionBit = params.startDirection
    ? privateStartDirectionLabel(params.startDirection)
    : '미지정';
  const subject = `[SPOKEDU private] ${directionBit} · ${params.name.slice(0, 32)}`;
  const text = [
    '스포키듀 private 랜딩 상담 신청',
    '',
    `이름/학습자 정보: ${params.name}`,
    `연락처: ${params.phone}`,
    params.startDirection
      ? `시작 방향: ${privateStartDirectionLabel(params.startDirection)} (${params.startDirection})`
      : null,
    params.preferredFormat
      ? `수업 형태: ${privateFormatLabel(params.preferredFormat)} (${params.preferredFormat})`
      : null,
    '',
    '--- 본문 ---',
    params.content,
  ]
    .filter(Boolean)
    .join('\n');

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
        { status: 400 },
      );
    }

    const name = normalize(body.name);
    const phone = normalize(body.phone);
    const rawType = normalize(body.type);
    if (rawType && rawType !== 'private') {
      return NextResponse.json(
        { ok: false, message: '문의 유형(type)이 올바르지 않습니다.' },
        { status: 400 },
      );
    }
    const content = normalize(body.content);
    const startDirectionRaw = normalize(body.start_direction);
    const preferredFormatRaw = normalize(body.preferred_format);
    const sport = normalize(body.sport);
    const instructorPreference = normalize(body.instructor_preference);
    const region = normalize(body.region);
    const schedule = normalize(body.schedule);
    const conversionEvidenceSlug = normalize(body.conversion_evidence_slug) || undefined;
    const ctaIntentId = normalize(body.cta_intent_id) || 'private_fit_consult';

    if (!name || !content) {
      return NextResponse.json(
        { ok: false, message: '필수 상담 항목이 비어 있습니다.' },
        { status: 400 },
      );
    }
    if (!phone) {
      return NextResponse.json({ ok: false, message: '연락처는 필수입니다.' }, { status: 400 });
    }

    const startDirection = isPrivateStartDirection(startDirectionRaw) ? startDirectionRaw : null;
    const preferredFormat = isPrivatePreferredFormat(preferredFormatRaw)
      ? preferredFormatRaw
      : 'undecided';

    if (startDirectionRaw && !startDirection) {
      return NextResponse.json(
        { ok: false, message: '시작 방향(start_direction)이 올바르지 않습니다.' },
        { status: 400 },
      );
    }
    if (preferredFormatRaw && !isPrivatePreferredFormat(preferredFormatRaw)) {
      return NextResponse.json(
        { ok: false, message: '수업 형태(preferred_format)가 올바르지 않습니다.' },
        { status: 400 },
      );
    }

    let envelope;
    try {
      envelope = buildEnvelopeOrThrow({
        schemaVersion: 1,
        route: 'private',
        acquisition: parseAcquisitionFromBody(body.acquisition),
        selection: {
          route: 'private',
          startDirection: startDirection ?? undefined,
          preferredFormat,
          sport: sport || undefined,
          instructorPreference: instructorPreference || undefined,
          region: region || undefined,
          schedule: schedule || undefined,
        },
        conversionEvidenceSlug,
        ctaIntentId,
      });
    } catch (e) {
      if (e instanceof LeadEnvelopeValidationError) {
        return NextResponse.json({ ok: false, message: e.message }, { status: 400 });
      }
      throw e;
    }

    const leadMeta = [
      `[문의 type]`,
      'private',
      `[lead_route] private`,
      startDirection
        ? `[start_direction] ${startDirection} · ${privateStartDirectionLabel(startDirection)}`
        : `[start_direction] unspecified · 레거시/미선택`,
      `[preferred_format] ${preferredFormat} · ${privateFormatLabel(preferredFormat)}`,
      sport ? `[sport] ${sport}` : null,
      instructorPreference ? `[instructor_preference] ${instructorPreference}` : null,
      region ? `[region] ${region}` : null,
      schedule ? `[schedule] ${schedule}` : null,
      '',
    ]
      .filter((line): line is string => line !== null)
      .join('\n');
    const storedContent = `${leadMeta}${content}`;

    const tableName = process.env.PRIVATE_LEADS_TABLE?.trim() || 'consultations';
    const supabase = getServiceSupabase();
    const insertRow = consultInsertFromEnvelope({
      envelope,
      parentName: name,
      phone,
      content: storedContent,
      consultType: 'tutoring',
    });

    const dedupeSince = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from(tableName)
      .select('id')
      .eq('consult_type', 'tutoring')
      .eq('phone', phone)
      .eq('content', storedContent)
      .gte('created_at', dedupeSince)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      return NextResponse.json({
        ok: true,
        emailSent: false,
        duplicate: true,
        leadId: existing.id,
        message: '접수가 저장되었습니다.',
      });
    }

    const { data: inserted, error } = await supabase
      .from(tableName)
      .insert(insertRow)
      .select('id')
      .single();

    if (error) {
      // 마이그레이션 전 환경: 구조화 컬럼 없이 재시도
      console.error('[private/leads] insert error', error);
      const { data: fallback, error: fallbackError } = await supabase
        .from(tableName)
        .insert({
          parent_name: name,
          phone,
          child_age: null,
          content: storedContent,
          consult_type: 'tutoring',
          status: 'pending',
        })
        .select('id')
        .single();
      if (fallbackError) {
        return NextResponse.json({ ok: false, message: 'DB 저장에 실패했습니다.' }, { status: 500 });
      }
      return NextResponse.json({
        ok: true,
        emailSent: false,
        leadId: fallback?.id,
        message: '접수가 저장되었습니다.',
      });
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
            type: 'private',
            name,
            phone,
            content,
            start_direction: startDirection,
            preferred_format: preferredFormat,
            sport: sport || undefined,
            instructor_preference: instructorPreference || undefined,
            region: region || undefined,
            schedule: schedule || undefined,
            leadId: inserted?.id,
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
      emailSent = await sendNotifyEmail({
        name,
        phone,
        content: storedContent,
        startDirection,
        preferredFormat,
      });
    } catch (e) {
      console.warn('[private/leads] email notify failed', e);
    }

    return NextResponse.json({
      ok: true,
      emailSent,
      leadId: inserted?.id,
      message: emailSent
        ? '접수 내용이 운영 메일로 발송되었습니다.'
        : '접수가 저장되었습니다. 메일 자동발송은 RESEND_API_KEY·PRIVATE_LEADS_NOTIFY_EMAIL 설정 시 동작합니다.',
    });
  } catch (error) {
    console.error('[private/leads] unexpected', error);
    return NextResponse.json(
      { ok: false, message: '서버 처리 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
