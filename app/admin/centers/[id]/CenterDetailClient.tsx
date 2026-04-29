'use client';

import { toast } from 'sonner';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCenterById } from '../actions/centers';
import { updateCenter, deleteCenter, getActiveTeachers } from '../actions/centers';
import {
  getCenterHistory,
  addCenterHistoryEntry,
  updateCenterHistoryEntry,
  deleteCenterHistoryEntry,
} from '../actions/center-history';
import type {
  Center,
  CenterHistoryEntry,
  CenterStatus,
  CriminalCheckFile,
  WeeklyScheduleSlot,
  InstructorsDefault,
  TeacherOption,
} from '@/app/lib/centers/types';
import { devLogger } from '@/app/lib/logging/devLogger';
import { uploadToStorageSigned, getPublicUrl } from '@/app/lib/admin/assets/storageClient';
import {
  ArrowLeft,
  Building2,
  Loader2,
  Pencil,
  Trash2,
  X,
  Plus,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Clock,
  Users,
  AlertCircle,
  BadgeJapaneseYen,
  History,
  FileUp,
  FileText,
} from 'lucide-react';

function formatCenterHistoryDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_STYLES: Record<CenterStatus, string> = {
  active: 'bg-indigo-100 text-indigo-800',
  paused: 'bg-amber-100 text-amber-800',
  ended: 'bg-slate-100 text-slate-600',
};

const STATUS_LABELS: Record<CenterStatus, string> = {
  active: '활성',
  paused: '일시중지',
  ended: '종료',
};

const DAY_OPTIONS = [
  { value: 'mon', label: '월' }, { value: 'tue', label: '화' },
  { value: 'wed', label: '수' }, { value: 'thu', label: '목' },
  { value: 'fri', label: '금' }, { value: 'sat', label: '토' },
  { value: 'sun', label: '일' },
];

const DAY_LABELS: Record<string, string> = {
  mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일',
};

type EditForm = {
  name: string;
  region_tag: string;
  address: string;
  access_note: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  contact_role: string;
  status: CenterStatus;
  contract_start: string;
  contract_end: string;
  session_fee: string;
  main_teacher_id: string;
  main_teacher_2_id: string;
  main_teacher_3_id: string;
  highlights: string;
  weekly_schedule: WeeklyScheduleSlot[];
  instructors_default: InstructorsDefault;
  criminal_check_facility_id: string;
  criminal_check_facility_password: string;
  criminal_check_files: CriminalCheckFile[];
};

const DEFAULT_EDIT_FORM: EditForm = {
  name: '',
  region_tag: '',
  address: '',
  access_note: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  contact_role: '',
  status: 'active',
  contract_start: '',
  contract_end: '',
  session_fee: '',
  main_teacher_id: '',
  main_teacher_2_id: '',
  main_teacher_3_id: '',
  highlights: '',
  weekly_schedule: [],
  instructors_default: { main: null, sub: null, backup: [] },
  criminal_check_facility_id: '',
  criminal_check_facility_password: '',
  criminal_check_files: [],
};

