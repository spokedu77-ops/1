// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import MoneyInput from './SettlementMoneyInput';
import { formatMoneyExpression, formatSettlementAmount } from './settlementMoney';

describe('settlement money presentation', () => {
  it.each([
    ['150000+45000', '195,000원'], ['170000', '170,000원'],
    ['40000+55000', '95,000원'], ['0', '0원'], ['', '—'], ['bad', '계산식 확인 필요'],
  ])('shows a computed amount for %s', (source, expected) => {
    expect(formatSettlementAmount(source, 4)).toBe(expected);
  });

  it('groups literals without destroying editable expressions or decimals', () => {
    expect(formatMoneyExpression('40000+55000')).toBe('40,000+55,000');
    expect(formatMoneyExpression('-1234567.50')).toBe('-1,234,567.50');
    expect(formatMoneyExpression('5000*회기')).toBe('5,000*회기');
  });

  it('formats an uncontrolled policy input and passes only ungrouped values to persistence', async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const node = document.createElement('div'); document.body.append(node);
    const root = createRoot(node); const changed = vi.fn();
    try {
      await act(async () => root.render(createElement(MoneyInput, { defaultValue: '150000', onChange: (event) => changed(event.target.value) })));
      const input = node.querySelector('input')!;
      expect(input.value).toBe('150,000');
      await act(async () => input.focus()); expect(input.value).toBe('150,000');
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '170,000');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      expect(changed).toHaveBeenLastCalledWith('170000');
      await act(async () => input.blur()); expect(input.value).toBe('170,000');
      await act(async () => {
        input.focus();
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '40,000+55,000');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      expect(changed).toHaveBeenLastCalledWith('40000+55000');
      expect(input.value).toBe('40,000+55,000');
    } finally { await act(async () => root.unmount()); node.remove(); }
  });
});
