#!/usr/bin/env node
/**
 * Read-only: validate SPOMOVE_NOTION_CATALOG_URL from .env.local without printing full URL.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const envPath = path.join(repoRoot, '.env.local');

function parseEnvLine(text, key) {
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const m = t.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && m[1] === key) return m[2].replace(/^["']|["']$/g, '').trim();
  }
  return null;
}

const envText = await readFile(envPath, 'utf8').catch(() => null);
if (!envText) {
  console.log(JSON.stringify({ ok: false, code: 'ENV_LOCAL_MISSING' }));
  process.exit(0);
}

const raw = parseEnvLine(envText, 'SPOMOVE_NOTION_CATALOG_URL');
if (!raw) {
  console.log(JSON.stringify({ ok: false, code: 'ENV_MISSING' }));
  process.exit(0);
}

let parsed;
try {
  parsed = new URL(raw);
} catch {
  console.log(JSON.stringify({ ok: false, code: 'URL_INVALID' }));
  process.exit(0);
}

if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
  console.log(JSON.stringify({ ok: false, code: 'URL_INVALID', scheme: parsed.protocol }));
  process.exit(0);
}

const report = {
  ok: true,
  host: parsed.hostname,
  scheme: parsed.protocol.replace(':', ''),
  pathPrefix: parsed.pathname.slice(0, 24) + (parsed.pathname.length > 24 ? '…' : ''),
  hasQuery: parsed.search.length > 0,
  urlLength: raw.length,
};

try {
  const res = await fetch(parsed.toString(), {
    redirect: 'follow',
    headers: { 'User-Agent': 'SPOKEDU-Phase2B-SourceVerify/1.0' },
  });
  report.httpStatus = res.status;
  report.finalHost = new URL(res.url).hostname;
  const html = (await res.text()).slice(0, 120000);
  report.loginRequired =
    /sign.?in|log.?in|Notion–Login|password/i.test(html) && !/SPOMOVE|프로그램|program/i.test(html);
  report.hasProgramSignals =
    /SPOMOVE|프로그램|Program|카탈로그|catalog/i.test(html) ||
    html.includes('notion-page') ||
    html.includes('notion-app');
  report.embedFriendlyHost = ['notion.site', 'www.notion.so', 'notion.so', 'app.notion.com'].some((h) =>
    report.finalHost.endsWith(h.replace('www.', '')) || report.finalHost.includes('notion'),
  );
  report.xFrameOptions = res.headers.get('x-frame-options');
  report.csp = res.headers.get('content-security-policy')?.slice(0, 120) ?? null;
} catch (e) {
  report.fetchError = String(e.message).slice(0, 120);
}

console.log(JSON.stringify(report, null, 2));