export function CenterDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [center, setCenter] = useState<Center | null>(null);
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>(DEFAULT_EDIT_FORM);
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [history, setHistory] = useState<CenterHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDraft, setHistoryDraft] = useState('');
  const [historySaving, setHistorySaving] = useState(false);
  const [historyEditingId, setHistoryEditingId] = useState<string | null>(null);
  const [historyEditBody, setHistoryEditBody] = useState('');
  const [historyUpdating, setHistoryUpdating] = useState(false);
  const [historyDeletingId, setHistoryDeletingId] = useState<string | null>(null);
  const [criminalUploading, setCriminalUploading] = useState(false);

  const loadCenter = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCenterById(id);
      setCenter(data);
    } catch (err) {
      devLogger.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCenter();
    getActiveTeachers()
      .then(setTeachers)
      .catch((err) => devLogger.error(err));
  }, [loadCenter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      try {
        const rows = await getCenterHistory(id);
        if (!cancelled) setHistory(rows);
      } catch (e) {
        devLogger.error(e);
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleAddHistory = async () => {
    if (!historyDraft.trim()) {
      toast.error('히스토리 내용을 입력해 주세요.');
      return;
    }
    setHistorySaving(true);
    try {
      const res = await addCenterHistoryEntry(id, historyDraft);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setHistoryDraft('');
      const rows = await getCenterHistory(id);
      setHistory(rows);
      toast.success('히스토리를 추가했습니다.');
    } finally {
      setHistorySaving(false);
    }
  };

  const handleDeleteHistoryEntry = async (entryId: string) => {
    if (!confirm('이 히스토리를 삭제할까요?')) return;
    setHistoryDeletingId(entryId);
    try {
      const res = await deleteCenterHistoryEntry(entryId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      // 서버 재조회가 늦거나 캐시가 남아도 UX가 흔들리지 않도록 선제적으로 제거
      setHistory((prev) => prev.filter((x) => x.id !== entryId));
      const rows = await getCenterHistory(id);
      setHistory(rows);
      toast.success('삭제했습니다.');
    } finally {
      setHistoryDeletingId(null);
    }
  };

  const handleSaveHistoryEdit = async (entryId: string) => {
    setHistoryUpdating(true);
    try {
      const res = await updateCenterHistoryEntry(entryId, historyEditBody);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setHistoryEditingId(null);
      setHistoryEditBody('');
      const rows = await getCenterHistory(id);
      setHistory(rows);
      toast.success('히스토리를 수정했습니다.');
    } finally {
      setHistoryUpdating(false);
    }
  };

  const openEditModal = () => {
    if (!center) return;
    setHistoryEditingId(null);
    setHistoryEditBody('');
    const existingSub = center.instructors_default?.sub?.trim() || '';
    const existingBackup = center.instructors_default?.backup ?? [];
    const mergedBackup = Array.from(
      new Set([existingSub, ...existingBackup].map((s) => (s || '').trim()).filter(Boolean))
    );
    setEditForm({
      name: center.name,
      region_tag: center.region_tag ?? '',
      address: center.address ?? '',
      access_note: center.access_note ?? '',
      contact_name: center.contact_name ?? '',
      contact_phone: center.contact_phone ?? '',
      contact_email: center.contact_email ?? '',
      contact_role: center.contact_role ?? '',
      status: center.status,
      contract_start: center.contract_start ?? '',
      contract_end: center.contract_end ?? '',
      session_fee: center.session_fee != null ? String(center.session_fee) : '',
      main_teacher_id: center.main_teacher_id ?? '',
      main_teacher_2_id: center.main_teacher_2_id ?? '',
      main_teacher_3_id: center.main_teacher_3_id ?? '',
      highlights: center.highlights ?? '',
      weekly_schedule: center.weekly_schedule ?? [],
      // "보조/백업"이 중복이라 하나로 운영: 기존 sub+backup을 합쳐서 backup 배열에 보존
      instructors_default: {
        ...(center.instructors_default ?? { main: null, sub: null, backup: [] }),
        sub: null,
        backup: mergedBackup,
      },
      criminal_check_facility_id: center.criminal_check_facility_id ?? '',
      criminal_check_facility_password: center.criminal_check_facility_password ?? '',
      criminal_check_files: center.criminal_check_files ?? [],
    });
    setEditError('');
    setIsEditOpen(true);
  };

  const sanitizeFileName = (name: string) => {
    const raw = (name || '').trim();
    const idx = raw.lastIndexOf('.');
    const base = idx > 0 ? raw.slice(0, idx) : raw;
    const ext = idx > 0 ? raw.slice(idx + 1) : '';

    // Supabase Storage(S3 호환) object key에서 안전한 문자만 허용되도록 정리
    // - 한글/특수문자는 '_'로 치환
    // - 공백은 '_'로 통일
    // - 확장자는 영숫자만 허용
    const safeBase = base
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');

    const safeExt = ext
      .replace(/[^a-zA-Z0-9]+/g, '')
      .toLowerCase();

    const finalBase = safeBase || 'file';
    return safeExt ? `${finalBase}.${safeExt}` : finalBase;
  };

  const handleCriminalFilesAdd = async (files: FileList | null) => {
    if (!center) return;
    const list = files ? Array.from(files) : [];
    if (list.length === 0) return;

    setCriminalUploading(true);
    try {
      for (const file of list) {
        const safeName = sanitizeFileName(file.name || 'file');
        const path = `centers/${center.id}/criminal-check/${Date.now()}_${safeName}`;
        const uploadedPath = await uploadToStorageSigned(path, file, file.type || undefined);
        const nextFiles = [...(center.criminal_check_files ?? []), { name: safeName, path: uploadedPath }];
        const res = await updateCenter(center.id, { criminal_check_files: nextFiles });
        if (res.error) {
          toast.error(res.error);
          return;
        }
        if (res.data) setCenter(res.data);
      }
      toast.success('파일을 업로드했습니다.');
    } catch (err) {
      devLogger.error(err);
      toast.error(err instanceof Error ? err.message : '파일 업로드에 실패했습니다.');
    } finally {
      setCriminalUploading(false);
    }
  };

  const removeCriminalFile = async (idx: number) => {
    if (!center) return;
    const nextFiles = (center.criminal_check_files ?? []).filter((_, i) => i !== idx);
    const res = await updateCenter(center.id, { criminal_check_files: nextFiles });
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (res.data) setCenter(res.data);
    toast.success('첨부를 제거했습니다.');
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
      const rawFee = editForm.session_fee.trim();
      const parsedFee = rawFee !== '' ? parseInt(rawFee, 10) : null;
      const result = await updateCenter(center.id, {
        name: editForm.name.trim(),
        region_tag: editForm.region_tag.trim() || null,
        address: editForm.address.trim() || null,
        access_note: editForm.access_note.trim() || null,
        contact_name: editForm.contact_name.trim() || null,
        contact_phone: editForm.contact_phone.trim() || null,
        contact_email: editForm.contact_email.trim() || null,
        contact_role: editForm.contact_role.trim() || null,
        status: editForm.status,
        contract_start: editForm.contract_start.trim() || null,
        contract_end: editForm.contract_end.trim() || null,
        session_fee: (parsedFee != null && !isNaN(parsedFee)) ? parsedFee : null,
        main_teacher_id: editForm.main_teacher_id.trim() || null,
        main_teacher_2_id: editForm.main_teacher_2_id.trim() || null,
        main_teacher_3_id: editForm.main_teacher_3_id.trim() || null,
        highlights: editForm.highlights.trim() || null,
        weekly_schedule: editForm.weekly_schedule,
        // "보조/백업" 단일 운영: sub는 null 고정, backup 배열만 저장
        instructors_default: { ...editForm.instructors_default, sub: null },
        criminal_check_facility_id: editForm.criminal_check_facility_id.trim() || null,
        criminal_check_facility_password: editForm.criminal_check_facility_password || null,
        criminal_check_files: editForm.criminal_check_files ?? [],
      });
      if (result.error) {
        setEditError(result.error);
        toast.error(result.error);
      } else if (result.data) {
        setCenter(result.data);
        setIsEditOpen(false);
        toast.success('센터 정보를 저장했습니다.');
      }
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!center) return;
    if (!confirm('정말 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return;
    setDeleteSubmitting(true);
    try {
      const result = await deleteCenter(center.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.push('/admin/centers');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const addScheduleSlot = () => {
    setEditForm((f) => ({
      ...f,
      weekly_schedule: [
        ...f.weekly_schedule,
        { day: 'mon', start: '09:00', end: '12:00', place: '', note: '' },
      ],
    }));
  };

  const updateScheduleSlot = (i: number, field: keyof WeeklyScheduleSlot, value: string) => {
    setEditForm((f) => ({
      ...f,
      weekly_schedule: f.weekly_schedule.map((row, idx) =>
        idx === i ? { ...row, [field]: value } : row
      ),
    }));
  };

  const removeScheduleSlot = (i: number) => {
    setEditForm((f) => ({
      ...f,
      weekly_schedule: f.weekly_schedule.filter((_, idx) => idx !== i),
    }));
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-screen bg-slate-50 w-full flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!center) {
    return (
      <div className="flex-1 min-h-screen bg-slate-50 w-full flex flex-col items-center justify-center gap-4 min-h-[60vh]">
        <p className="text-slate-600">센터를 찾을 수 없습니다.</p>
        <Link href="/admin/centers" className="text-indigo-600 hover:underline cursor-pointer">
          센터 목록으로
        </Link>
      </div>
    );
  }

  const schedule = center.weekly_schedule ?? [];
  const instructors = center.instructors_default ?? { main: null, sub: null, backup: [] };

  return (
    <div className="flex-1 min-h-screen bg-slate-50 w-full pb-[env(safe-area-inset-bottom,0px)]">
      <div className="p-4 sm:p-6 md:p-8 min-w-0 max-w-4xl mx-auto">

        {/* 헤더 */}
        <div className="mb-4">
          <Link
            href="/admin/centers"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            센터 목록
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-indigo-600 shrink-0" />
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl leading-tight">
                {center.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[center.status]}`}>
                  {STATUS_LABELS[center.status]}
                </span>
                {center.region_tag && (
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {center.region_tag}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openEditModal}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Pencil className="h-4 w-4" />
              수정
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteSubmitting}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 cursor-pointer"
            >
              {deleteSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              삭제
            </button>
          </div>
        </div>

        {/* 핵심 정보 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">

          {/* 계약 기간 */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              <Calendar className="h-3.5 w-3.5" />
              계약 기간
            </div>
            <p className="text-sm text-slate-700">
              {center.contract_start || center.contract_end
                ? `${center.contract_start ?? '?'} ~ ${center.contract_end ?? '?'}`
                : <span className="text-slate-400">미설정</span>}
            </p>
            <p className="text-sm text-slate-700 mt-2">
              회당:{' '}
              {center.session_fee != null
                ? <span className="font-medium">{center.session_fee.toLocaleString()}원</span>
                : <span className="text-slate-400">미설정</span>}
            </p>
          </div>

          {/* 담당자 */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              <Phone className="h-3.5 w-3.5" />
              담당자
            </div>
            {center.contact_name || center.contact_email || center.contact_phone ? (
              <div className="text-sm text-slate-700 space-y-1">
                {center.contact_name && (
                  <p>
                    <span className="font-medium">{center.contact_name}</span>
                    {center.contact_role && <span className="text-slate-500 ml-1">({center.contact_role})</span>}
                  </p>
                )}
                {center.contact_email && (
                  <p className="flex items-center gap-1.5 text-slate-600">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>{center.contact_email}</span>
                  </p>
                )}
                {center.contact_phone && (
                  <p className="flex items-center gap-1.5 text-slate-600">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>{center.contact_phone}</span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">미설정</p>
            )}
          </div>

          {/* 주소 / 출입 */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              <MapPin className="h-3.5 w-3.5" />
              주소 / 출입
            </div>
            <p className="text-sm text-slate-700">{center.address ?? <span className="text-slate-400">-</span>}</p>
            {center.access_note && (
              <p className="mt-1 text-xs text-slate-500 whitespace-pre-wrap">{center.access_note}</p>
            )}
          </div>

          {/* 특이사항 */}
          {center.highlights && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                <AlertCircle className="h-3.5 w-3.5" />
                특이사항
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{center.highlights}</p>
            </div>
          )}

          {/* 메인 강사 */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              <Users className="h-3.5 w-3.5" />
              메인 강사
            </div>
            <ul className="text-sm text-slate-700 space-y-0.5">
              <li>
                메인 1: <span className="font-medium">{center.main_teacher_name ?? '-'}</span>
              </li>
              <li>
                메인 2: <span className="font-medium">{center.main_teacher_2_name ?? '-'}</span>
              </li>
              <li>
                메인 3: <span className="font-medium">{center.main_teacher_3_name ?? '-'}</span>
              </li>
            </ul>
            {instructors.backup && instructors.backup.length > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                보조/백업: {instructors.backup.join(', ')}
              </p>
            )}
          </div>

          {/* 회보서 관련 정보 */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              <FileText className="h-3.5 w-3.5" />
              회보서 관련 정보
            </div>
            <div className="text-sm text-slate-700 space-y-1">
              <p>
                시설 ID: <span className="font-medium">{center.criminal_check_facility_id ?? '-'}</span>
              </p>
              <p>
                시설 PW:{' '}
                <span className="font-medium break-all">
                  {center.criminal_check_facility_password?.length
                    ? center.criminal_check_facility_password
                    : <span className="text-slate-400 font-normal">미설정</span>}
                </span>
              </p>
              {(center.criminal_check_files?.length ?? 0) > 0 ? (
                <ul className="mt-2 space-y-1">
                  {(center.criminal_check_files ?? []).slice(0, 3).map((f, i) => (
                    <li key={`${f.path}-${i}`} className="text-xs text-slate-500">
                      <a
                        href={getPublicUrl(f.path)}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {f.name}
                      </a>
                    </li>
                  ))}
                  {(center.criminal_check_files?.length ?? 0) > 3 && (
                    <li className="text-xs text-slate-400">+ {center.criminal_check_files.length - 3}개</li>
                  )}
                </ul>
              ) : (
                <p className="text-sm text-slate-400 mt-2">첨부 없음</p>
              )}
            </div>
          </div>

          {/* 주간 시간표 */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              <Clock className="h-3.5 w-3.5" />
              주간 시간표
            </div>
            {schedule.length === 0 ? (
              <p className="text-sm text-slate-400">미설정</p>
            ) : (
              <ul className="space-y-1">
                {schedule.map((s, i) => (
                  <li key={i} className="text-sm text-slate-700">
                    <span className="font-medium w-5 inline-block">{DAY_LABELS[s.day] ?? s.day}</span>
                    {' '}{s.start}~{s.end}
                    {s.place && <span className="text-slate-500 ml-1">{s.place}</span>}
                    {s.note && <span className="text-xs text-slate-400 ml-1">({s.note})</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 수업 / 운영 히스토리 */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            <History className="h-3.5 w-3.5" />
            수업 / 운영 히스토리
          </div>
          {historyLoading ? (
            <p className="text-sm text-slate-400 py-2">불러오는 중…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-400 mb-3">등록된 히스토리가 없습니다.</p>
          ) : (
            <ul className="space-y-3 mb-4 max-h-[28rem] overflow-y-auto pr-1">
              {history.map((h, idx) => (
                <li
                  key={h.id}
                  className="rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5 overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/90 px-3 py-2.5 sm:px-4">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          <Clock className="h-3.5 w-3.5 shrink-0 text-indigo-500" aria-hidden />
                          <time dateTime={h.created_at}>{formatCenterHistoryDate(h.created_at)}</time>
                        </span>
                        {idx === 0 && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-800">
                            최신
                          </span>
                        )}
                      </div>
                      {h.author_name ? (
                        <p className="text-[11px] text-slate-500">작성: {h.author_name}</p>
                      ) : null}
                    </div>
                    {historyEditingId !== h.id && (
                      <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-slate-200/80 bg-white p-0.5">
                        <button
                          type="button"
                          disabled={historyDeletingId === h.id || historyUpdating}
                          onClick={() => {
                            setHistoryEditingId(h.id);
                            setHistoryEditBody(h.body);
                          }}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50 cursor-pointer"
                          title="수정"
                          aria-label="히스토리 수정"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={historyDeletingId === h.id || historyUpdating}
                          onClick={() => void handleDeleteHistoryEntry(h.id)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 cursor-pointer"
                          title="삭제"
                          aria-label="히스토리 삭제"
                        >
                          {historyDeletingId === h.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-3 sm:px-4 sm:py-3.5">
                    {historyEditingId === h.id ? (
                      <div className="space-y-2">
                        <p className="text-[11px] text-slate-500">
                          등록 시각: {formatCenterHistoryDate(h.created_at)}
                        </p>
                        <textarea
                          rows={4}
                          value={historyEditBody}
                          onChange={(e) => setHistoryEditBody(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={historyUpdating}
                            onClick={() => {
                              setHistoryEditingId(null);
                              setHistoryEditBody('');
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            disabled={historyUpdating}
                            onClick={() => void handleSaveHistoryEdit(h.id)}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                          >
                            {historyUpdating ? '저장 중…' : '저장'}
                          </button>
                        </div>
                      </div>
                    ) : h.body.trim() ? (
                      <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{h.body}</p>
                    ) : (
                      <p className="text-sm italic text-slate-400">내용이 비어 있습니다.</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-slate-100 pt-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500">새 기록 추가</p>
            <textarea
              rows={3}
              placeholder="수업·계약·특이사항 등 기록을 남기세요."
              value={historyDraft}
              onChange={(e) => setHistoryDraft(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
            <button
              type="button"
              disabled={historySaving}
              onClick={() => void handleAddHistory()}
              className="inline-flex min-h-[40px] items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              히스토리 추가
            </button>
          </div>
        </div>

        {/* 히스토리 하단: 관련 파일 첨부(누적) */}
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <FileText className="h-3.5 w-3.5" />
              관련 파일 첨부
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{(center.criminal_check_files?.length ?? 0)}개</span>
              <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
                <FileUp className="h-3.5 w-3.5 text-slate-500" />
                {criminalUploading ? '업로드 중…' : '추가'}
                <input
                  type="file"
                  multiple
                  accept=".hwp,.doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                  disabled={criminalUploading}
                  onChange={(e) => void handleCriminalFilesAdd(e.target.files)}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          {(center.criminal_check_files?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-400 mt-2">첨부 없음</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {(center.criminal_check_files ?? []).map((f, i) => (
                <li key={`${f.path}-${i}`} className="flex items-center justify-between gap-2">
                  <a
                    href={getPublicUrl(f.path)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-indigo-600 hover:underline break-all"
                  >
                    {f.name}
                  </a>
                  <button
                    type="button"
                    disabled={criminalUploading}
                    onClick={() => void removeCriminalFile(i)}
                    className="rounded p-1 text-slate-500 hover:bg-white hover:text-red-600 disabled:opacity-50 cursor-pointer"
                    title="삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 수정 모달 (전체 필드) */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-slate-200 max-h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">센터 정보 수정</h2>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="overflow-y-auto flex-1">
              <div className="px-6 py-4 space-y-5">
                {editError && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{editError}</p>
                )}

                {/* 기본 정보 */}
                <fieldset className="space-y-3">
                  <legend className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">기본 정보</legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">센터명 *</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">지역 태그</label>
                      <input
                        type="text"
                        value={editForm.region_tag}
                        onChange={(e) => setEditForm((f) => ({ ...f, region_tag: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">주소</label>
                      <input
                        type="text"
                        value={editForm.address}
                        onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">출입 안내</label>
                      <textarea
                        value={editForm.access_note}
                        onChange={(e) => setEditForm((f) => ({ ...f, access_note: e.target.value }))}
                        rows={2}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                    </div>
                  </div>
                </fieldset>

                {/* 상태 / 계약 */}
                <fieldset className="space-y-3">
                  <legend className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">상태 / 계약</legend>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">상태</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as CenterStatus }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none cursor-pointer"
                      >
                        <option value="active">활성</option>
                        <option value="paused">일시중지</option>
                        <option value="ended">종료</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">계약 시작일</label>
                      <input
                        type="text"
                        placeholder="YYYY-MM-DD"
                        value={editForm.contract_start}
                        onChange={(e) => setEditForm((f) => ({ ...f, contract_start: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">계약 종료일</label>
                      <input
                        type="text"
                        placeholder="YYYY-MM-DD"
                        value={editForm.contract_end}
                        onChange={(e) => setEditForm((f) => ({ ...f, contract_end: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-slate-600 mb-1">회당 수업료 (원)</label>
                      <div className="relative">
                        <BadgeJapaneseYen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          placeholder="예: 50000"
                          value={editForm.session_fee}
                          onChange={(e) => setEditForm((f) => ({ ...f, session_fee: e.target.value }))}
                          className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* 운영 정보 */}
                <fieldset className="space-y-3">
                  <legend className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">운영 정보</legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">메인 강사 1</label>
                      <select
                        value={editForm.main_teacher_id}
                        onChange={(e) => setEditForm((f) => ({ ...f, main_teacher_id: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none cursor-pointer"
                      >
                        <option value="">미선택</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">메인 강사 2</label>
                      <select
                        value={editForm.main_teacher_2_id}
                        onChange={(e) => setEditForm((f) => ({ ...f, main_teacher_2_id: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none cursor-pointer"
                      >
                        <option value="">미선택</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">메인 강사 3</label>
                      <select
                        value={editForm.main_teacher_3_id}
                        onChange={(e) => setEditForm((f) => ({ ...f, main_teacher_3_id: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none cursor-pointer"
                      >
                        <option value="">미선택</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">보조/백업 강사 (쉼표 구분)</label>
                      <input
                        type="text"
                        value={editForm.instructors_default.backup?.join(', ') ?? ''}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            instructors_default: {
                              ...f.instructors_default,
                              sub: null,
                              backup: e.target.value ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : [],
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                    </div>
                  </div>
                </fieldset>

                {/* 회보서 관련 정보 */}
                <fieldset className="space-y-3">
                  <legend className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">회보서 관련 정보</legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">시설 아이디</label>
                      <input
                        type="text"
                        value={editForm.criminal_check_facility_id}
                        onChange={(e) => setEditForm((f) => ({ ...f, criminal_check_facility_id: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">시설 비밀번호</label>
                      <input
                        type="text"
                        autoComplete="off"
                        value={editForm.criminal_check_facility_password}
                        onChange={(e) => setEditForm((f) => ({ ...f, criminal_check_facility_password: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                    </div>
                  </div>
                </fieldset>

                {/* 담당자 */}
                <fieldset className="space-y-3">
                  <legend className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">담당자</legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">이름</label>
                      <input
                        type="text"
                        value={editForm.contact_name}
                        onChange={(e) => setEditForm((f) => ({ ...f, contact_name: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">역할</label>
                      <input
                        type="text"
                        value={editForm.contact_role}
                        onChange={(e) => setEditForm((f) => ({ ...f, contact_role: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">이메일</label>
                      <input
                        type="email"
                        autoComplete="email"
                        value={editForm.contact_email}
                        onChange={(e) => setEditForm((f) => ({ ...f, contact_email: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">전화번호</label>
                      <input
                        type="tel"
                        autoComplete="tel"
                        value={editForm.contact_phone}
                        onChange={(e) => setEditForm((f) => ({ ...f, contact_phone: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                    </div>
                  </div>
                </fieldset>

                {/* 특이사항 */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">특이사항</label>
                  <textarea
                    value={editForm.highlights}
                    onChange={(e) => setEditForm((f) => ({ ...f, highlights: e.target.value }))}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>

                {/* 주간 시간표 */}
                <fieldset className="space-y-2">
                  <div className="flex items-center justify-between">
                    <legend className="text-xs font-semibold uppercase tracking-wider text-slate-400">주간 시간표</legend>
                    <button
                      type="button"
                      onClick={addScheduleSlot}
                      className="text-xs text-indigo-600 hover:underline cursor-pointer"
                    >
                      + 행 추가
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editForm.weekly_schedule.map((row, i) => (
                      <div
                        key={i}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5"
                      >
                        <select
                          value={row.day}
                          onChange={(e) => updateScheduleSlot(i, 'day', e.target.value)}
                          className="rounded border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:outline-none"
                        >
                          {DAY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        <input
                          type="time"
                          value={row.start}
                          onChange={(e) => updateScheduleSlot(i, 'start', e.target.value)}
                          className="rounded border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:outline-none"
                        />
                        <span className="text-slate-400 text-xs">~</span>
                        <input
                          type="time"
                          value={row.end}
                          onChange={(e) => updateScheduleSlot(i, 'end', e.target.value)}
                          className="rounded border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="장소"
                          value={row.place}
                          onChange={(e) => updateScheduleSlot(i, 'place', e.target.value)}
                          className="w-20 rounded border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="비고"
                          value={row.note}
                          onChange={(e) => updateScheduleSlot(i, 'note', e.target.value)}
                          className="flex-1 min-w-[60px] rounded border border-slate-200 px-2 py-1 text-sm focus:border-indigo-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeScheduleSlot(i)}
                          className="rounded p-1 text-red-500 hover:bg-red-50 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {editForm.weekly_schedule.length === 0 && (
                      <p className="text-xs text-slate-400 py-1">시간표 없음</p>
                    )}
                  </div>
                </fieldset>
              </div>

              <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="min-h-[40px] rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="min-h-[40px] rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                >
                  {editSubmitting ? '저장 중…' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
