'use server';

import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { nextActionsUpdateSchema } from '@/app/lib/centers/schemas';
import type { Center } from '@/app/lib/centers/types';

export async function updateCenterNextActions(
  centerId: string,
  input: unknown
): Promise<{ data?: Center; error?: string }> {
  const parsed = nextActionsUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(', ') };
  }
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('centers')
    .update({ next_actions: parsed.data.next_actions })
    .eq('id', centerId)
    .select()
    .single();
  if (error) return { error: error.message };
  return { data: data as Center };
}
