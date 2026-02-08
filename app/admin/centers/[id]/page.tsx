'use client';

import { useState, useEffect, useCallback, use } from 'react';
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
  FileText,
  FolderOpen,
} from 'lucide-react';
import { CenterOverview } from './CenterOverview';
import { OperationsTab } from './OperationsTab';
import { ProgramsTab } from './ProgramsTab';
import { FinanceTab } from './FinanceTab';
import { LogsTab } from './LogsTab';
import { FilesTab } from './FilesTab';

const TABS = [
  { id: 'operations', label: 'Operations', icon: ClipboardList },
  { id: 'programs', label: 'Programs', icon: Calendar },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'logs', label: 'Logs', icon: FileText },
  { id: 'files', label: 'Files', icon: FolderOpen },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function CenterDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const resolvedParams = use(params);
  const resolvedSearch = use(searchParams);
  const router = useRouter();
  const id = resolvedParams.id;
  const tabFromUrl = (resolvedSearch.tab as TabId) || 'operations';
  const [center, setCenter] = useState<CenterWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.some((t) => t.id === tabFromUrl) ? tabFromUrl : 'operations'
  );
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
        alert(result.error);
        return;
      }
      router.push('/admin/centers');
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
      <div className="flex-1 min-h-screen bg-gray-50 w-full">
        <div className="p-4 sm:p-6 md:p-6 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!center) {
    return (
      <div className="flex-1 min-h-screen bg-gray-50 w-full">
        <div className="p-4 sm:p-6 md:p-6 flex flex-col items-center justify-center gap-4 min-h-[60vh]">
          <p className="text-gray-600">센터를 찾을 수 없습니다.</p>
          <Link
            href="/admin/centers"
            className="text-blue-600 hover:underline"
          >
            목록으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-gray-50 w-full">
      <div className="p-4 sm:p-6 md:p-6">
        <div className="mb-4">
          <Link
            href="/admin/centers"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            센터 목록
          </Link>
        </div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Building2 className="h-7 w-7 text-blue-600" />
            {center.name}
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openEditModal}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4" />
              수정
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteSubmitting}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
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

        <div className="mt-8 border-b border-gray-200">
          <nav className="-mb-px flex gap-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
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
          {activeTab === 'logs' && (
            <LogsTab centerId={center.id} logs={center.logs} onSaved={loadCenter} />
          )}
          {activeTab === 'files' && (
            <FilesTab centerId={center.id} files={center.files} onSaved={loadCenter} />
          )}
        </div>

        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">센터 정보 수정</h2>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                {editError && <p className="text-sm text-red-600">{editError}</p>}
                <div>
                  <label className="block text-sm font-medium text-gray-700">센터명 *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">지역 태그</label>
                  <input
                    type="text"
                    value={editForm.region_tag}
                    onChange={(e) => setEditForm((f) => ({ ...f, region_tag: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">주소</label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">출입 안내</label>
                  <textarea
                    value={editForm.access_note}
                    onChange={(e) => setEditForm((f) => ({ ...f, access_note: e.target.value }))}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">담당자명</label>
                  <input
                    type="text"
                    value={editForm.contact_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, contact_name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">연락처</label>
                  <input
                    type="text"
                    value={editForm.contact_phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, contact_phone: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">담당자 역할</label>
                  <input
                    type="text"
                    value={editForm.contact_role}
                    onChange={(e) => setEditForm((f) => ({ ...f, contact_role: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">상태</label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        status: e.target.value as 'active' | 'paused' | 'ended',
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="active">활성</option>
                    <option value="paused">일시중지</option>
                    <option value="ended">종료</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">계약 시작일</label>
                    <input
                      type="text"
                      placeholder="YYYY-MM-DD"
                      value={editForm.contract_start}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, contract_start: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">계약 종료일</label>
                    <input
                      type="text"
                      placeholder="YYYY-MM-DD"
                      value={editForm.contract_end}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, contract_end: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
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
