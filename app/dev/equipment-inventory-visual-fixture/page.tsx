import { notFound } from 'next/navigation';
import {
  EquipmentInventoryVisualFixture,
  type VisualFixtureScenario,
} from '@/app/admin/inventory/EquipmentInventoryVisualFixture';

const SCENARIOS = new Set<VisualFixtureScenario>(['normal', 'opening', 'drift', 'empty', 'mismatch', 'modals']);

export default async function EquipmentInventoryVisualFixturePage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  if (process.env.NODE_ENV === 'production' || process.env.EQUIPMENT_INVENTORY_VISUAL_FIXTURE !== '1') {
    notFound();
  }
  const sp = await searchParams;
  const raw = sp.scenario ?? 'normal';
  const scenario = SCENARIOS.has(raw as VisualFixtureScenario) ? (raw as VisualFixtureScenario) : 'normal';
  return <EquipmentInventoryVisualFixture scenario={scenario} />;
}
