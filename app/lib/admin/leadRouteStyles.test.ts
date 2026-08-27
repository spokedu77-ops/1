import { describe, expect, it } from 'vitest';
import { LEAD_ROUTE_STYLES, leadRouteBadgeClass } from './leadRouteStyles';

describe('leadRouteStyles', () => {
  it('keeps distinct route badge classes for list/detail parity', () => {
    expect(leadRouteBadgeClass('private')).toContain('cyan');
    expect(leadRouteBadgeClass('dispatch')).toContain('violet');
    expect(leadRouteBadgeClass('curriculum')).toContain('amber');
    expect(leadRouteBadgeClass('other')).toContain('slate');
    expect(new Set(Object.values(LEAD_ROUTE_STYLES).map((s) => s.badge)).size).toBe(4);
  });
});
