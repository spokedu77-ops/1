import { describe, expect, it } from 'vitest';
import { mapEquipmentRpcError } from '@/app/lib/equipment/rpcMap';

describe('mapEquipmentRpcError', () => {
  it('maps insufficient available to 409', () => {
    const m = mapEquipmentRpcError('EQUIPMENT_INSUFFICIENT_AVAILABLE');
    expect(m.status).toBe(409);
    expect(m.code).toBe('INSUFFICIENT_AVAILABLE');
  });

  it('maps return exceeds', () => {
    const m = mapEquipmentRpcError('RETURN_EXCEEDS_OUTSTANDING');
    expect(m.code).toBe('RETURN_EXCEEDS_OUTSTANDING');
  });
});
