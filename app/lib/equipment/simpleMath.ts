export type SimpleMove = {
  id: string;
  catalog_id: number;
  teacher_id: string;
  kind: 'RENT' | 'RETURN';
  qty: number;
  rent_id: string | null;
  move_date: string;
  created_at: string;
};

export type SimpleRental = {
  id: string;
  catalog_id: number;
  teacher_id: string;
  qty: number;
  remaining: number;
  move_date: string;
};

export function getSimpleRentals(moves: SimpleMove[]): SimpleRental[] {
  const returned = new Map<string, number>();
  for (const move of moves) {
    if (move.kind === 'RETURN' && move.rent_id) {
      returned.set(move.rent_id, (returned.get(move.rent_id) ?? 0) + move.qty);
    }
  }
  return moves.filter((m) => m.kind === 'RENT').map((m) => ({
    id: m.id, catalog_id: m.catalog_id, teacher_id: m.teacher_id,
    qty: m.qty, remaining: m.qty - (returned.get(m.id) ?? 0), move_date: m.move_date,
  }));
}

export function getSimpleStockTotals(catalogId: number, total: number | null, rentals: SimpleRental[]) {
  if (total === null) return { lent: null, available: null };
  const lent = rentals
    .filter((r) => r.catalog_id === catalogId)
    .reduce((sum, r) => sum + r.remaining, 0);
  return { lent, available: total - lent };
}
