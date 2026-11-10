import { resolvePlannedTotal } from '@/app/admin/classes-shared/lib/plannedRoundTotal';

export interface PrivateScheduleGroup {
  id: string;
  title: string;
  firstDate: string;
  lastDate: string;
  completed: number;
  deducted: number;
  total: number;
  upcomingSlots: { day: number; time: string; startAt: string }[];
}

export interface ScheduleBalanceRow {
  id: string;
  group_id: string | null;
  title: string | null;
  start_at: string;
  end_at?: string | null;
  status: string | null;
  round_total?: number | null;
  round_index?: number | null;
}
const businessDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' });
const businessTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' });

/** Explicit calendar states only. A past date alone is never proof of consumption. */
export function summarizePrivateScheduleGroups(rows: ScheduleBalanceRow[], now = new Date()): PrivateScheduleGroup[] {
  const groups = new Map<string, PrivateScheduleGroup>();
  const seen = new Set<string>();
  const groupRows = new Map<string, ScheduleBalanceRow[]>();
  for (const row of rows) {
    if (seen.has(row.id) || row.status === 'deleted') continue;
    seen.add(row.id);
    const id = row.group_id ?? row.id;
    const date = businessDate.format(new Date(row.start_at));
    const group = groups.get(id) ?? { id, title: row.title || '이름 없는 수업', firstDate: date, lastDate: date, completed: 0, deducted: 0, total: 0, upcomingSlots: [] };
    const items = groupRows.get(id) ?? [];
    items.push(row);
    groupRows.set(id, items);
    if (date < group.firstDate) group.firstDate = date;
    if (date > group.lastDate) group.lastDate = date;
    if (row.status === 'finished' || row.status === 'verified') group.completed++;
    if (row.status === 'cancelled') group.deducted++;
    const pending = row.status == null || ['opened', 'scheduled', 'pending'].includes(row.status);
    const ongoing = row.end_at ? new Date(row.end_at).getTime() > now.getTime() : date >= businessDate.format(now);
    if (pending && ongoing) {
      const day = new Date(`${date}T12:00:00Z`).getUTCDay();
      const time = businessTime.format(new Date(row.start_at));
      if (!group.upcomingSlots.some(slot => slot.day === day && slot.time === time)) {
        group.upcomingSlots.push({ day, time, startAt: row.start_at });
      }
    }
    groups.set(id, group);
  }
  return [...groups.values()].map(group => ({ ...group, total: resolvePlannedTotal(groupRows.get(group.id) ?? []) }))
    .sort((a, b) => a.title.localeCompare(b.title, 'ko') || b.firstDate.localeCompare(a.firstDate));
}

/** Calendar source: use the linked contract totals; never add manual-log consumption. */
export function getScheduleBalance(groupIds: string[], groups: PrivateScheduleGroup[]) {
  const ids = new Set(groupIds);
  const linked = groups.filter(group => ids.has(group.id));
  const completed = linked.reduce((sum, group) => sum + group.completed, 0);
  const deducted = linked.reduce((sum, group) => sum + group.deducted, 0);
  const total = linked.reduce((sum, group) => sum + group.total, 0);
  return { total, completed, deducted, used: completed + deducted, remain: total - completed - deducted, missing: ids.size !== linked.length || !Number.isFinite(total) };
}
