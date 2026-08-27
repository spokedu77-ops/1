import {
  buildLeadEnvelope,
  deriveConsultColumns,
  normalizeAcquisition,
  type AcquisitionContext,
  type LeadEnvelope,
  type LeadEnvelopeInput,
} from '@/app/spokedu/data/lead-envelope';

export function parseAcquisitionFromBody(raw: unknown): AcquisitionContext {
  return normalizeAcquisition(raw);
}

export function buildEnvelopeOrThrow(input: LeadEnvelopeInput): LeadEnvelope {
  const built = buildLeadEnvelope(input);
  if (!built.ok) {
    throw new LeadEnvelopeValidationError(built.message);
  }
  return built.envelope;
}

export class LeadEnvelopeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LeadEnvelopeValidationError';
  }
}

export type ConsultInsertRow = {
  parent_name: string;
  phone: string | null;
  child_age: string | null;
  content: string;
  consult_type: 'tutoring' | 'center';
  status: 'pending';
  lead_route: string;
  curriculum_mode: string | null;
  private_start_direction: string | null;
  private_preferred_format: string | null;
  conversion_evidence_slug: string | null;
  lead_context: LeadEnvelope;
  source_lead_id: string | null;
};

export function consultInsertFromEnvelope(args: {
  envelope: LeadEnvelope;
  parentName: string;
  phone: string | null;
  childAge?: string | null;
  content: string;
  consultType: 'tutoring' | 'center';
  sourceLeadId?: string | null;
}): ConsultInsertRow {
  const cols = deriveConsultColumns(args.envelope);
  return {
    parent_name: args.parentName,
    phone: args.phone,
    child_age: args.childAge ?? null,
    content: args.content,
    consult_type: args.consultType,
    status: 'pending',
    lead_route: cols.lead_route,
    curriculum_mode: cols.curriculum_mode,
    private_start_direction: cols.private_start_direction,
    private_preferred_format: cols.private_preferred_format,
    conversion_evidence_slug: cols.conversion_evidence_slug,
    lead_context: cols.lead_context,
    source_lead_id: args.sourceLeadId ?? null,
  };
}

type ServiceSupabase = ReturnType<typeof import('@/app/lib/server/adminAuth').getServiceSupabase>;

export type CreateConsultLeadResult =
  | { ok: true; id: string; structured: boolean }
  | { ok: false; error: string };

/**
 * CRM Source of Truth — consultations 단일 저장.
 * 구조화 컬럼 미적용 DB에서는 legacy 컬럼만으로 fallback.
 */
export async function createConsultLead(
  supabase: ServiceSupabase,
  args: {
    envelope: LeadEnvelope;
    parentName: string;
    phone: string | null;
    childAge?: string | null;
    content: string;
    consultType: 'tutoring' | 'center';
    sourceLeadId?: string | null;
    tableName?: string;
  },
): Promise<CreateConsultLeadResult> {
  const tableName = args.tableName?.trim() || 'consultations';
  const insertRow = consultInsertFromEnvelope(args);

  const primary = await supabase.from(tableName).insert(insertRow).select('id').single();
  if (!primary.error && primary.data?.id) {
    return { ok: true, id: primary.data.id, structured: true };
  }

  console.error('[createConsultLead] structured insert failed', primary.error);
  const fallback = await supabase
    .from(tableName)
    .insert({
      parent_name: args.parentName,
      phone: args.phone,
      child_age: args.childAge ?? null,
      content: args.content,
      consult_type: args.consultType,
      status: 'pending',
    })
    .select('id')
    .single();

  if (fallback.error || !fallback.data?.id) {
    console.error('[createConsultLead] legacy insert failed', fallback.error);
    return {
      ok: false,
      error: fallback.error?.message ?? primary.error?.message ?? 'DB 저장에 실패했습니다.',
    };
  }

  return { ok: true, id: fallback.data.id, structured: false };
}
