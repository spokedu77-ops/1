// Opt-in local QA: temporary PostgreSQL rows only, never public/production tables.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { chromium, type Browser, type Page } from 'playwright';
import { NextRequest, NextResponse } from 'next/server';

type Row = Record<string, unknown>;
const state = vi.hoisted(() => ({ service: null as unknown, authorized: true }));
vi.mock('@/app/lib/server/adminAuth', () => ({
  getServiceSupabase: () => state.service,
  requireAdmin: async () => state.authorized
    ? { ok: true, user: { id: 'isolated-qa-admin' } }
    : { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) },
}));

import { POST as privatePost } from '@/app/api/private/leads/route';
import { POST as dispatchPost } from '@/app/api/dispatch/leads/route';
import { POST as curriculumPost } from '@/app/api/curriculum/leads/route';
import { GET as list, PATCH as update } from '@/app/api/admin/consult/route';
import { GET as detail } from '@/app/api/admin/consult/[id]/route';

const enabled = process.env.SPOKEDU_CONSULT_QA === '1';
const base = 'http://127.0.0.1:3000';
const { Client } = createRequire(import.meta.url)('pg') as {
  Client: new (options: { connectionString: string }) => {
    connect(): Promise<void>;
    query(sql: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
    end(): Promise<void>;
  };
};
const db = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });

// A small PostgREST query adapter backed by a connection-local TEMP table.
// This exercises the real route/envelope/summary code, not deployed schema compatibility.
function from(table: string) {
  let insert: Row | undefined;
  let patch: Row | undefined;
  let max = Infinity;
  const predicates: ((row: Row) => boolean)[] = [];
  const execute = async (single = false) => {
    let rows: Row[];
    if (insert) {
      const row = { id: randomUUID(), created_at: new Date().toISOString(), ...insert };
      await db.query('insert into consult_qa_rows values ($1, $2::jsonb)', [table, JSON.stringify(row)]);
      rows = [row];
    } else {
      const result = await db.query('select payload from consult_qa_rows where table_name = $1', [table]);
      rows = result.rows.map((r) => r.payload as Row).filter((r) => predicates.every((p) => p(r))).slice(0, max);
      if (patch) for (const row of rows) {
        Object.assign(row, patch);
        await db.query("update consult_qa_rows set payload=$1::jsonb where table_name=$2 and payload->>'id'=$3", [JSON.stringify(row), table, row.id]);
      }
    }
    return { data: single ? rows[0] ?? null : rows, error: null };
  };
  const query = {
    select: () => query,
    insert: (row: Row) => { insert = row; return query; },
    update: (row: Row) => { patch = row; return query; },
    eq: (key: string, value: unknown) => { predicates.push((r) => r[key] === value); return query; },
    gte: (key: string, value: string) => { predicates.push((r) => String(r[key]) >= value); return query; },
    order: () => query,
    limit: (value: number) => { max = value; return query; },
    single: () => execute(true),
    maybeSingle: () => execute(true),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => execute().then(resolve, reject),
  };
  return query;
}

