import type { CenterTbdClass } from './localTbdStorage';

export type CenterTbdTeacherOption = {
  id: string;
  name: string;
};

export async function fetchCenterTbdClasses(): Promise<CenterTbdClass[]> {
  const res = await fetch('/api/admin/center-tbd-schedule', { cache: 'no-store' });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `불러오기 실패 (${res.status})`);
  }
  const data = (await res.json()) as { classes?: CenterTbdClass[] };
  return Array.isArray(data.classes) ? data.classes : [];
}

export async function fetchCenterTbdTeachers(): Promise<CenterTbdTeacherOption[]> {
  const res = await fetch('/api/admin/center-tbd-schedule/teachers', { cache: 'no-store' });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `강사 목록 실패 (${res.status})`);
  }
  const data = (await res.json()) as { teachers?: CenterTbdTeacherOption[] };
  return Array.isArray(data.teachers) ? data.teachers : [];
}

export async function upsertCenterTbdClass(cls: CenterTbdClass): Promise<CenterTbdClass> {
  const res = await fetch('/api/admin/center-tbd-schedule', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ class: cls }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `저장 실패 (${res.status})`);
  }
  const data = (await res.json()) as { class?: CenterTbdClass };
  if (!data.class) throw new Error('저장 응답이 올바르지 않습니다.');
  return data.class;
}

export async function deleteCenterTbdClass(classId: string): Promise<void> {
  const res = await fetch(
    `/api/admin/center-tbd-schedule?id=${encodeURIComponent(classId)}`,
    { method: 'DELETE' }
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `삭제 실패 (${res.status})`);
  }
}

export async function fetchCenterTbdMonthNote(year: number, month: number): Promise<string> {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month + 1),
  });
  const res = await fetch(`/api/admin/center-tbd-schedule/note?${params}`, { cache: 'no-store' });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `메모 불러오기 실패 (${res.status})`);
  }
  const data = (await res.json()) as { note?: string };
  return typeof data.note === 'string' ? data.note : '';
}

export async function saveCenterTbdMonthNote(
  year: number,
  month: number,
  note: string
): Promise<string> {
  const res = await fetch('/api/admin/center-tbd-schedule/note', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ year, month: month + 1, note }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `메모 저장 실패 (${res.status})`);
  }
  const data = (await res.json()) as { note?: string };
  return typeof data.note === 'string' ? data.note : note;
}

export async function importCenterTbdClasses(classes: CenterTbdClass[]): Promise<CenterTbdClass[]> {
  const res = await fetch('/api/admin/center-tbd-schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'import', classes }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `가져오기 실패 (${res.status})`);
  }
  const data = (await res.json()) as { classes?: CenterTbdClass[] };
  return Array.isArray(data.classes) ? data.classes : [];
}
