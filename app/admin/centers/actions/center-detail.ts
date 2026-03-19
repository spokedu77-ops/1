'use server';

import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import type { Center } from '@/app/lib/centers/types';

export async function getCenterById(id: string): Promise<Center | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('centers')
    .select('*, main_teacher:main_teacher_id(id, name)')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  const { main_teacher, ...row } = data as Center & { main_teacher?: { id: string; name: string } | null };
  return {
    ...row,
    main_teacher_name: main_teacher?.name ?? null,
  };
}
