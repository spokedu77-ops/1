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

export function consultInsertFromEnvelope(args: {
  envelope: LeadEnvelope;
  parentName: string;
  phone: string | null;
  childAge?: string | null;
  content: string;
  consultType: 'tutoring' | 'center';
  sourceLeadId?: string | null;
}) {
  const cols = deriveConsultColumns(args.envelope);
  return {
    parent_name: args.parentName,
    phone: args.phone,
    child_age: args.childAge ?? null,
    content: args.content,
    consult_type: args.consultType,
    status: 'pending' as const,
    lead_route: cols.lead_route,
    curriculum_mode: cols.curriculum_mode,
    private_start_direction: cols.private_start_direction,
    private_preferred_format: cols.private_preferred_format,
    conversion_evidence_slug: cols.conversion_evidence_slug,
    lead_context: cols.lead_context,
    source_lead_id: args.sourceLeadId ?? null,
  };
}