async function dispatchRequest(path: string, method: string, body?: unknown) {
  const req = new NextRequest(`${base}${path}`, {
    method, ...(body === undefined || method === 'GET' ? {} : { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
  if (path.startsWith('/api/private/leads')) return privatePost(req);
  if (path.startsWith('/api/dispatch/leads')) return dispatchPost(req);
  if (path.startsWith('/api/curriculum/leads')) return curriculumPost(req);
  const id = path.match(/^\/api\/admin\/consult\/([^?]+)/)?.[1];
  if (id) return detail(req, { params: Promise.resolve({ id }) });
  return method === 'PATCH' ? update(req) : list(req);
}

describe.skipIf(!enabled)('isolated public consult integration', () => {
  let browser: Browser;
  beforeAll(async () => {
    vi.stubEnv('PRIVATE_LEADS_TABLE', 'consultations');
    vi.stubEnv('PRIVATE_LEADS_WEBHOOK_URL', '');
    vi.stubEnv('RESEND_API_KEY', '');
    await db.connect();
    await db.query('create temp table consult_qa_rows (table_name text, payload jsonb)');
    state.service = { from };
    browser = await chromium.launch({ headless: true });
  }, 30000);
  afterAll(async () => { await browser?.close(); await db.end(); vi.unstubAllEnvs(); });

  it('rejects missing/false/string consent at every public endpoint before saving', async () => {
    for (const path of ['/api/private/leads', '/api/dispatch/leads', '/api/curriculum/leads']) {
      for (const privacy_consent of [undefined, false, 'true']) {
        expect((await dispatchRequest(path, 'POST', { privacy_consent })).status).toBe(400);
      }
    }
    expect((await db.query('select count(*) from consult_qa_rows')).rows[0].count).toBe('0');
  });

  it('preserves administrator authorization gates for list/detail/status', async () => {
    state.authorized = false;
    try {
      for (const [path, method] of [['/api/admin/consult', 'GET'], ['/api/admin/consult/test', 'GET'], ['/api/admin/consult', 'PATCH']]) {
        expect((await dispatchRequest(path, method, { id: 'test', status: 'done' })).status).toBe(401);
      }
    } finally { state.authorized = true; }
  });

  it('browser: inline forms, common five types, SPOMAT, retry/draft/double click, admin detail/status', async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    let failNext = false;
    let posts = 0;
    await context.route('**/api/**', async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (path === '/api/auth/check-admin') return route.fulfill({ json: { admin: true } });
      if (!/^\/api\/(private|dispatch|curriculum)\/leads$/.test(path) && !path.startsWith('/api/admin/consult')) {
        return route.fulfill({ json: { ok: true, rows: [], count: 0 } });
      }
      if (request.method() === 'POST') {
        posts++;
        if (failNext) { failNext = false; return route.fulfill({ status: 500, json: { ok: false } }); }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const response = await dispatchRequest(path, request.method(), request.postDataJSON() ?? undefined);
      await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
    });
    await context.route('**/*.supabase.co/**', (route) => route.abort());
    const page = await context.newPage();
    await page.goto(`${base}/spomat`);
    expect(await page.getByRole('link', { name: 'SPOMAT 구매·견적 상담' }).getAttribute('href'))
      .toBe('/contact?type=spomove&operation=equipment');
    const fill = async (page: Page, name: string) => {
      const form = page.locator('form').first();
      const fields = form.locator('input:not([type=checkbox]):not([readonly]), textarea, select');
      for (let i = 0; i < await fields.count(); i++) {
        const field = fields.nth(i);
        const tag = await field.evaluate((el) => el.tagName);
        if (tag === 'SELECT') {
          if (!await field.inputValue()) await field.selectOption({ index: 1 });
          continue;
        }
        const type = await field.getAttribute('type');
        await field.fill(type === 'tel' ? '01012345678' : type === 'email' ? 'qa@example.invalid' : name);
      }
      return form;
    };
    const cases = ['/education', '/private', '/spomove', ...['private', 'dispatch', 'spomove', 'curriculum', 'other'].map((type) => `/contact?type=${type}`), '/contact?type=spomove&operation=equipment'];
    for (let i = 0; i < cases.length; i++) {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`${base}${cases[i]}`);
      await page.locator('form').first().waitFor();
      const name = `CONSULT-QA-${i}`;
      const form = await fill(page, name);
      if (cases[i] === '/spomove') expect(await form.getByText('예상 인원', { exact: true }).count()).toBe(0);
      const before = posts;
      await form.locator('button[type=submit]').click();
      expect(posts).toBe(before);
      await form.locator('input[type=checkbox]').check();
      // Verify required fields in the browser before the network boundary.
      const first = form.locator('input:not([type=checkbox]):not([readonly])').first();
      await first.fill('');
      await form.locator('button[type=submit]').click();
      expect(posts).toBe(before);
      await first.fill(name);
      {
        failNext = true;
        await form.locator('button[type=submit]').click();
        await form.getByRole('button', { name: '다시 시도', exact: false }).first().waitFor();
        await page.reload();
        await page.getByRole('button', { name: '작성 내용 불러오기' }).click();
        await form.locator('input[type=checkbox]').check();
      }
      const saved = page.waitForResponse((r) => /\/api\/(private|dispatch|curriculum)\/leads$/.test(new URL(r.url()).pathname) && r.status() === 200);
      await form.locator('button[type=submit]').evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
      const response = await saved;
      const result = await response.json();
      await form.getByText('문의가 정상적으로 접수되었습니다.', { exact: true }).waitFor();
      const id = result.consultId ?? result.leadId;
      const record = await (await dispatchRequest(`/api/admin/consult/${id}`, 'GET')).json();
      expect(record.row.content).toContain(name);
      expect(record.row.status).toBe('pending');
      expect(record.row.lead_context.acquisition.submitPath).toBe(cases[i]);
      expect(posts - before).toBe(2);
      const duplicate = await dispatchRequest(new URL(response.url()).pathname, 'POST', response.request().postDataJSON());
      expect((await duplicate.json()).duplicate).toBe(true);
      const box = await form.boundingBox();
      expect(box?.width).toBeLessThanOrEqual(375);
      if (i === cases.length - 1) expect(record.row.summary.subtitle).toBe('SPOMAT · 교구 문의');
      const changed = await dispatchRequest('/api/admin/consult', 'PATCH', { id, status: 'done' });
      expect(changed.status).toBe(200);
      expect((await changed.json()).row.status).toBe('done');
      console.log(`browser PASS ${cases[i]}: saved, detail, status, consent, required fields, duplicate click`);
    }
    const listed = await (await dispatchRequest('/api/admin/consult', 'GET')).json();
    expect(listed.rows).toHaveLength(cases.length);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${base}/admin/consult`);
    const desktop = page.locator('tbody');
    await desktop.getByText('CONSULT-QA-0', { exact: false }).first().waitFor();
    await desktop.getByText('SPOMAT · 교구 문의', { exact: true }).waitFor();
    for (let i = 0; i < cases.length; i++) {
      await desktop.getByText(`CONSULT-QA-${i}`, { exact: true }).first().click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      await dialog.locator('pre').filter({ hasText: `CONSULT-QA-${i}` }).waitFor();
      await dialog.getByRole('button', { name: '미확인', exact: true }).click();
      await dialog.getByRole('button', { name: '확인완료', exact: true }).click();
      await dialog.getByRole('button', { name: '닫기', exact: true }).last().click();
    }
    await page.goto(`${base}/info/dispatch.html`, { waitUntil: 'domcontentloaded' });
    const legacy = page.locator('#dispatch-contact-form');
    await legacy.locator('[name=organization]').fill('CONSULT-QA-LEGACY');
    await legacy.locator('[name=manager]').fill('QA 담당자');
    await legacy.locator('[name=phone]').fill('01012345678');
    const beforeLegacy = posts;
    await legacy.locator('button[type=submit]').click();
    expect(posts).toBe(beforeLegacy);
    await legacy.locator('[name=privacy_consent]').check();
    const legacySaved = page.waitForResponse((r) => r.url().endsWith('/api/dispatch/leads') && r.status() === 200);
    await legacy.locator('button[type=submit]').click();
    const legacyResult = await (await legacySaved).json();
    const legacyRecord = await (await dispatchRequest(`/api/admin/consult/${legacyResult.consultId}`, 'GET')).json();
    expect(legacyRecord.row.parent_name).toContain('CONSULT-QA-LEGACY');
    await context.close();
  }, 180000);
});
