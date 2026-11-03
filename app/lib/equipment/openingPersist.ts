import { isLedgerWriteMode } from '@/app/lib/equipment/writeMode';

/** When false, opening UI validates only; POST /api/admin/equipment/opening returns 403. */
export function isEquipmentOpeningPersistEnabled(): boolean {
  if (process.env.EQUIPMENT_OPENING_PERSIST_ENABLED === '1') return true;
  // 로컬 ledger 개발: .env 누락 시에도 재고 확정·입력이 동작하도록 허용 (운영은 명시적 =1 필요)
  if (process.env.NODE_ENV === 'development' && isLedgerWriteMode()) return true;
  return false;
}
