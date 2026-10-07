import { getServiceSupabase } from '@/app/lib/server/adminAuth';

export const INSTITUTION_LAB_DESTINATION = '/spokedu-lab';

export type MasterAccountType = 'individual' | 'institution';

export type InstitutionAccountRow = {
  user_id: string;
  account_type: 'institution';
  login_id: string;
  organization_name: string;
};

type ServiceSupabase = ReturnType<typeof getServiceSupabase>;

export function normalizeInstitutionLoginId(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase('ko-KR') : '';
}

export async function getInstitutionAccountByLoginId(
  service: ServiceSupabase,
  loginId: string,
): Promise<{ row: InstitutionAccountRow | null; error: unknown | null }> {
  const normalized = normalizeInstitutionLoginId(loginId);
  if (!normalized) return { row: null, error: null };

  const { data, error } = await service
    .from('spokedu_master_profiles')
    .select('user_id,account_type,login_id,organization_name')
    .eq('account_type', 'institution')
    .eq('login_id_normalized', normalized)
    .maybeSingle();

  return {
    row: error ? null : data as InstitutionAccountRow | null,
    error,
  };
}

export async function getMasterAccountType(
  service: ServiceSupabase,
  userId: string,
): Promise<{ accountType: MasterAccountType; error: unknown | null }> {
  const { data, error } = await service
    .from('spokedu_master_profiles')
    .select('account_type')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { accountType: 'individual', error };
  return {
    accountType: data?.account_type === 'institution' ? 'institution' : 'individual',
    error: null,
  };
}
