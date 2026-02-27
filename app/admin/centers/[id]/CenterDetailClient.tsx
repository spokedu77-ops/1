'use client';

import { toast } from 'sonner';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCenterWithRelations } from '../actions/center-detail';
import { updateCenter, deleteCenter } from '../actions/centers';
import { updateCenterNextActions } from '../actions/next-actions';
import type { CenterWithRelations, CenterStatus, NextActionItem } from '@/app/lib/centers/types';
import {
  ArrowLeft,
  Building2,
  Loader2,
  Pencil,
  Trash2,
  X,
  ClipboardList,
  Calendar,
  DollarSign,
  MoreHorizontal,
} from 'lucide-react';
import { CenterOverview } from './CenterOverview';
import { OperationsTab } from './OperationsTab';
import { ProgramsTab } from './ProgramsTab';
import { FinanceTab } from './FinanceTab';
import { MiscTab } from './MiscTab';

const TABS = [
  { id: 'operations', label: '운영', icon: ClipboardList },
  { id: 'programs', label: '프로그램', icon: Calendar },
  { id: 'finance', label: '재무', icon: DollarSign },
  { id: 'misc', label: '기타', icon: MoreHorizontal },
] as const;

type TabId = (typeof TABS)[number]['id'];

function tabFromSearch(tab?: string): TabId {
  const raw = tab || 'operations';
  if (raw === 'logs' || raw === 'files') return 'misc';
  return TABS.some((t) => t.id === raw) ? (raw as TabId) : 'operations';
}

