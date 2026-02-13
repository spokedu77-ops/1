'use client';

import { useState, useEffect } from 'react';
import { X, Save, Trash2, Loader2 } from 'lucide-react';
import type { Schedule } from '@/app/lib/schedules/types';
import { ChecklistEditor } from './ChecklistEditor';
import { DateRangeField } from './DateRangeField';
import { TimeRangeField } from './TimeRangeField';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateWithDay(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return dateStr;
    const day = DAY_NAMES[d.getDay()];
    const [y, m, dayNum] = dateStr.split('-');
    return `${m}/${dayNum} (${day})`;
  } catch {
    return dateStr;
  }
}

function formatDayOfWeekList(days: number[] | null): string {
  if (!days?.length) return '';
  return '매주 ' + days.map((d) => DAY_NAMES[d]).join('·');
}

interface ScheduleDrawerProps {
  schedule: Schedule | null;
  isCreate: boolean;
  onClose: () => void;
  onSave: (data: Partial<Schedule>) => Promise<{ error?: string }>;
  onDelete?: (id: string) => Promise<{ error?: string }>;
  onSaved: () => void;
}

const todayStr = () => new Date().toISOString().split('T')[0];

export function ScheduleDrawer({
  schedule,
  isCreate,
  onClose,
  onSave,
  onDelete,
  onSaved,
}: ScheduleDrawerProps) {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [dayOfWeek, setDayOfWeek] = useState<number[] | null>(null);
  const [sessionsCount, setSessionsCount] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'active' | 'done'>('active');
  const [checklist, setChecklist] = useState<Schedule['checklist']>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (schedule) {
      setTitle(schedule.title);
      setAssignee(schedule.assignee ?? '');
      setStartDate(schedule.start_date ?? null);
      setEndDate(schedule.end_date ?? null);
      setStartTime(schedule.start_time ?? null);
      setEndTime(schedule.end_time ?? null);
      setDayOfWeek(Array.isArray(schedule.day_of_week) ? schedule.day_of_week : null);
      setSessionsCount(schedule.sessions_count ?? null);
      setNote(schedule.note ?? '');
      setStatus(schedule.status);
      setChecklist(Array.isArray(schedule.checklist) ? schedule.checklist : []);
    } else if (isCreate) {
      setTitle('');
      setAssignee('');
      setStartDate(null);
      setEndDate(null);
      setStartTime(null);
      setEndTime(null);
      setDayOfWeek(null);
      setSessionsCount(null);
      setNote('');
      setStatus('active');
      setChecklist([]);
    }
  }, [schedule, isCreate]);

  const suggestDone = endDate && endDate < todayStr();
  const effectiveStatus = suggestDone && status === 'active' ? 'done' : status;

  const handleSave = async () => {
    setError('');
    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const res = await onSave({
        title: title.trim(),
        assignee: assignee.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        start_time: startTime || null,
        end_time: endTime || null,
        day_of_week: dayOfWeek?.length ? dayOfWeek : null,
        sessions_count: sessionsCount,
        note: note.trim() || null,
        status: suggestDone ? 'done' : status,
        checklist,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!schedule?.id || !onDelete) return;
    if (!confirm('이 일정을 삭제할까요?')) return;
    setDeleting(true);
    try {
      const res = await onDelete(schedule.id);
      if (res.error) setError(res.error);
      else {
        onSaved();
        onClose();
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-xl flex flex-col border-l border-slate-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
          {isCreate ? '새 일정' : '일정 편집'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-0">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl mb-4">{error}</p>
        )}
        {suggestDone && status === 'active' && (
          <p className="text-sm text-amber-700 bg-amber-50 px-4 py-2.5 rounded-xl mb-4">
            종료일이 지났습니다. 저장 시 상태가 &quot;종료&quot;로 설정됩니다.
          </p>
        )}
        <section className="py-4 border-b border-slate-100">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">기본 정보</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">제목 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                placeholder="일정 제목"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">담당</label>
              <input
                type="text"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                placeholder="담당자"
              />
            </div>
          </div>
        </section>
        <section className="py-4 border-b border-slate-100">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">일정 · 회기</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">기간</label>
              <DateRangeField
                startDate={startDate}
                endDate={endDate}
                onStartChange={setStartDate}
                onEndChange={setEndDate}
              />
              {startDate && (
                <p className="mt-1 text-xs text-slate-500">
                  시작일 요일: {formatDateWithDay(startDate)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">시작 · 종료 시간</label>
              <TimeRangeField
                startTime={startTime}
                endTime={endTime}
                onStartChange={setStartTime}
                onEndChange={setEndTime}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">반복 요일</label>
              <div className="flex flex-wrap gap-2">
                {DAY_NAMES.map((name, i) => (
                  <label key={i} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dayOfWeek?.includes(i) ?? false}
                      onChange={(e) => {
                        const next = dayOfWeek ?? [];
                        if (e.target.checked) setDayOfWeek([...next, i].sort((a, b) => a - b));
                        else setDayOfWeek(next.filter((d) => d !== i).length ? next.filter((d) => d !== i) : null);
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700">{name}</span>
                  </label>
                ))}
              </div>
              {dayOfWeek?.length ? (
                <p className="mt-1 text-xs text-slate-500">{formatDayOfWeekList(dayOfWeek)}</p>
              ) : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">회기</label>
              <input
                type="number"
                min={0}
                value={sessionsCount ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setSessionsCount(v === '' ? null : parseInt(v, 10));
                }}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm tabular-nums focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                placeholder="회기 수"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">상태</label>
              <select
                value={effectiveStatus}
                onChange={(e) => setStatus(e.target.value as 'active' | 'done')}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              >
                <option value="active">진행중</option>
                <option value="done">종료</option>
              </select>
            </div>
          </div>
        </section>
        <section className="py-4 border-b border-slate-100">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">비고</h3>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none"
            placeholder="비고"
          />
        </section>
        <section className="py-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">체크리스트</h3>
          <ChecklistEditor items={checklist} onChange={setChecklist} />
        </section>
      </div>
      <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/50">
        {!isCreate && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            삭제
          </button>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 hover:shadow-md disabled:opacity-50 transition-all"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          저장
        </button>
      </div>
    </div>
  );
}
