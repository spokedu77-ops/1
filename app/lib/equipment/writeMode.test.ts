import { describe, expect, it, afterEach } from 'vitest';
import { getEquipmentWriteMode, isLedgerWriteMode } from './writeMode';

describe('equipment writeMode', () => {
  const prev = process.env.EQUIPMENT_WRITE_MODE;

  afterEach(() => {
    if (prev === undefined) delete process.env.EQUIPMENT_WRITE_MODE;
    else process.env.EQUIPMENT_WRITE_MODE = prev;
  });

  it('defaults to legacy when env is unset', () => {
    delete process.env.EQUIPMENT_WRITE_MODE;
    expect(getEquipmentWriteMode()).toBe('legacy');
    expect(isLedgerWriteMode()).toBe(false);
  });

  it('activates ledger only with explicit EQUIPMENT_WRITE_MODE=ledger', () => {
    process.env.EQUIPMENT_WRITE_MODE = 'ledger';
    expect(getEquipmentWriteMode()).toBe('ledger');
    expect(isLedgerWriteMode()).toBe(true);
  });

  it('treats unknown values as legacy', () => {
    process.env.EQUIPMENT_WRITE_MODE = 'on';
    expect(getEquipmentWriteMode()).toBe('legacy');
  });
});
