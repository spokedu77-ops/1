import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchEquipmentLegacyImportStatus,
  fetchLegacyCatalog,
  fetchLegacyInventory,
  type EquipmentLegacyImportStatus,
} from '@/app/lib/equipment/legacyReads';
import { getPrivateSchemaServiceSupabase } from '@/app/lib/equipment/privateSupabase';
import { isEquipmentLegacyStagingEnabled } from '@/app/lib/equipment/legacyStaging';
import { isEquipmentOpeningPersistEnabled } from '@/app/lib/equipment/openingPersist';

export type LegacyImportReason =
  | 'CATALOG_UNMAPPED'
  | 'CATALOG_AMBIGUOUS'
  | 'OWNER_NOT_FOUND'
  | 'ZERO_QUANTITY'
  | 'TEACHER_INVENTORY_MISMATCH';

export type LegacyImportPlanRow = {
  inventory_id: number;
  owner_id: string;
  source_name: string;
  source_quantity: number;
  source_hash: string;
  catalog_id: number | null;
  resolution: 'mapped' | 'pending';
  reason: LegacyImportReason | null;
};

export type LegacyImportPlan = {
  inventory_rows: number;
  mapped_rows: number;
  pending_rows: number;
  catalog_unmapped_rows: number;
  teacher_inventory_rows: number;
  teacher_inventory_flags: { user_id: string; name: string; count: number; note: string }[];
  rows: LegacyImportPlanRow[];
  catalog_aggregates: Map<number, { legacy_qty_held: number; legacy_mapping_pending: boolean }>;
  pending_items: { inventory_id: number; name: string; quantity: number; reason: string }[];
};

export type LegacyImportSyncResult = {
  plan: LegacyImportPlan;
  persisted: boolean;
  staging_skipped_reason?: string;
};

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function inventoryHash(row: { id: number; user_id: string; name: string; quantity: number }): string {
  return createHash('md5').update(JSON.stringify(row)).digest('hex');
}

