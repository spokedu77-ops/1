import { describe, expect, it } from 'vitest';
import {
  MASTER_DATA_DELETE_CONFIRMATION,
  canSubmitMasterDataDeletion,
} from './masterDataDeletion';

describe('MASTER data deletion confirmation', () => {
  it('keeps deletion disabled before the exact confirmation phrase', () => {
    expect(canSubmitMasterDataDeletion('', 'idle')).toBe(false);
    expect(canSubmitMasterDataDeletion('master 데이터 삭제', 'idle')).toBe(false);
    expect(canSubmitMasterDataDeletion('MASTER 데이터 삭제 ', 'idle')).toBe(false);
  });

  it('allows deletion only for the exact phrase while not submitting', () => {
    expect(canSubmitMasterDataDeletion(MASTER_DATA_DELETE_CONFIRMATION, 'idle')).toBe(true);
    expect(canSubmitMasterDataDeletion(MASTER_DATA_DELETE_CONFIRMATION, 'error')).toBe(true);
    expect(canSubmitMasterDataDeletion(MASTER_DATA_DELETE_CONFIRMATION, 'success')).toBe(true);
  });

  it('prevents duplicate submission while deletion is in progress', () => {
    expect(canSubmitMasterDataDeletion(MASTER_DATA_DELETE_CONFIRMATION, 'submitting')).toBe(false);
  });
});
