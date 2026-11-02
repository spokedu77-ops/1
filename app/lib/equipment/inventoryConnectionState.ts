import type { EquipmentCapabilities } from '@/app/lib/equipment/capabilities';

export type EquipmentInventoryConnectionState =
  | 'LEGACY_READY'
  | 'MODE_MISMATCH'
  | 'SCHEMA_MISSING'
  | 'LEDGER_READY'
  | 'LOAD_ERROR';

export function resolveInventoryConnectionState(input: {
  capabilities: EquipmentCapabilities;
  dataSource: 'legacy' | 'ledger';
  loadFailed: boolean;
}): EquipmentInventoryConnectionState {
  if (input.loadFailed) return 'LOAD_ERROR';
  if (!input.capabilities.ledger_writes) return input.dataSource === 'legacy' ? 'LEGACY_READY' : 'MODE_MISMATCH';
  if (input.capabilities.ledger_schema_ready === false) return 'SCHEMA_MISSING';
  if (input.dataSource === 'ledger' && input.capabilities.ledger_schema_ready === true) {
    return 'LEDGER_READY';
  }
  return 'MODE_MISMATCH';
}

export const SCHEMA_MISSING_USER_MESSAGE =
  '수불 원장 데이터베이스가 아직 준비되지 않았습니다. 기존 교구 데이터는 보존되어 있으며 신규 재고 기능은 데이터베이스 전환 후 사용할 수 있습니다.';
