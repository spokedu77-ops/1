import { readFile } from 'node:fs/promises';
import pg from 'pg';

const env = await readFile(new URL('../.env.local', import.meta.url), 'utf8');
const value = (name) => env.split(/\r?\n/).find((line) => line.startsWith(`${name}=`))
  ?.slice(name.length + 1).trim().replace(/^"|"$/g, '');
const connectionString = value('SPOKEDU_MASTER_DATABASE_URL');
if (!connectionString) throw new Error('SPOKEDU_MASTER_DATABASE_URL is required');

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query('begin transaction read only');
  const [{ rows: sessions }, { rows: logs }] = await Promise.all([
    client.query(`select id, title, created_by, memo from public.sessions where status in ('finished','verified') order by id`),
    client.query(`select * from public.session_count_logs where session_id is not null order by session_id, teacher_id, id`),
  ]);
  const bySession = new Map();
  for (const log of logs) {
    const values = bySession.get(log.session_id) ?? [];
    values.push(log);
    bySession.set(log.session_id, values);
  }
  const affected = [];
  for (const session of sessions) {
    const marker = session.memo?.match(/EXTRA_TEACHERS:\s*(\[[^\r\n]*\])/);
    let assistants = [];
    try { assistants = marker ? JSON.parse(marker[1]) : []; } catch { continue; }
    if (!Array.isArray(assistants) || assistants.some((item) => !item || typeof item.id !== 'string')) continue;
    const expected = new Set(assistants.map((item) => item.id));
    const sessionLogs = bySession.get(session.id) ?? [];
    const automatic = sessionLogs.filter((log) => log.reason === '트리거: sessions.status sync');
    const allTeachers = new Set(sessionLogs.map((log) => log.teacher_id));
    const automaticTeachers = new Set(automatic.map((log) => log.teacher_id));
    const missingAutomatic = [...expected].filter((id) => !automaticTeachers.has(id));
    const safeInsert = missingAutomatic.filter((id) => !allTeachers.has(id));
    const protectedByExistingLog = missingAutomatic.filter((id) => allTeachers.has(id));
    const staleAutomatic = automatic.filter((log) => log.teacher_id !== session.created_by && !expected.has(log.teacher_id));
    if (missingAutomatic.length || staleAutomatic.length) {
      affected.push({
        sessionId: session.id,
        sessionTitle: session.title,
        mainTeacherId: session.created_by,
        expectedAssistantIds: [...expected],
        missingAutomatic,
        safeInsert,
        protectedByExistingLog,
        staleAutomatic,
      });
    }
  }
  console.log(JSON.stringify({ mode: 'READ_ONLY', writes: 0, affected }, null, 2));
} finally {
  await client.query('rollback').catch(() => undefined);
  await client.end();
}
