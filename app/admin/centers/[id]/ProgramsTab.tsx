'use client';

import { useState } from 'react';
import { createProgram, updateProgram, deleteProgram } from '../actions/programs';
import type { Program } from '@/app/lib/centers/types';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface ProgramsTabProps {
  centerId: string;
  programs: Program[];
  onSaved: () => void;
}

export function ProgramsTab({ centerId, programs, onSaved }: ProgramsTabProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    name: string;
    term: string;
    start_date: string;
    end_date: string;
    sessions_count: string;
    note: string;
    status: Program['status'];
  }>({
    name: '',
    term: '',
    start_date: '',
    end_date: '',
    sessions_count: '',
    note: '',
    status: 'active',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setForm({
      name: '',
      term: '',
      start_date: '',
      end_date: '',
      sessions_count: '',
      note: '',
      status: 'active',
    });
    setError('');
    setEditingId(null);
    setIsAddOpen(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('프로그램명을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await createProgram({
        center_id: centerId,
        name: form.name.trim(),
        term: form.term.trim() || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        sessions_count: form.sessions_count ? parseInt(form.sessions_count, 10) : null,
        note: form.note.trim() || null,
        status: form.status,
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

  const handleUpdate = async (id: string, payload: Partial<Program>) => {
    setError('');
    setSubmitting(true);
    try {
      const result = await updateProgram(id, payload);
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
    if (!confirm('이 프로그램을 삭제할까요?')) return;
    setError('');
    const result = await deleteProgram(id);
    if (result.error) setError(result.error);
    else onSaved();
  };

  const startEdit = (p: Program) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      term: p.term ?? '',
      start_date: p.start_date ?? '',
      end_date: p.end_date ?? '',
      sessions_count: p.sessions_count != null ? String(p.sessions_count) : '',
      note: p.note ?? '',
      status: p.status,
    });
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="min-h-[44px] inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          프로그램 추가
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">이름</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">기간</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">시작/종료</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">회차</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">상태</th>
              <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {programs.map((p) =>
              editingId === p.id ? (
                <tr key={p.id} className="bg-indigo-50/60">
                  <td colSpan={6} className="px-4 py-3">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleUpdate(p.id, {
                          name: form.name.trim(),
                          term: form.term.trim() || null,
                          start_date: form.start_date || null,
                          end_date: form.end_date || null,
                          sessions_count: form.sessions_count ? parseInt(form.sessions_count, 10) : null,
                          note: form.note.trim() || null,
                          status: form.status,
                        });
                      }}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <input
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="이름"
                        className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none w-32"
                        required
                      />
                      <input
                        value={form.term}
                        onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))}
                        placeholder="기간(예: 2026 겨울방학)"
                        className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none w-36"
                      />
                      <input
                        type="date"
                        value={form.start_date}
                        onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
                      />
                      <input
                        type="date"
                        value={form.end_date}
                        onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
                      />
                      <input
                        type="number"
                        value={form.sessions_count}
                        onChange={(e) => setForm((f) => ({ ...f, sessions_count: e.target.value }))}
                        placeholder="회차"
                        className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none w-16"
                      />
                      <select
                        value={form.status}
                        onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Program['status'] }))}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
                      >
                        <option value="active">활성</option>
                        <option value="done">완료</option>
                      </select>
                      <button type="submit" disabled={submitting} className="rounded-lg bg-indigo-600 px-2 py-1 text-sm text-white hover:bg-indigo-700 disabled:opacity-50">
                        저장
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none">
                        취소
                      </button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-sm font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-2 text-sm text-slate-600">{p.term ?? '-'}</td>
                  <td className="px-4 py-2 text-sm text-slate-600">
                    {p.start_date ?? '-'} ~ {p.end_date ?? '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-600">{p.sessions_count ?? '-'}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        p.status === 'active' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {p.status === 'active' ? '활성' : '완료'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="ml-1 rounded p-1 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
      {programs.length === 0 && !isAddOpen && (
        <p className="py-6 text-center text-sm text-slate-500">등록된 프로그램이 없습니다.</p>
      )}

      {isAddOpen && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <h4 className="mb-3 font-medium text-slate-900">새 프로그램</h4>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">이름 *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">기간(예: 2026 겨울방학)</label>
                <input
                  value={form.term}
                  onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))}
                  className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">시작일</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                  className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">종료일</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                  className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">회차 수</label>
                <input
                  type="number"
                  value={form.sessions_count}
                  onChange={(e) => setForm((f) => ({ ...f, sessions_count: e.target.value }))}
                  className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">비고</label>
                <input
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[44px] rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                추가
              </button>
              <button type="button" onClick={resetForm} className="min-h-[44px] rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">
                취소
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
