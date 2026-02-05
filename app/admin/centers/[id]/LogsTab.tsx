'use client';

import { useState } from 'react';
import { createLog, updateLog, deleteLog } from '../actions/logs';
import type { CenterLog } from '@/app/lib/centers/types';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const LOG_TYPES = [
  { value: 'note', label: '메모' },
  { value: 'request', label: '요청' },
  { value: 'issue', label: '이슈' },
  { value: 'result', label: '결과' },
] as const;

interface LogsTabProps {
  centerId: string;
  logs: CenterLog[];
  onSaved: () => void;
}

export function LogsTab({ centerId, logs, onSaved }: LogsTabProps) {
  const [quickContent, setQuickContent] = useState('');
  const [quickType, setQuickType] = useState<'note' | 'request' | 'issue' | 'result'>('note');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState<CenterLog['type']>('note');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickContent.trim()) return;
    setError('');
    setSubmitting(true);
    try {
      const result = await createLog({
        center_id: centerId,
        content: quickContent.trim(),
        type: quickType,
      });
      if (result.error) setError(result.error);
      else {
        setQuickContent('');
        onSaved();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setError('');
    setSubmitting(true);
    try {
      const result = await updateLog(id, { content: editContent, type: editType });
      if (result.error) setError(result.error);
      else {
        setEditingId(null);
        onSaved();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 로그를 삭제할까요?')) return;
    setError('');
    const result = await deleteLog(id);
    if (result.error) setError(result.error);
    else onSaved();
  };

  const startEdit = (log: CenterLog) => {
    setEditingId(log.id);
    setEditContent(log.content);
    setEditType(log.type);
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <h4 className="mb-2 text-sm font-medium text-gray-700">빠른 추가</h4>
        <form onSubmit={handleQuickAdd} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={quickContent}
            onChange={(e) => setQuickContent(e.target.value)}
            placeholder="내용 입력 후 Enter"
            className="min-w-[200px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <select
            value={quickType}
            onChange={(e) => setQuickType(e.target.value as typeof quickType)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {LOG_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={submitting || !quickContent.trim()}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            추가
          </button>
        </form>
      </div>
      <div className="space-y-2">
        {logs.map((log) =>
          editingId === log.id ? (
            <div key={log.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-w-[200px] flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
              />
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as CenterLog['type'])}
                className="rounded border border-gray-300 px-2 py-1 text-sm"
              >
                {LOG_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleUpdate(log.id)}
                disabled={submitting}
                className="rounded bg-blue-600 px-2 py-1 text-sm text-white"
              >
                저장
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="rounded border px-2 py-1 text-sm"
              >
                취소
              </button>
            </div>
          ) : (
            <div
              key={log.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-gray-200 bg-white p-3"
            >
              <div className="min-w-0 flex-1">
                <span
                  className={`mr-2 rounded px-1.5 py-0.5 text-xs font-medium ${
                    log.type === 'request'
                      ? 'bg-blue-100 text-blue-800'
                      : log.type === 'issue'
                        ? 'bg-amber-100 text-amber-800'
                        : log.type === 'result'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {LOG_TYPES.find((t) => t.value === log.type)?.label ?? log.type}
                </span>
                <span className="text-sm text-gray-600">{log.log_date}</span>
                <p className="mt-1 text-sm text-gray-900">{log.content}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(log)}
                  className="rounded p-1 text-gray-500 hover:bg-gray-100"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(log.id)}
                  className="rounded p-1 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        )}
      </div>
      {logs.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-500">로그가 없습니다. 위에서 빠르게 추가해보세요.</p>
      )}
    </div>
  );
}
