import type { WorkEvent, WorkStatus } from '@/app/lib/admin/updateLog/contract';

export type TimelineWork = { key: string; project: string; latest: WorkEvent; history: WorkEvent[] };
export type StatusFilter = '' | 'in_progress' | 'reported' | 'verified' | 'attention';
export function needsAttention(status: WorkStatus) {
  return status === 'proposed' || status === 'reported' || status === 'blocked';
}
// Preserve PostgreSQL microsecond ordering when JS millisecond timestamps tie.
export function compareTimelineEvents(a: WorkEvent, b: WorkEvent) {
  const micros = (value: string) => Number((value.match(/\.(\d+)/)?.[1] ?? '').padEnd(6, '0').slice(3, 6));
  return Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || micros(a.occurredAt) - micros(b.occurredAt) || a.id.localeCompare(b.id);
}
export function collectTimeline(events: WorkEvent[]): TimelineWork[] {
  const groups = new Map<string, WorkEvent[]>();
  const seen = new Set<string>();
  for (const event of events) {
    const key = JSON.stringify([event.project, event.workKey]);
    const identity = JSON.stringify([key, event.id]);
    if (seen.has(identity)) continue;
    seen.add(identity);
    const history = groups.get(key) ?? [];
    history.push(event);
    groups.set(key, history);
  }
  return [...groups].map(([key, history]) => {
    history.sort(compareTimelineEvents);
    return { key, project: history[0].project, latest: history[history.length - 1], history };
  }).sort((a, b) => compareTimelineEvents(b.latest, a.latest) || a.key.localeCompare(b.key));
}
export function timelineStats(works: TimelineWork[]) {
  return { total: works.length, inProgress: works.filter(work => work.latest.status === 'in_progress').length, attention: works.filter(work => needsAttention(work.latest.status)).length };
}
export function filterTimeline(works: TimelineWork[], project: string, status: StatusFilter, search: string) {
  const query = search.trim().normalize('NFKC').toLocaleLowerCase('ko');
  return works.filter(work => (!project || work.project === project)
    && (!status || (status === 'attention' ? needsAttention(work.latest.status) : work.latest.status === status))
    && (!query || work.history.some(event => [event.project, event.summary, event.details, event.verificationNote].join(' ').normalize('NFKC').toLocaleLowerCase('ko').includes(query))));
}
export function seoulDay(timestamp: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(timestamp)).replaceAll('-', '.');
}
export function groupTimelineDays(works: TimelineWork[]) {
  const days = new Map<string, TimelineWork[]>();
  for (const work of works) {
    const day = seoulDay(work.latest.occurredAt);
    const group = days.get(day) ?? [];
    group.push(work);
    days.set(day, group);
  }
  return [...days].map(([date, entries]) => ({ date, entries }));
}
