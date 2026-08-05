import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import {
  buildEnvelopeOrThrow,
  consultInsertFromEnvelope,
  LeadEnvelopeValidationError,
  parseAcquisitionFromBody,
} from '@/app/lib/server/leadEnvelope';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ ok: false, error: '요청 본문이 올바르지 않습니다.' }, { status: 400 });
    }

    const organization = typeof body.organization === 'string' ? body.organization.trim() : '';
    const manager = typeof body.manager === 'string' ? body.manager.trim() : '';
    const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : '';
    const emailRaw = typeof body.email === 'string' ? body.email.trim() : '';
    const location = typeof body.location === 'string' ? body.location.trim() : '';
    const startDate = typeof body.startDate === 'string' ? body.startDate.trim() : '';
    const endDate = typeof body.endDate === 'string' ? body.endDate.trim() : '';
    const headcount = typeof body.headcount === 'string' ? body.headcount.trim() : '';
    const specialNeeds = typeof body.specialNeeds === 'string' ? body.specialNeeds.trim() : '';
    const inquiry = typeof body.inquiry === 'string' ? body.inquiry.trim() : '';
    const rawType = typeof body.type === 'string' ? body.type.trim() : '';
    if (rawType && rawType !== 'dispatch') {
      return NextResponse.json({ ok: false, error: '문의 유형(type)이 올바르지 않습니다.' }, { status: 400 });
    }
    const source = typeof body.source === 'string' ? body.source.trim() : 'dispatch-page';
    const programs = Array.isArray(body.programs)
      ? body.programs.filter((v): v is string => typeof v === 'string')
      : [];
    const targetAge = Array.isArray(body.targetAge)
      ? body.targetAge.filter((v): v is string => typeof v === 'string')
      : [];
    const conversionEvidenceSlug =
      typeof body.conversion_evidence_slug === 'string' ? body.conversion_evidence_slug.trim() : '';
    const ctaIntentId =
      typeof body.cta_intent_id === 'string' && body.cta_intent_id.trim()
        ? body.cta_intent_id.trim()
        : 'dispatch_proposal';

    if (!organization || !manager) {
      return NextResponse.json({ ok: false, error: '기관명과 담당자 정보는 필수입니다.' }, { status: 400 });
    }

    const phone = normalizePhone(phoneRaw);
    const email = emailRaw.toLowerCase();
    if (!phone && !email) {
      return NextResponse.json({ ok: false, error: '연락처(번호 또는 메일) 중 하나는 필수입니다.' }, { status: 400 });
    }
    if (email && !isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: '이메일 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    let envelope;
    try {
      envelope = buildEnvelopeOrThrow({
        schemaVersion: 1,
        route: 'dispatch',
        acquisition: parseAcquisitionFromBody(body.acquisition),
        selection: {
          route: 'dispatch',
          programs,
          targetAges: targetAge,
          headcount: headcount || undefined,
          specialNeeds: specialNeeds || undefined,
          location: location || undefined,
          organizationName: organization,
        },
        conversionEvidenceSlug: conversionEvidenceSlug || undefined,
        ctaIntentId,
      });
    } catch (e) {
      if (e instanceof LeadEnvelopeValidationError) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
      }
      throw e;
    }

    const supabase = getServiceSupabase();
    let dispatchLead: { id: string } | null = null;
    {
      const primary = await supabase
        .from('dispatch_leads')
        .insert({
          organization_name: organization,
          manager_name: manager,
          phone: phone || null,
          email: email || null,
          location: location || null,
          start_date: startDate || null,
          end_date: endDate || null,
          programs,
          target_ages: targetAge,
          headcount: headcount || null,
          special_needs: specialNeeds || null,
          inquiry: inquiry || null,
          source,
          mirror_status: 'pending',
        })
        .select('id')
        .single();

      if (primary.error || !primary.data?.id) {
        // 마이그레이션 전: mirror_status 없이 재시도
        const fallback = await supabase
          .from('dispatch_leads')
          .insert({
            organization_name: organization,
            manager_name: manager,
            phone: phone || null,
            email: email || null,
            location: location || null,
            start_date: startDate || null,
            end_date: endDate || null,
            programs,
            target_ages: targetAge,
            headcount: headcount || null,
            special_needs: specialNeeds || null,
            inquiry: inquiry || null,
            source,
          })
          .select('id')
          .single();
        if (fallback.error || !fallback.data?.id) {
          console.error('[dispatch/leads]', primary.error ?? fallback.error);
          return NextResponse.json({ ok: false, error: '접수 저장 중 오류가 발생했습니다.' }, { status: 500 });
        }
        dispatchLead = fallback.data;
      } else {
        dispatchLead = primary.data;
      }
    }

    if (!dispatchLead?.id) {
      return NextResponse.json({ ok: false, error: '접수 저장 중 오류가 발생했습니다.' }, { status: 500 });
    }

    const consultContent = [
      '[기관 맞춤 제안서 요청]',
      `기관명/센터명: ${organization || '-'}`,
      `담당자: ${manager || '-'}`,
      `연락처: ${phone || '-'}`,
      `이메일: ${email || '-'}`,
      `기관 소재지: ${location || '-'}`,
      `파견 희망 시작일: ${startDate || '-'}`,
      `파견 희망 종료일: ${endDate || '-'}`,
      `희망 프로그램: ${programs.length ? programs.join(', ') : '-'}`,
      `대상 연령: ${targetAge.length ? targetAge.join(', ') : '-'}`,
      `인원: ${headcount || '-'}`,
      `특수 아동 참여 유무: ${specialNeeds || '-'}`,
      `문의 type: dispatch`,
      `source_lead_id: ${dispatchLead.id}`,
      '',
      '[희망 수업 내용/방향성]',
      inquiry || '-',
      '',
      `유입 경로: ${source || '-'}`,
    ].join('\n');

    const insertRow = consultInsertFromEnvelope({
      envelope,
      parentName: `${organization} / ${manager}`,
      phone: phone || null,
      content: consultContent,
      consultType: 'center',
      sourceLeadId: dispatchLead.id,
    });

    const { data: consultRow, error: consultError } = await supabase
      .from('consultations')
      .insert(insertRow)
      .select('id')
      .single();

    if (consultError) {
      console.error('[dispatch/leads] consultations mirror insert failed', consultError);
      await supabase
        .from('dispatch_leads')
        .update({
          mirror_status: 'failed',
          mirror_error: consultError.message?.slice(0, 500) ?? 'mirror failed',
        })
        .eq('id', dispatchLead.id);
      // 본체(dispatch_leads) 성공이 우선 — 요청은 성공
      return NextResponse.json({
        ok: true,
        leadId: dispatchLead.id,
        mirrorStatus: 'failed',
      });
    }

    await supabase
      .from('dispatch_leads')
      .update({
        mirror_status: 'synced',
        mirror_consult_id: consultRow?.id ?? null,
        mirror_error: null,
      })
      .eq('id', dispatchLead.id);

    return NextResponse.json({
      ok: true,
      leadId: dispatchLead.id,
      consultId: consultRow?.id,
      mirrorStatus: 'synced',
    });
  } catch (error) {
    console.error('[dispatch/leads] unexpected', error);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
