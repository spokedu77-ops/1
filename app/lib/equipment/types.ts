export type EquipmentStockRow = {
  catalog_id: number;
  name: string;
  category: string | null;
  mgmt_code: string | null;
  image: string | null;
  simple_desc: string | null;
  key_points: string | null;
  usage_examples: string | null;
  qty_on_hand_total: number;
  qty_quarantine: number;
  qty_lent: number;
  qty_warehouse: number;
  qty_available: number;
};

export type EquipmentRentalRow = {
  rental_id: string;
  catalog_id: number;
  teacher_id: string;
  teacher_name?: string | null;
  catalog_name?: string | null;
  qty_lent: number;
  qty_returned: number;
  qty_outstanding: number;
  status: 'active' | 'closed';
  opened_at: string;
  closed_at: string | null;
};

export type EquipmentLedgerRow = {
  ledger_id: string;
  event_type: string;
  catalog_id: number;
  catalog_name?: string | null;
  teacher_id: string | null;
  teacher_name?: string | null;
  rental_id: string | null;
  qty: number;
  note: string | null;
  occurred_at: string;
  metadata: Record<string, unknown>;
};

export type TeacherHoldingRow = {
  teacher_id: string;
  teacher_name: string | null;
  catalog_id: number;
  name: string;
  mgmt_code: string | null;
  qty_held: number;
  active_rental_lines: number;
  earliest_opened_at: string | null;
};
