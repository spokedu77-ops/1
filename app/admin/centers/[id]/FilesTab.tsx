'use client';

import { useState } from 'react';
import { createFile, updateFile, deleteFile } from '../actions/files';
import type { CenterFile } from '@/app/lib/centers/types';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';

const CATEGORIES = [
  { value: '', label: '선택' },
  { value: 'contract', label: '계약' },
  { value: 'estimate', label: '견적' },
  { value: 'etc', label: '기타' },
];

interface FilesTabProps {
  centerId: string;
  files: CenterFile[];
  onSaved: () => void;
}

export function FilesTab({ centerId, files, onSaved }: FilesTabProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', url: '', category: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setForm({ title: '', url: '', category: '' });
    setError('');
    setEditingId(null);
    setIsAddOpen(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    if (!form.url.trim()) {
      setError('URL을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await createFile({
        center_id: centerId,
        title: form.title.trim(),
        url: form.url.trim(),
        category: form.category || null,
      });
      if (result.error) setError(result.error);
      else {
        resetForm();
        onSaved();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, payload: { title?: string; url?: string; category?: string | null }) => {
    setError('');
    setSubmitting(true);
    try {
      const result = await updateFile(id, payload);
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
    if (!confirm('이 파일 링크를 삭제할까요?')) return;
    setError('');
    const result = await deleteFile(id);
    if (result.error) setError(result.error);
    else onSaved();
  };

  const startEdit = (f: CenterFile) => {
    setEditingId(f.id);
    setForm({
      title: f.title,
      url: f.url,
      category: f.category ?? '',
    });
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          파일(URL) 추가
        </button>
      </div>
      <div className="space-y-2">
        {files.map((f) =>
          editingId === f.id ? (
            <div key={f.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
              <input
                value={form.title}
                onChange={(e) => setForm((x) => ({ ...x, title: e.target.value }))}
                placeholder="제목"
                className="min-w-[120px] rounded border border-gray-300 px-2 py-1 text-sm"
              />
              <input
                value={form.url}
                onChange={(e) => setForm((x) => ({ ...x, url: e.target.value }))}
                placeholder="https://..."
                className="min-w-[200px] flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
              />
              <select
                value={form.category}
                onChange={(e) => setForm((x) => ({ ...x, category: e.target.value }))}
                className="rounded border border-gray-300 px-2 py-1 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleUpdate(f.id, { title: form.title.trim(), url: form.url.trim(), category: form.category || null })}
                disabled={submitting}
                className="rounded bg-blue-600 px-2 py-1 text-sm text-white"
              >
                저장
              </button>
              <button type="button" onClick={() => setEditingId(null)} className="rounded border px-2 py-1 text-sm">
                취소
              </button>
            </div>
          ) : (
            <div
              key={f.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white p-3"
            >
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-gray-900">{f.title}</span>
                {f.category && (
                  <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                    {CATEGORIES.find((c) => c.value === f.category)?.label ?? f.category}
                  </span>
                )}
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {f.url}
                </a>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(f)}
                  className="rounded p-1 text-gray-500 hover:bg-gray-100"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(f.id)}
                  className="rounded p-1 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        )}
      </div>
      {files.length === 0 && !isAddOpen && (
        <p className="py-6 text-center text-sm text-gray-500">등록된 파일(URL)이 없습니다.</p>
      )}

      {isAddOpen && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h4 className="mb-3 font-medium">새 파일(URL)</h4>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500">제목 *</label>
              <input
                value={form.title}
                onChange={(e) => setForm((x) => ({ ...x, title: e.target.value }))}
                className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">URL *</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm((x) => ({ ...x, url: e.target.value }))}
                placeholder="https://..."
                className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">분류</label>
              <select
                value={form.category}
                onChange={(e) => setForm((x) => ({ ...x, category: e.target.value }))}
                className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
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
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                추가
              </button>
              <button type="button" onClick={resetForm} className="rounded-lg border px-3 py-1.5 text-sm">
                취소
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
