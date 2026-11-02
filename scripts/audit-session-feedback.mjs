import { readFile, mkdir, writeFile } from 'node:fs/promises';

// Read-only audit. Raw records stay in ignored local storage, never in the report.
const env = Object.fromEntries((await readFile('.env.local', 'utf8')).split(/\r?\n/)
  .filter(line => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
  .map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')]; }));
const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
async function all(table, select) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const query = new URLSearchParams({ select, order: 'id.asc', offset: String(offset), limit: '500' });
    const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?${query}`, { headers });
    if (!response.ok) throw new Error(`${table}: HTTP ${response.status}`);
    const page = await response.json();
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}
const now = new Date();
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
const ymd = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
const [sessions, logs] = await Promise.all([
  all('sessions', '*'),
  all('session_count_logs', 'id,session_id,created_at,count_change'),
]);
const hasValue = value => typeof value === 'string' ? value.trim().length > 0
  : Array.isArray(value) ? value.some(hasValue)
  : value && typeof value === 'object' ? Object.values(value).some(hasValue) : typeof value === 'number' || value === true;
const feedbackText = text => typeof text === 'string' && /✅\s*(오늘 수업|강점|개선|다음 수업|특이사항)/.test(text);
function evidence(row) {
  return {
    fields: hasValue(row.feedback_fields),
    legacyFeedback: feedbackText(row.students_text),
    otherStudentsText: hasValue(row.students_text) && !feedbackText(row.students_text),
    photos: hasValue(row.photo_url), files: hasValue(row.file_url),
  };
}
const bySession = new Map();
for (const log of logs) {
  const list = bySession.get(log.session_id) ?? [];
  list.push(log); bySession.set(log.session_id, list);
}
const summarize = row => ({
  id: row.id, title: row.title, start_at: row.start_at, end_at: row.end_at,
  status: row.status, group_id: row.group_id, round_index: row.round_index, round_total: row.round_total,
  created_at: row.created_at, updated_at: row.updated_at, evidence: evidence(row),
  countLogDates: (bySession.get(row.id) ?? []).map(log => log.created_at),
});
const content = row => { const e = evidence(row); return e.fields || e.legacyFeedback || e.photos || e.files; };
const future = sessions.filter(row => row.start_at && ymd(row.start_at) > today);
const futureContent = future.filter(content);
const futureCompleted = future.filter(row => ['finished', 'verified'].includes(row.status));
const todayContent = sessions.filter(row => row.start_at && ymd(row.start_at) === today && content(row));
const notStartedContent = sessions.filter(row => row.start_at && new Date(row.start_at) > now && content(row));
const suspectHistory = sessions.filter(row => row.start_at && content(row)
  && (bySession.get(row.id) ?? []).some(log => ymd(log.created_at) < ymd(row.start_at)));
const report = {
  auditedAt: now.toISOString(), kstToday: today, totalSessions: sessions.length, totalCountLogs: logs.length,
  futureSessions: future.length, futureContent: futureContent.map(summarize), futureCompleted: futureCompleted.map(summarize),
  todayContent: todayContent.map(summarize),
  notStartedContent: notStartedContent.map(summarize),
  contentWithEarlierCompletionLog: suspectHistory.map(summarize),
  futureOtherStudentsText: future.filter(row => evidence(row).otherStudentsText).map(summarize),
};
await mkdir('.tmp/feedback-audit', { recursive: true });
const stamp = now.toISOString().replace(/[:.]/g, '-');
await writeFile(`.tmp/feedback-audit/${stamp}-snapshot.json`, JSON.stringify({ sessions, logs }, null, 2));
await writeFile('.tmp/feedback-audit/latest-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
