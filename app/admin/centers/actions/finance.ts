'use server';

import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { centerFinanceTermsSchema } from '@/app/lib/centers/schemas';
import type { CenterFinanceTerms } from '@/app/lib/centers/types';

export async function getFinanceTerms(centerId: string): Promise<CenterFinanceTerms | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('center_finance_terms')
    .select('*')
    .eq('center_id', centerId)
    .maybeSingle();
  if (error) throw error;
  return data as CenterFinanceTerms | null;
}

export async function upsertFinanceTerms(
  centerId: string,
  input: unknown
): Promise<{ data?: CenterFinanceTerms; error?: string }> {
  const parsed = centerFinanceTermsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(', ') };
  }
  const supabase = await createServerSupabaseClient();
  const payload = {
    center_id: centerId,
    unit_price: parsed.data.unit_price ?? null,
    payment_day: parsed.data.payment_day ?? null,
    invoice_required: parsed.data.invoice_required ?? false,
    doc_checklist: parsed.data.doc_checklist ?? [],
    special_terms: parsed.data.special_terms ?? null,
  };
  const { data, error } = await supabase
    .from('center_finance_terms')
    .upsert(payload, { onConflict: 'center_id' })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data: data as CenterFinanceTerms };
}