export async function buildLegacyImportPlan(service: SupabaseClient): Promise<LegacyImportPlan> {
  const [inventory, catalog, teachersRes, tiRes] = await Promise.all([
    fetchLegacyInventory(service),
    fetchLegacyCatalog(service),
    service.from('users').select('id').eq('role', 'teacher').eq('is_admin', false).eq('is_active', true),
    service.from('teacher_inventory').select('user_id, name, count'),
  ]);
  if (teachersRes.error) throw teachersRes.error;

  const teacherIds = new Set((teachersRes.data ?? []).map((t) => String(t.id)));
  const nameToCatalog = new Map<string, number[]>();
  for (const c of catalog) {
    const key = normalizeName(c.name);
    const list = nameToCatalog.get(key) ?? [];
    list.push(c.catalog_id);
    nameToCatalog.set(key, list);
  }

  const inventoryByUserName = new Map<string, number>();
  for (const inv of inventory) {
    const key = `${inv.user_id}::${normalizeName(inv.name)}`;
    inventoryByUserName.set(key, (inventoryByUserName.get(key) ?? 0) + (Number(inv.quantity) || 0));
  }

  const tiFlags: LegacyImportPlan['teacher_inventory_flags'] = [];
  for (const ti of tiRes.data ?? []) {
    const uid = String(ti.user_id);
    const name = normalizeName(String(ti.name ?? ''));
    const tiQty = Number(ti.count) || 0;
    const invQty = inventoryByUserName.get(`${uid}::${name}`);
    if (!teacherIds.has(uid)) {
      tiFlags.push({ user_id: uid, name, count: tiQty, note: 'teacher_inventory: 강사 아님 또는 비활성 계정' });
    } else if (invQty === undefined) {
      tiFlags.push({ user_id: uid, name, count: tiQty, note: 'teacher_inventory: inventory에 대응 행 없음' });
    } else if (invQty !== tiQty) {
      tiFlags.push({
        user_id: uid,
        name,
        count: tiQty,
        note: `teacher_inventory: inventory 수량(${invQty})과 불일치`,
      });
    }
  }

  const rows: LegacyImportPlanRow[] = [];
  let catalogUnmapped = 0;

  for (const inv of inventory) {
    const qty = Number(inv.quantity) || 0;
    const key = normalizeName(inv.name);
    const matches = nameToCatalog.get(key) ?? [];
    const hash = inventoryHash({ id: inv.id, user_id: inv.user_id, name: inv.name, quantity: qty });

    if (qty <= 0) {
      rows.push({
        inventory_id: inv.id,
        owner_id: inv.user_id,
        source_name: inv.name,
        source_quantity: qty,
        source_hash: hash,
        catalog_id: matches.length === 1 ? matches[0] : null,
        resolution: 'pending',
        reason: 'ZERO_QUANTITY',
      });
      continue;
    }

    if (matches.length === 0) {
      catalogUnmapped += 1;
      rows.push({
        inventory_id: inv.id,
        owner_id: inv.user_id,
        source_name: inv.name,
        source_quantity: qty,
        source_hash: hash,
        catalog_id: null,
        resolution: 'pending',
        reason: 'CATALOG_UNMAPPED',
      });
      continue;
    }
    if (matches.length > 1) {
      rows.push({
        inventory_id: inv.id,
        owner_id: inv.user_id,
        source_name: inv.name,
        source_quantity: qty,
        source_hash: hash,
        catalog_id: null,
        resolution: 'pending',
        reason: 'CATALOG_AMBIGUOUS',
      });
      continue;
    }
    if (!teacherIds.has(inv.user_id)) {
      rows.push({
        inventory_id: inv.id,
        owner_id: inv.user_id,
        source_name: inv.name,
        source_quantity: qty,
        source_hash: hash,
        catalog_id: matches[0],
        resolution: 'pending',
        reason: 'OWNER_NOT_FOUND',
      });
      continue;
    }

    const tiFlag = tiFlags.find((f) => f.user_id === inv.user_id && normalizeName(f.name) === key);
    if (tiFlag) {
      rows.push({
        inventory_id: inv.id,
        owner_id: inv.user_id,
        source_name: inv.name,
        source_quantity: qty,
        source_hash: hash,
        catalog_id: matches[0],
        resolution: 'pending',
        reason: 'TEACHER_INVENTORY_MISMATCH',
      });
      continue;
    }

    rows.push({
      inventory_id: inv.id,
      owner_id: inv.user_id,
      source_name: inv.name,
      source_quantity: qty,
      source_hash: hash,
      catalog_id: matches[0],
      resolution: 'mapped',
      reason: null,
    });
  }

  const catalogAggregates = new Map<number, { legacy_qty_held: number; legacy_mapping_pending: boolean }>();
  for (const c of catalog) {
    catalogAggregates.set(c.catalog_id, { legacy_qty_held: 0, legacy_mapping_pending: false });
  }
  for (const row of rows) {
    if (row.resolution === 'mapped' && row.catalog_id != null) {
      const cur = catalogAggregates.get(row.catalog_id)!;
      cur.legacy_qty_held += row.source_quantity;
    }
    if (row.resolution === 'pending' && row.catalog_id != null) {
      const cur = catalogAggregates.get(row.catalog_id)!;
      cur.legacy_mapping_pending = true;
    }
    if (row.resolution === 'pending' && row.reason === 'CATALOG_UNMAPPED') {
      // no catalog_id
    }
  }

  const pending_items = rows
    .filter((r) => r.resolution === 'pending' && r.reason !== 'ZERO_QUANTITY')
    .map((r) => ({
      inventory_id: r.inventory_id,
      name: r.source_name,
      quantity: r.source_quantity,
      reason: r.reason ?? 'PENDING',
    }));

  const mapped_rows = rows.filter((r) => r.resolution === 'mapped').length;
  const pending_rows = rows.filter((r) => r.resolution === 'pending' && r.reason !== 'ZERO_QUANTITY').length;

  return {
    inventory_rows: inventory.length,
    mapped_rows,
    pending_rows,
    catalog_unmapped_rows: catalogUnmapped,
    teacher_inventory_rows: (tiRes.data ?? []).length,
    teacher_inventory_flags: tiFlags,
    rows,
    catalog_aggregates: catalogAggregates,
    pending_items,
  };
}

