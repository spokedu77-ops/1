import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import {
  buildEnvelopeOrThrow,
  createConsultLead,
  isConsultSchemaCompatibilityError,
  LeadEnvelopeValidationError,
  parseAcquisitionFromBody,
} from '@/app/lib/server/leadEnvelope';
import { parseConversionEvidenceSlug } from '@/app/spokedu/data/commercial-routes';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

/**
 * 기관 문의: consultations = CRM SoT, dispatch_leads = 상세 부가 저장.
 * consultations 실패 시 요청 실패. 상세 실패 시에도 CRM에는 노출.
 */
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
      parseConversionEvidenceSlug(
        typeof body.conversion_evidence_slug === 'string' ? body.conversion_evidence_slug : '',
      ) ?? undefined;
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
        conversionEvidenceSlug,
        ctaIntentId,
      });
    } catch (e) {
      if (e instanceof LeadEnvelopeValidationError) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
      }
      throw e;
    }

    const consultContent = [
      '[기관 맞춤 제안서 요청]',
      `[lead_route] dispatch`,
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
      '',
      '[희망 수업 내용/방향성]',
      inquiry || '-',
      '',
      `유입 경로: ${source || '-'}`,
    ].join('\n');

    const supabase = getServiceSupabase();
    const parentName = `${organization} / ${manager}`;

    // 짧은 시간 동일 기관·연락처·핵심 payload 중복 제출 방지 (더블클릭/재전송)
    {
      const dedupeSince = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      let dedupeQuery = supabase
        .from('consultations')
        .select('id, source_lead_id, content')
        .eq('consult_type', 'center')
        .eq('parent_name', parentName)
        .gte('created_at', dedupeSince)
        .order('created_at', { ascending: false })
        .limit(8);

      if (phone) {
        dedupeQuery = dedupeQuery.eq('phone', phone);
      }

      const progMarker = `희망 프로그램: ${programs.length ? programs.join(', ') : '-'}`;
      const locMarker = `기관 소재지: ${location || '-'}`;
      const inquiryMarker = (inquiry || '-').slice(0, 80);

      const { data: recent } = await dedupeQuery;
      const duplicate = (recent ?? []).find((row) => {
        const c = typeof row.content === 'string' ? row.content : '';
        if (!c.includes(progMarker) || !c.includes(locMarker)) return false;
        if (inquiryMarker !== '-' && !c.includes(inquiryMarker)) return false;
        if (phone) return true;
        if (email) return c.includes(`이메일: ${email}`);
        return false;
      });

      if (duplicate?.id) {
        return NextResponse.json({
          ok: true,
          duplicate: true,
          consultId: duplicate.id,
          leadId: duplicate.id,
          detailId: duplicate.source_lead_id ?? null,
          detailStatus: duplicate.source_lead_id ? 'synced' : 'detail_failed',
          mirrorStatus: duplicate.source_lead_id ? 'synced' : 'detail_failed',
        });
      }
    }

    // 1) CRM SoT — consultations 먼저
    const created = await createConsultLead(supabase, {
      envelope,
      parentName,
      phone: phone || null,
      content: consultContent,
      consultType: 'center',
    });

    if (!created.ok) {
      return NextResponse.json({ ok: false, error: '접수 저장 중 오류가 발생했습니다.' }, { status: 500 });
    }

    const consultId = created.id;

    // 2) 기관 상세 — 실패해도 CRM 문의는 유지
    let detailId: string | null = null;
    let detailStatus: 'synced' | 'detail_failed' = 'synced';

    const detailPayload = {
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
      mirror_status: 'synced' as const,
      mirror_consult_id: consultId,
      mirror_error: null as string | null,
    };

    {
      const primary = await supabase.from('dispatch_leads').insert(detailPayload).select('id').single();

      if (!primary.error && primary.data?.id) {
        detailId = primary.data.id;
      } else if (isConsultSchemaCompatibilityError(primary.error)) {
        // mirror_* 컬럼 없는 레거시: 최소 컬럼으로 재시도
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
          console.error('[dispatch/leads] detail insert failed after CRM save', primary.error ?? fallback.error);
          detailStatus = 'detail_failed';
        } else {
          detailId = fallback.data.id;
        }
      } else {
        console.error('[dispatch/leads] detail insert failed after CRM save', primary.error);
        detailStatus = 'detail_failed';
      }
    }

    // 3) CRM ↔ 상세 연결 (source_lead_id). 실패해도 CRM 행은 유효.
    if (detailId) {
      const link = await supabase
        .from('consultations')
        .update({ source_lead_id: detailId })
        .eq('id', consultId);
      if (link.error) {
        console.warn('[dispatch/leads] source_lead_id link failed', link.error);
      }

      // content에 detail id 보강 (운영 확인용, 실패 무시)
      await supabase
        .from('consultations')
        .update({
          content: `${consultContent}\nsource_lead_id: ${detailId}\n`,
        })
        .eq('id', consultId);
    } else {
      await supabase
        .from('consultations')
        .update({
          content: `${consultContent}\n[detail_status] detail_failed\n`,
        })
        .eq('id', consultId);
    }

    return NextResponse.json({
      ok: true,
      consultId,
      leadId: consultId,
      detailId,
      detailStatus,
      /** @deprecated 레거시 클라이언트 호환 — CRM id */
      mirrorStatus: detailStatus === 'synced' ? 'synced' : 'detail_failed',
    });
  } catch (error) {
    console.error('[dispatch/leads] unexpected', error);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
