/** Invariants: W = T − L, A = T − L − Q, Q ≤ W, L ≤ T */

export function deriveStockMetrics(total: number, quarantine: number, lent: number) {
  const t = Math.max(0, Math.floor(total));
  const q = Math.max(0, Math.floor(quarantine));
  const l = Math.max(0, Math.floor(lent));
  const w = t - l;
  const a = t - l - q;
  return { qty_on_hand_total: t, qty_quarantine: q, qty_lent: l, qty_warehouse: w, qty_available: a };
}

export function assertStockInvariants(total: number, quarantine: number, lent: number): boolean {
  const { qty_warehouse: w, qty_available: a } = deriveStockMetrics(total, quarantine, lent);
  return lent <= total && quarantine <= w && a >= 0;
}

export function canRent(available: number, qty: number): boolean {
  return qty > 0 && qty <= available;
}