export function CenterDetailClient({
  id,
  tab: tabParam,
}: {
  id: string;
  tab?: string;
}) {
  const tabFromUrlRaw = tabParam || 'operations';
  const tabFromUrl = tabFromSearch(tabParam);
  const router = useRouter();
  const [center, setCenter] = useState<CenterWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>(tabFromUrl);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    region_tag: string;
    address: string;
    access_note: string;
    contact_name: string;
    contact_phone: string;
    contact_role: string;
    status: CenterStatus;
    contract_start: string;
    contract_end: string;
  }>({
    name: '',
    region_tag: '',
    address: '',
    access_note: '',
    contact_name: '',
    contact_phone: '',
    contact_role: '',
    status: 'active',
    contract_start: '',
    contract_end: '',
  });
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const loadCenter = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCenterWithRelations(id);
      setCenter(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCenter();
  }, [loadCenter]);

  useEffect(() => {
    if (tabFromUrlRaw === 'logs' || tabFromUrlRaw === 'files') {
      router.replace(`/admin/centers/${id}?tab=misc`, { scroll: false });
    }
  }, [id, tabFromUrlRaw, router]);

  const handleNextActionToggle = async (item: NextActionItem) => {
    if (!center) return;
    const next = center.next_actions.map((a) =>
      a.id === item.id ? { ...a, done: !a.done } : a
    );
    const result = await updateCenterNextActions(center.id, { next_actions: next });
    if (!result.error) setCenter((c) => (c ? { ...c, next_actions: next } : null));
  };

  const handleNextActionAdd = async (text: string) => {
    if (!center || !text.trim()) return;
    const newItem: NextActionItem = {
      id: crypto.randomUUID(),
      text: text.trim(),
      done: false,
    };
    const next = [...center.next_actions, newItem];
    const result = await updateCenterNextActions(center.id, { next_actions: next });
    if (!result.error) setCenter((c) => (c ? { ...c, next_actions: next } : null));
  };

  const handleNextActionRemove = async (itemId: string) => {
    if (!center) return;
    const next = center.next_actions.filter((a) => a.id !== itemId);
    const result = await updateCenterNextActions(center.id, { next_actions: next });
    if (!result.error) setCenter((c) => (c ? { ...c, next_actions: next } : null));
  };

  const openEditModal = () => {
    if (!center) return;
    setEditForm({
      name: center.name,
      region_tag: center.region_tag ?? '',
      address: center.address ?? '',
      access_note: center.access_note ?? '',
      contact_name: center.contact_name ?? '',
      contact_phone: center.contact_phone ?? '',
      contact_role: center.contact_role ?? '',
      status: center.status,
      contract_start: center.contract_start ?? '',
      contract_end: center.contract_end ?? '',
    });
    setEditError('');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!center) return;
    setEditError('');
    if (!editForm.name.trim()) {
      setEditError('센터명을 입력해주세요.');
      return;
    }
    setEditSubmitting(true);
    try {
      const result = await updateCenter(center.id, {
        name: editForm.name.trim(),
        region_tag: editForm.region_tag.trim() || null,
        address: editForm.address.trim() || null,
        access_note: editForm.access_note.trim() || null,
        contact_name: editForm.contact_name.trim() || null,
        contact_phone: editForm.contact_phone.trim() || null,
        contact_role: editForm.contact_role.trim() || null,
        status: editForm.status,
        contract_start: editForm.contract_start.trim() || null,
        contract_end: editForm.contract_end.trim() || null,
      });
      if (result.error) setEditError(result.error);
      else {
        setIsEditOpen(false);
        loadCenter();
      }
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!center) return;
    if (
      !confirm(
        '정말 삭제할까요? 관련 프로그램·재무·로그·파일 등이 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.'
      )
    )
      return;
    setDeleteSubmitting(true);
    try {
      const result = await deleteCenter(center.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.push('/admin/schedules');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const setTab = (tab: TabId) => {
    setActiveTab(tab);
    router.replace(`/admin/centers/${id}?tab=${tab}`, { scroll: false });
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-screen bg-slate-50 w-full">
        <div className="p-4 sm:p-6 md:p-6 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (!center) {
    return (
      <div className="flex-1 min-h-screen bg-slate-50 w-full">
        <div className="p-4 sm:p-6 md:p-6 flex flex-col items-center justify-center gap-4 min-h-[60vh]">
          <p className="text-slate-600">센터를 찾을 수 없습니다.</p>
          <Link
            href="/admin/schedules"
            className="text-indigo-600 hover:underline cursor-pointer"
          >
            일정 및 센터관리로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-slate-50 w-full pb-[env(safe-area-inset-bottom,0px)]">
      <div className="p-4 sm:p-6 md:p-6 min-w-0">
        <div className="mb-4">
          <Link
            href="/admin/schedules"
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-indigo-600 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            일정 및 센터관리
          </Link>
        </div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            <Building2 className="h-7 w-7 text-indigo-600" />
            {center.name}
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openEditModal}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Pencil className="h-4 w-4" />
              수정
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteSubmitting}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 cursor-pointer"
            >
              {deleteSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              삭제
            </button>
          </div>
        </div>

        <CenterOverview
          center={center}
          onNextActionToggle={handleNextActionToggle}
          onNextActionAdd={handleNextActionAdd}
          onNextActionRemove={handleNextActionRemove}
        />

        <div className="mt-8 -mx-4 px-4 sm:mx-0 sm:px-0">
          <nav className="flex gap-2 overflow-x-auto scrollbar-hide pb-px">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTab(tab.id)}
                className={`flex min-w-[max-content] shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 shadow-sm border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === 'operations' && (
            <OperationsTab center={center} onSaved={loadCenter} />
          )}
          {activeTab === 'programs' && (
            <ProgramsTab centerId={center.id} programs={center.programs} onSaved={loadCenter} />
          )}
          {activeTab === 'finance' && (
            <FinanceTab centerId={center.id} terms={center.finance_terms} onSaved={loadCenter} />
          )}
          {activeTab === 'misc' && (
            <MiscTab
              centerId={center.id}
              logs={center.logs}
              files={center.files}
              onSaved={loadCenter}
            />
          )}
        </div>

        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl border border-slate-200 max-h-[85dvh] overflow-y-auto sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">센터 정보 수정</h2>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                {editError && <p className="text-sm text-red-600">{editError}</p>}
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">센터명 *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">지역 태그</label>
                  <input
                    type="text"
                    value={editForm.region_tag}
                    onChange={(e) => setEditForm((f) => ({ ...f, region_tag: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">주소</label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">출입 안내</label>
                  <textarea
                    value={editForm.access_note}
                    onChange={(e) => setEditForm((f) => ({ ...f, access_note: e.target.value }))}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">담당자명</label>
                  <input
                    type="text"
                    value={editForm.contact_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, contact_name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">연락처</label>
                  <input
                    type="text"
                    value={editForm.contact_phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, contact_phone: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">담당자 역할</label>
                  <input
                    type="text"
                    value={editForm.contact_role}
                    onChange={(e) => setEditForm((f) => ({ ...f, contact_role: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">상태</label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        status: e.target.value as 'active' | 'paused' | 'ended',
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none cursor-pointer"
                  >
                    <option value="active">활성</option>
                    <option value="paused">일시중지</option>
                    <option value="ended">종료</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">계약 시작일</label>
                    <input
                      type="text"
                      placeholder="YYYY-MM-DD"
                      value={editForm.contract_start}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, contract_start: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">계약 종료일</label>
                    <input
                      type="text"
                      placeholder="YYYY-MM-DD"
                      value={editForm.contract_end}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, contract_end: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="min-h-[44px] rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="min-h-[44px] rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                  >
                    {editSubmitting ? '저장 중…' : '저장'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
