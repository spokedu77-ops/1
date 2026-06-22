export const MASTER_DATA_DELETE_CONFIRMATION = 'MASTER 데이터 삭제';

export type MasterDataDeletionStatus = 'error' | 'idle' | 'success' | 'submitting';

export function canSubmitMasterDataDeletion(
  confirmation: string,
  status: MasterDataDeletionStatus,
): boolean {
  return confirmation === MASTER_DATA_DELETE_CONFIRMATION && status !== 'submitting';
}
