// @vitest-environment happy-dom
import React, { act, createElement, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Center } from '@/app/lib/centers/types';
import { toCenterListItem } from '@/app/lib/centers/listItem';

const api = vi.hoisted(() => ({
  getCenters: vi.fn(), getCenterById: vi.fn(), getActiveTeachers: vi.fn(), updateCenter: vi.fn(),
  createCenter: vi.fn(), deleteCenter: vi.fn(), getCenterCriminalCheckPassword: vi.fn(),
  getCenterHistory: vi.fn(), addCenterHistoryEntry: vi.fn(), updateCenterHistoryEntry: vi.fn(), deleteCenterHistoryEntry: vi.fn(),
}));
vi.mock('./actions/centers', () => api);
vi.mock('./actions/center-history', () => api);
vi.mock('./actions/criminal-check-files', () => ({ createCriminalCheckDownloadUrl: vi.fn(), createCriminalCheckUpload: vi.fn(), deleteCriminalCheckFile: vi.fn(), finalizeCriminalCheckUpload: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/link', () => ({ default: (props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) => { const { prefetch, ...attributes } = props; void prefetch; return createElement('a', attributes); } }));
vi.mock('next/dynamic', () => ({ default: (loader: () => Promise<{ default: React.ComponentType }>) => React.lazy(loader) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import CentersClient from './CentersClient';
import { CenterDetailClient } from './[id]/CenterDetailClient';

const center: Center = {
  id: '11111111-1111-4111-8111-111111111111', name: '테스트 센터', status: 'active', region_tag: '서울',
  address: '서울 주소', access_note: '출입 안내', contact_name: '담당자', contact_phone: '000', contact_email: 'test@example.test', contact_role: '담당',
  contract_start: '2026-01-01', contract_end: '2026-12-31', session_fee: 100000,
  main_teacher_id: 'old-teacher', main_teacher_2_id: null, main_teacher_3_id: null, main_teacher_name: '기존 강사',
  weekly_schedule: [{ day: 'mon', start: '09:00', end: '10:00', place: '강의실', note: '일정 메모' }],
  instructors_default: { main: null, sub: '보조', backup: ['백업'] }, highlights: '특이사항',
  criminal_check_facility_id: '시설', criminal_check_files: [], created_at: '2026-01-01', updated_at: '2026-10-30',
};
let root: Root;
let container: HTMLDivElement;
const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
async function waitFor(predicate: () => boolean) {
  const deadline = Date.now() + 5000;
  while (!predicate() && Date.now() < deadline) await flush();
  expect(predicate()).toBe(true);
}
const click = async (element: Element) => { await act(async () => { element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }); await flush(); };
const button = (text: string) => [...document.querySelectorAll('button')].find((node) => node.textContent?.trim() === text)!;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ teachers: [], fees: [] }), { status: 200 })));
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  window.confirm = vi.fn(() => true);
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  api.getCenterById.mockResolvedValue(center); api.getCenterHistory.mockResolvedValue([]);
  api.getActiveTeachers.mockResolvedValue([]); api.getCenters.mockResolvedValue([toCenterListItem(center)]);
  api.updateCenter.mockResolvedValue({ data: { ...center, name: '수정 센터' } });
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root?.unmount()); container?.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('real center components with isolated action fixtures (not authenticated E2E)', () => {
  it('updates displayed fee by selected UUID without writing a session or settlement', async () => {
    const teacherId = '33333333-3333-4333-8333-333333333333';
    api.getActiveTeachers.mockResolvedValue([{ id: teacherId, name: '선택 강사' }]);
    const fetcher = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('reference') ? {
      teachers: [{ id: teacherId, name: '선택 강사', session_count: 0, log_count: 0, fee_center_main: 62000, fee_center_assist: 26000 }],
    } : { fees: [] })));
    vi.stubGlobal('fetch', fetcher);
    await act(async () => root.render(createElement(CenterDetailClient, { id: center.id })));
    await flush(); await click(button('수정'));
    await waitFor(() => Boolean(document.querySelector('form select option[value="' + teacherId + '"]')));
    const select = [...document.querySelectorAll('form select')].find((node) => node.querySelector(`option[value="${teacherId}"]`)) as HTMLSelectElement;
    await act(async () => { select.value = teacherId; select.dispatchEvent(new Event('change', { bubbles: true })); });
    await waitFor(() => Boolean(container.textContent?.includes('62,000원')));
    expect(container.textContent).toContain('26,000원');
    expect(api.updateCenter).not.toHaveBeenCalled();
    expect(fetcher.mock.calls.every(([url]) => url.includes('/reference') || url.includes('/teacher-tier-fees'))).toBe(true);
  });
  it('keeps co-main role, suppresses duplicate calculation and distinguishes unselected teacher', async () => {
    const teacherId = '33333333-3333-4333-8333-333333333333';
    api.getCenterById.mockResolvedValue({ ...center, main_teacher_id: teacherId, main_teacher_2_id: teacherId });
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('reference') ? {
      teachers: [{ id: teacherId, name: 'UUID 강사', session_count: 100, log_count: 6, fee_center_main: 61000, fee_center_assist: null }],
    } : { fees: [{ tier_id: 'gold', fee_center_main: 45000, fee_center_assist: 30000 }] }))));
    await act(async () => root.render(createElement(CenterDetailClient, { id: center.id })));
    await flush(); await click(button('수업·금액'));
    await waitFor(() => Boolean(container.textContent?.includes('61,000원')));
    expect(container.textContent?.match(/61,000원/g)).toHaveLength(1);
    expect(container.textContent).toContain('공동 주강사 2');
    expect(container.textContent).toContain('동일 강사 중복 배정');
    expect(container.textContent).toContain('강사 미선택');
  });
  it('does not show settlement payload for an ordinary admin', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })));
    await act(async () => root.render(createElement(CenterDetailClient, { id: center.id })));
    await flush(); await click(button('정산'));
    await waitFor(() => Boolean(container.textContent?.includes('정산은 MASTER 전용')));
    expect(container.querySelector('[aria-label="센터관리 기관 검색"]')).toBeNull();
  });
  it('inserts a created row from the action result without refetching the full list', async () => {
    api.createCenter.mockResolvedValue({ data: { ...center, id: '33333333-3333-4333-8333-333333333333', name: '새 센터' } });
    await act(async () => root.render(createElement(CentersClient, { initialCenters: [] })));
    await click(button('센터 추가'));
    const form = container.querySelector('form')!;
    const input = form.querySelector('input')!;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '새 센터'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(container.textContent).toContain('새 센터');
    expect(api.createCenter).toHaveBeenCalled(); expect(api.getCenters).not.toHaveBeenCalled();
  });
  it('removes a deleted list row without refetching the full center list', async () => {
    api.deleteCenter.mockResolvedValue({ data: true });
    await act(async () => root.render(createElement(CentersClient, { initialCenters: [toCenterListItem(center)] })));
    const deleteButton = container.querySelector('button svg.lucide-trash-2')?.closest('button');
    expect(deleteButton).toBeTruthy(); await click(deleteButton!);
    expect(api.deleteCenter).toHaveBeenCalledWith(center.id);
    expect(container.querySelector('a')).toBeNull(); expect(api.getCenters).not.toHaveBeenCalled();
  });
  it('ignores an old filter response that arrives after the newer search response', async () => {
    let resolveOld!: (rows: ReturnType<typeof toCenterListItem>[]) => void;
    api.getCenters.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce([toCenterListItem({ ...center, name: '새 검색 결과' })]);
    await act(async () => root.render(createElement(CentersClient, { initialCenters: [toCenterListItem(center)] })));
    const input = container.querySelector('input')!;
    const type = async (value: string) => {
      await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 380)); });
    };
    await type('이전'); await type('새 검색'); await flush();
    expect(container.textContent).toContain('새 검색 결과');
    await act(async () => resolveOld([toCenterListItem({ ...center, name: '오래된 결과' })]));
    expect(container.textContent).not.toContain('오래된 결과');
    expect(input.value).toBe('새 검색');
  });
  it('does not load detail/teachers before selection; closes without a list query; supports reopen and another center', async () => {
    await act(async () => root.render(createElement(StrictMode, null, createElement(CentersClient, { initialCenters: [toCenterListItem(center), toCenterListItem({ ...center, id: '22222222-2222-4222-8222-222222222222', name: '다른 센터' })] }))));
    expect(api.getCenterById).not.toHaveBeenCalled();
    // Existing initial-list effect must also be idempotent in StrictMode.
    expect(api.getCenters).not.toHaveBeenCalled();
    await click(container.querySelector('a')!);
    await waitFor(() => api.getCenterById.mock.calls.length === 1);
    expect(api.getCenterById).toHaveBeenCalledTimes(1); expect(api.getCenterById).toHaveBeenCalledWith(center.id);
    expect(api.getCenterHistory).toHaveBeenCalledTimes(1); expect(api.getActiveTeachers).not.toHaveBeenCalled();
    expect(document.querySelector('dialog')?.textContent).toContain('계약 기간');
    await click(document.querySelector('[aria-label="센터 상세 닫기"]')!);
    expect(document.querySelector('dialog')).toBeNull(); expect(api.getCenters).not.toHaveBeenCalled();
    await click(container.querySelector('a')!);
    expect(api.getCenterById).toHaveBeenCalledTimes(2);
    await click(document.querySelector('[aria-label="센터 상세 닫기"]')!);
    await click(container.querySelector('a[href*="22222222"]')!);
    expect(api.getCenterById).toHaveBeenLastCalledWith('22222222-2222-4222-8222-222222222222');
  });

  it('loads teacher choices only on edit, protects dirty close, and patches the saved row without requery', async () => {
    await act(async () => root.render(createElement(CentersClient, { initialCenters: [toCenterListItem(center)] })));
    await click(container.querySelector('a')!);
    await waitFor(() => Boolean(button('수정')));
    await click(button('수정'));
    expect(api.getActiveTeachers).toHaveBeenCalledTimes(1);
    const form = document.querySelector('dialog form')!;
    const input = form.querySelector('input')!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, '수정 센터'); input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    vi.mocked(window.confirm).mockReturnValue(false);
    await click(document.querySelector('[aria-label="센터 상세 닫기"]')!);
    expect(window.confirm).toHaveBeenCalled(); expect(document.querySelector('dialog')).not.toBeNull();
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }); await flush();
    expect(api.updateCenter).toHaveBeenCalledWith(center.id, expect.objectContaining({ name: '수정 센터', main_teacher_id: 'old-teacher' }));
    expect(container.textContent).toContain('수정 센터'); expect(api.getCenters).not.toHaveBeenCalled();
    await click(document.querySelector('[aria-label="센터 상세 닫기"]')!);
    expect(document.querySelector('dialog')).toBeNull();
  });
});
