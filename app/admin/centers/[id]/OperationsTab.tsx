'use client';

import { useState, useEffect } from 'react';
import { updateCenter } from '../actions/centers';
import { updateCenterOperationsSchema } from '@/app/lib/centers/schemas';
import type { CenterWithRelations } from '@/app/lib/centers/types';
import type { WeeklyScheduleSlot, InstructorsDefault } from '@/app/lib/centers/types';

const DAY_OPTIONS = [
  { value: 'mon', label: '월' },
  { value: 'tue', label: '화' },
  { value: 'wed', label: '수' },
  { value: 'thu', label: '목' },
  { value: 'fri', label: '금' },
  { value: 'sat', label: '토' },
  { value: 'sun', label: '일' },
];

interface OperationsTabProps {
  center: CenterWithRelations;
  onSaved: () => void;
}

export function OperationsTab({ center, onSaved }: OperationsTabProps) {
  const [accessNote, setAccessNote] = useState(center.access_note ?? '');
  const [highlights, setHighlights] = useState(center.highlights ?? '');
  const [schedule, setSchedule] = useState<WeeklyScheduleSlot[]>(
    center.weekly_schedule ?? []
  );
  const [instructors, setInstructors] = useState<InstructorsDefault>(
    center.instructors_default ?? { main: null, sub: null, backup: [] }
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAccessNote(center.access_note ?? '');
    setHighlights(center.highlights ?? '');
    setSchedule(center.weekly_schedule ?? []);
    setInstructors(center.instructors_default ?? { main: null, sub: null, backup: [] });
  }, [center.id, center.access_note, center.highlights, center.weekly_schedule, center.instructors_default]);

  const addSlot = () => {
    setSchedule((s) => [...s, { day: 'mon', start: '09:00', end: '12:00', place: '', note: '' }]);
  };

  const updateSlot = (index: number, field: keyof WeeklyScheduleSlot, value: string) => {
    setSchedule((s) =>
      s.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const removeSlot = (index: number) => {
    setSchedule((s) => s.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = updateCenterOperationsSchema.safeParse({
      access_note: accessNote || null,
      highlights: highlights || null,
      weekly_schedule: schedule,
      instructors_default: instructors,
    });
    if (!parsed.success) {
      setError(parsed.error.flatten().formErrors.join(', '));
      return;
    }
    setSaving(true);
    try {
      const result = await updateCenter(center.id, {
        access_note: parsed.data.access_note,
        highlights: parsed.data.highlights,
        weekly_schedule: parsed.data.weekly_schedule,
        instructors_default: parsed.data.instructors_default,
      });
      if (result.error) setError(result.error);
      else onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">출입 안내 (access_note)</label>
        <textarea
          value={accessNote}
          onChange={(e) => setAccessNote(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">특이사항 (highlights)</label>
        <textarea
          value={highlights}
          onChange={(e) => setHighlights(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">주간 시간표</label>
          <button
            type="button"
            onClick={addSlot}
            className="text-sm text-indigo-600 hover:underline"
          >
            + 행 추가
          </button>
        </div>
        <div className="mt-2 space-y-2">
          {schedule.map((row, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50 p-3">
              <select
                value={row.day}
                onChange={(e) => updateSlot(i, 'day', e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
              >
                {DAY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <input
                type="time"
                value={row.start}
                onChange={(e) => updateSlot(i, 'start', e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
              />
              <input
                type="time"
                value={row.end}
                onChange={(e) => updateSlot(i, 'end', e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
              />
              <input
                type="text"
                placeholder="장소"
                value={row.place}
                onChange={(e) => updateSlot(i, 'place', e.target.value)}
                className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
              />
              <input
                type="text"
                placeholder="비고"
                value={row.note}
                onChange={(e) => updateSlot(i, 'note', e.target.value)}
                className="flex-1 min-w-[80px] rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeSlot(i)}
                className="rounded p-1 text-red-600 hover:bg-red-50"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">강사 기본배정</label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div>
            <span className="text-xs text-slate-500">메인</span>
            <input
              type="text"
              value={instructors.main ?? ''}
              onChange={(e) => setInstructors((i) => ({ ...i, main: e.target.value || null }))}
              className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>
          <div>
            <span className="text-xs text-slate-500">서브</span>
            <input
              type="text"
              value={instructors.sub ?? ''}
              onChange={(e) => setInstructors((i) => ({ ...i, sub: e.target.value || null }))}
              className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <span className="text-xs text-slate-500">백업 (쉼표 구분)</span>
            <input
              type="text"
              value={instructors.backup?.join(', ') ?? ''}
              onChange={(e) =>
                setInstructors((i) => ({
                  ...i,
                  backup: e.target.value ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : [],
                }))
              }
              className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>
        </div>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="min-h-[44px] rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? '저장 중…' : '저장'}
      </button>
    </form>
  );
}
