'use server';

import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import type { CenterWithRelations, Center, CenterFinanceTerms, Program, CenterLog, CenterFile } from '@/app/lib/centers/types';

export async function getCenterWithRelations(id: string): Promise<CenterWithRelations | null> {
  const supabase = await createServerSupabaseClient();

  const { data: center, error: centerError } = await supabase
    .from('centers')
    .select('*')
    .eq('id', id)
    .single();
  if (centerError || !center) {
    if (centerError?.code === 'PGRST116') return null;
    throw centerError;
  }

  const [financeRes, programsRes, logsRes, filesRes] = await Promise.all([
    supabase.from('center_finance_terms').select('*').eq('center_id', id).maybeSingle(),
    supabase.from('programs').select('*').eq('center_id', id).order('start_date', { ascending: false }),
    supabase.from('center_logs').select('*').eq('center_id', id).order('log_date', { ascending: false }),
    supabase.from('center_files').select('*').eq('center_id', id).order('created_at', { ascending: false }),
  ]);

  return {
    ...(center as Center),
    finance_terms: (financeRes.data as CenterFinanceTerms | null) ?? null,
    programs: (programsRes.data ?? []) as Program[],
    logs: (logsRes.data ?? []) as CenterLog[],
    files: (filesRes.data ?? []) as CenterFile[],
  };
}