export function applyPlanToLegacyImportStatus(
  dbStatus: EquipmentLegacyImportStatus,
  plan: LegacyImportPlan,
): EquipmentLegacyImportStatus {
  const hasDbStaging = dbStatus.staged_rows > 0;
  if (hasDbStaging) return dbStatus;

  const catalogs = [...plan.catalog_aggregates.entries()].map(([catalog_id, v]) => ({
    catalog_id,
    legacy_qty_held: v.legacy_qty_held,
    legacy_mapping_pending: v.legacy_mapping_pending,
  }));

  const unmigrated = plan.rows
    .filter((r) => r.resolution === 'pending' && r.reason !== 'ZERO_QUANTITY')
    .map((r) => ({
      id: r.inventory_id,
      user_id: r.owner_id,
      name: r.source_name,
      quantity: r.source_quantity,
    }));

  return {
    ...dbStatus,
    staged_rows: plan.inventory_rows,
    pending_rows: plan.pending_rows,
    imported_rows: dbStatus.imported_rows,
    pending_items: plan.pending_items.map((p) => ({
      inventory_id: p.inventory_id,
      name: p.name,
      quantity: p.quantity,
      reason: p.reason,
    })),
    catalogs,
    unmigrated_items: unmigrated,
  };
}

async function persistLegacyImportPlan(plan: LegacyImportPlan): Promise<void> {
  const privateDb = getPrivateSchemaServiceSupabase();
  const { data: imported, error: impErr } = await privateDb
    .from('equipment_legacy_import_rows')
    .select('inventory_id')
    .not('imported_rental_id', 'is', null);
  if (impErr) throw impErr;
  const locked = new Set((imported ?? []).map((r) => Number(r.inventory_id)));

  const { error: delErr } = await privateDb
    .from('equipment_legacy_import_rows')
    .delete()
    .is('imported_rental_id', null);
  if (delErr) throw delErr;

  const payload = plan.rows
    .filter((r) => !locked.has(r.inventory_id))
    .map((r) => ({
      inventory_id: r.inventory_id,
      catalog_id: r.catalog_id,
      owner_id: r.owner_id,
      source_name: r.source_name,
      source_quantity: r.source_quantity,
      source_hash: r.source_hash,
      resolution: r.resolution,
      reason: r.reason,
    }));

  if (payload.length === 0) return;
  const { error: insErr } = await privateDb.from('equipment_legacy_import_rows').insert(payload);
  if (insErr) throw insErr;
}

export async function ensureLegacyImportSnapshot(service: SupabaseClient): Promise<LegacyImportSyncResult> {
  const plan = await buildLegacyImportPlan(service);
  if (!isEquipmentLegacyStagingEnabled() && !isEquipmentOpeningPersistEnabled()) {
    return { plan, persisted: false, staging_skipped_reason: 'staging flags not set' };
  }
  const status = await fetchEquipmentLegacyImportStatus(service).catch(() => null);
  if (status && status.staged_rows > 0 && status.staged_rows >= plan.inventory_rows) {
    return { plan, persisted: false, staging_skipped_reason: 'already_staged' };
  }
  await persistLegacyImportPlan(plan);
  return { plan, persisted: true };
}

export function teacherPendingLegacyItems(plan: LegacyImportPlan, teacherId: string) {
  return plan.rows
    .filter((r) => r.owner_id === teacherId && r.resolution === 'pending' && r.reason !== 'ZERO_QUANTITY')
    .map((r) => ({
      id: r.inventory_id,
      user_id: r.owner_id,
      name: r.source_name,
      quantity: r.source_quantity,
    }));
}

export function teacherMappedLegacyPreview(plan: LegacyImportPlan, teacherId: string, catalogNames: Map<number, string>) {
  const byCatalog = new Map<number, number>();
  for (const r of plan.rows) {
    if (r.owner_id !== teacherId || r.resolution !== 'mapped' || r.catalog_id == null) continue;
    byCatalog.set(r.catalog_id, (byCatalog.get(r.catalog_id) ?? 0) + r.source_quantity);
  }
  return [...byCatalog.entries()].map(([catalog_id, quantity]) => ({
    catalog_id,
    name: catalogNames.get(catalog_id) ?? '—',
    quantity,
  }));
}
