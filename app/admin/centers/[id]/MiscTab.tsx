'use client';

import { useState } from 'react';
import { createLog, updateLog, deleteLog } from '../actions/logs';
import { createFile, updateFile, deleteFile } from '../actions/files';
import type { CenterLog, CenterFile } from '@/app/lib/centers/types';
import { Plus, Pencil, Trash2, ExternalLink, FileText, Link2 } from 'lucide-react';

const LOG_TYPES = [
  { value: 'note', label: '메모' },
  { value: 'request', label: '요청' },
  { value: 'issue', label: '이슈' },
  { value: 'result', label: '결과' },
] as const;

const CATEGORIES = [
  { value: '', label: '선택' },
  { value: 'contract', label: '계약' },
  { value: 'estimate', label: '견적' },
  { value: 'etc', label: '기타' },
];

interface MiscTabProps {
  centerId: string;
  logs: CenterLog[];
  files: CenterFile[];
  onSaved: () => void;
}

export function MiscTab({ centerId, logs, files, onSaved }: MiscTabProps) {
  const [quickContent, setQuickContent] = useState('');
  const [quickType, setQuickType] = useState<'note' | 'request' | 'issue' | 'result'>('note');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState<CenterLog['type']>('note');
  const [isFileAddOpen, setIsFileAddOpen] = useState(false);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [fileForm, setFileForm] = useState({ title: '', url: '', category: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleQuickAddLog = async (e: React.FormEvent) => {
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

  const handleUpdateLog = async (id: string) => {
    setError('');
    setSubmitting(true);
    try {
      const result = await updateLog(id, { content: editContent, type: editType });
      if (result.error) setError(result.error);
      else {
        setEditingLogId(null);
        onSaved();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm('이 로그를 삭제할까요?')) return;
    setError('');
    const result = await deleteLog(id);
    if (result.error) setError(result.error);
    else onSaved();
  };

  const startEditLog = (log: CenterLog) => {
    setEditingLogId(log.id);
    setEditContent(log.content);
    setEditType(log.type);
  };

  const resetFileForm = () => {
    setFileForm({ title: '', url: '', category: '' });
    setError('');
    setEditingFileId(null);
    setIsFileAddOpen(false);
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fileForm.title.trim() || !fileForm.url.trim()) {
      setError('제목과 URL을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await createFile({
        center_id: centerId,
        title: fileForm.title.trim(),
        url: fileForm.url.trim(),
        category: fileForm.category || null,
      });
      if (result.error) setError(result.error);
      else {
        resetFileForm();
        onSaved();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateFile = async (id: string, payload: { title?: string; url?: string; category?: string | null }) => {
    setError('');
    setSubmitting(true);
    try {
      const result = await updateFile(id, payload);
      if (result.error) setError(result.error);
      else {
        setEditingFileId(null);
        onSaved();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFile = async (id: string) => {
    if (!confirm('이 파일 링크를 삭제할까요?')) return;
    setError('');
    const result = await deleteFile(id);
    if (result.error) setError(result.error);
    else onSaved();
  };

  const startEditFile = (f: CenterFile) => {
    setEditingFileId(f.id);
    setFileForm({ title: f.title, url: f.url, category: f.category ?? '' });
  };

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
          <FileText className="h-4 w-4" />
          활동 로그
        </h3>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <form onSubmit={handleQuickAddLog} className="mb-4 flex flex-wrap gap-2">
            <input
              type="text"
              value={quickContent}
              onChange={(e) => setQuickContent(e.target.value)}
              placeholder="내용 입력 후 Enter"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
            <select
              value={quickType}
              onChange={(e) => setQuickType(e.target.value as typeof quickType)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
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
              className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              추가
            </button>
          </form>
          <div className="space-y-2">
            {logs.map((log) =>
              editingLogId === log.id ? (
                <div
                  key={log.id}
                  className="flex flex-wrap items-end gap-2 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3"
                >
                  <input
                    type="text"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
                  />
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as CenterLog['type'])}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  >
                    {LOG_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleUpdateLog(log.id)}
                    disabled={submitting}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLogId(null)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-slate-200/80 bg-white p-3 transition-shadow hover:shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <span
                      className={`mr-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        log.type === 'request'
                          ? 'bg-indigo-100 text-indigo-800'
                          : log.type === 'issue'
                            ? 'bg-amber-100 text-amber-800'
                            : log.type === 'result'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {LOG_TYPES.find((t) => t.value === log.type)?.label ?? log.type}
                    </span>
                    <span className="text-xs text-slate-500">{log.log_date}</span>
                    <p className="mt-1 text-sm text-slate-900">{log.content}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => startEditLog(log)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLog(log.id)}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
          {logs.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500">로그가 없습니다. 위에서 빠르게 추가해보세요.</p>
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
          <Link2 className="h-4 w-4" />
          파일 / 링크
        </h3>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setIsFileAddOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              파일(URL) 추가
            </button>
          </div>
          <div className="space-y-2">
            {files.map((f) =>
              editingFileId === f.id ? (
                <div
                  key={f.id}
                  className="flex flex-wrap items-end gap-2 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3"
                >
                  <input
                    value={fileForm.title}
                    onChange={(e) => setFileForm((x) => ({ ...x, title: e.target.value }))}
                    placeholder="제목"
                    className="min-w-[120px] rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
                  />
                  <input
                    value={fileForm.url}
                    onChange={(e) => setFileForm((x) => ({ ...x, url: e.target.value }))}
                    placeholder="https://..."
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
                  />
                  <select
                    value={fileForm.category}
                    onChange={(e) => setFileForm((x) => ({ ...x, category: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateFile(f.id, {
                        title: fileForm.title.trim(),
                        url: fileForm.url.trim(),
                        category: fileForm.category || null,
                      })
                    }
                    disabled={submitting}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingFileId(null)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-white p-3 transition-shadow hover:shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-slate-900">{f.title}</span>
                    {f.category && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                        {CATEGORIES.find((c) => c.value === f.category)?.label ?? f.category}
                      </span>
                    )}
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-1 text-sm text-indigo-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{f.url}</span>
                    </a>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => startEditFile(f)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFile(f.id)}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
          {files.length === 0 && !isFileAddOpen && (
            <p className="py-6 text-center text-sm text-slate-500">등록된 파일(URL)이 없습니다.</p>
          )}

          {isFileAddOpen && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <h4 className="mb-3 text-sm font-medium text-slate-700">새 파일(URL)</h4>
              <form onSubmit={handleCreateFile} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">제목 *</label>
                  <input
                    value={fileForm.title}
                    onChange={(e) => setFileForm((x) => ({ ...x, title: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">URL *</label>
                  <input
                    type="url"
                    value={fileForm.url}
                    onChange={(e) => setFileForm((x) => ({ ...x, url: e.target.value }))}
                    placeholder="https://..."
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">분류</label>
                  <select
                    value={fileForm.category}
                    onChange={(e) => setFileForm((x) => ({ ...x, category: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="min-h-[44px] rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    추가
                  </button>
                  <button
                    type="button"
                    onClick={resetFileForm}
                    className="min-h-[44px] rounded-lg border border-slate-200 px-4 py-2.5 text-sm hover:bg-slate-50"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
