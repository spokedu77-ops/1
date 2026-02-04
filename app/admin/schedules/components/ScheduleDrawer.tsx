'use client';

import { useState, useEffect } from 'react';
import { X, Save, Trash2, Loader2 } from 'lucide-react';
import type { Schedule } from '@/app/lib/schedules/types';
import { ChecklistEditor } from './ChecklistEditor';
import { DateRangeField } from './DateRangeField';

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
      setSessionsCount(schedule.sessions_count ?? null);
      setNote(schedule.note ?? '');
      setStatus(schedule.status);
      setChecklist(Array.isArray(schedule.checklist) ? schedule.checklist : []);
    } else if (isCreate) {
      setTitle('');
      setAssignee('');
      setStartDate(null);
      setEndDate(null);
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">
          {isCreate ? '새 일정' : '일정 편집'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}
        {suggestDone && status === 'active' && (
          <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
            종료일이 지났습니다. 저장 시 상태가 &quot;종료&quot;로 설정됩니다.
          </p>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">제목 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            placeholder="일정 제목"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">담당</label>
          <input
            type="text"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            placeholder="담당자"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">기간</label>
          <DateRangeField
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">회기</label>
          <input
            type="number"
            min={0}
            value={sessionsCount ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              setSessionsCount(v === '' ? null : parseInt(v, 10));
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            placeholder="회기 수"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">상태</label>
          <select
            value={effectiveStatus}
            onChange={(e) => setStatus(e.target.value as 'active' | 'done')}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          >
            <option value="active">진행중</option>
            <option value="done">종료</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">비고</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none resize-none"
            placeholder="비고"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">체크리스트</label>
          <ChecklistEditor items={checklist} onChange={setChecklist} />
        </div>
      </div>
      <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-200">
        {!isCreate && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            삭제
          </button>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          저장
        </button>
      </div>
    </div>
  );
}
