-- CRM SoT: consultations is the inbox source of truth.
-- dispatch_leads remains the structured detail store for institutional inquiries.
-- New writes set mirror_consult_id = consultations.id (CRM → detail link).
-- Legacy rows may still have consultations.source_lead_id → dispatch_leads.id.

comment on column public.dispatch_leads.mirror_status is
  'CRM link status: synced = detail linked to consultations; detail_failed = CRM saved but detail insert failed; legacy pending/failed may exist';

comment on column public.dispatch_leads.mirror_consult_id is
  'consultations.id — CRM Source of Truth id for this institutional detail row';
