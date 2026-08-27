import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import {
  buildEnvelopeOrThrow,
  createConsultLead,
  LeadEnvelopeValidationError,
  parseAcquisitionFromBody,
} from '@/app/lib/server/leadEnvelope';
import { parseConversionEvidenceSlug } from '@/app/spokedu/data/commercial-routes';
import {
  curriculumModeLabel,
  isCurriculumCommercialMode,
  type CurriculumCommercialMode,
} from '@/app/spokedu/data/curriculum-commercial-modes';

type LeadBody = {
  type?: unknown;
  lead_mode?: unknown;
  name_or_org?: unknown;
  phone?: unknown;
  content_type?: unknown;
  target_age?: unknown;
  purpose?: unknown;
  teacher_training?: unknown;
  partnership_type?: unknown;
  extra?: unknown;
  acquisition?: unknown;
  conversion_evidence_slug?: unknown;
  cta_intent_id?: unknown;
};

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function defaultCtaForMode(mode: CurriculumCommercialMode): string {
  switch (mode) {
    case 'package':
      return 'package_quote';
    case 'training':
      return 'training_consult';
    case 'master':
      return 'master_org_inquiry';
    case 'license':
      return 'license_consult';
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as LeadBody | null;
    if (!body) {
      return NextResponse.json({ ok: false, message: '요청 본문이 올바르지 않습니다.' }, { status: 400 });
    }

    const nameOrOrg = normalize(body.name_or_org);
    const rawType = normalize(body.type);
    if (rawType && rawType !== 'curriculum') {
      return NextResponse.json({ ok: false, message: '문의 유형(type)이 올바르지 않습니다.' }, { status: 400 });
    }
    const leadModeRaw = normalize(body.lead_mode);
    const leadMode: CurriculumCommercialMode =
      leadModeRaw && isCurriculumCommercialMode(leadModeRaw) ? leadModeRaw : 'training';
    if (leadModeRaw && !isCurriculumCommercialMode(leadModeRaw)) {
      return NextResponse.json(
        { ok: false, message: '도입 모드(lead_mode)가 올바르지 않습니다.' },
        { status: 400 },
      );
    }

    const phone = normalize(body.phone);
    const contentType = normalize(body.content_type);
    const targetAge = normalize(body.target_age);
    const purpose = normalize(body.purpose);
    const teacherTraining = normalize(body.teacher_training);
    const partnershipType = normalize(body.partnership_type);
    const extra = normalize(body.extra);
    const conversionEvidenceSlug =
      parseConversionEvidenceSlug(normalize(body.conversion_evidence_slug)) ?? undefined;
    const ctaIntentId = normalize(body.cta_intent_id) || defaultCtaForMode(leadMode);

    if (!nameOrOrg || !phone || !contentType || !targetAge || !purpose || !teacherTraining || !partnershipType) {
      return NextResponse.json({ ok: false, message: '필수 항목이 비어 있습니다.' }, { status: 400 });
    }

    let envelope;
    try {
      envelope = buildEnvelopeOrThrow({
        schemaVersion: 1,
        route: 'curriculum',
        acquisition: parseAcquisitionFromBody(body.acquisition),
        selection: {
          route: 'curriculum',
          mode: leadMode,
          contentType,
          purpose,
          teacherTraining,
          partnershipType,
          targetAge,
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

    const content = [
      `[커리큘럼 도입 모드] ${leadMode} · ${curriculumModeLabel(leadMode)}`,
      '[커리큘럼·콘텐츠 문의]',
      `이름/기관명: ${nameOrOrg}`,
      `연락처: ${phone}`,
      `필요한 콘텐츠 유형: ${contentType}`,
      `대상 연령: ${targetAge}`,
      `활용 목적: ${purpose}`,
      `강사 교육 필요 여부: ${teacherTraining}`,
      `제휴/구매 형태: ${partnershipType}`,
      `문의 type: curriculum`,
      `lead_mode: ${leadMode}`,
      '',
      '[추가 문의]',
      extra || '-',
    ].join('\n');

    const supabase = getServiceSupabase();
    const created = await createConsultLead(supabase, {
      envelope,
      parentName: nameOrOrg,
      phone,
      childAge: targetAge,
      content,
      consultType: 'center',
    });

    if (!created.ok) {
      return NextResponse.json({ ok: false, message: 'DB 저장에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, lead_mode: leadMode, leadId: created.id });
  } catch (error) {
    console.error('[curriculum/leads] unexpected', error);
    return NextResponse.json({ ok: false, message: '서버 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
