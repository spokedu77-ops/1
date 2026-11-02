'use client';

import CenterSettlementFields from '../components/CenterSettlementFields';
import { DEFAULT_CENTER_SETTLEMENT, readCenterSettlementDefaults, type CenterSettlementDefaults } from '@/app/lib/centers/settlementDefaults';

import { toast } from 'sonner';
import CenterTeacherFees, { type ResolvedCenterLabor } from '../components/CenterTeacherFees';
import { centerBillingBreakdownSchema, resolveCenterLabor, totalCenterFee } from '@/app/lib/centers/feeBreakdown';
import { centerDisplayName } from '@/app/lib/centers/displayName';
import CenterSettlementPanel from '../components/CenterSettlementPanel';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCenterById } from '../actions/centers';
import {
  updateCenter,
  deleteCenter,
  getActiveTeachers,
  getCenterCriminalCheckPassword,
} from '../actions/centers';
import {
  createCriminalCheckDownloadUrl,
  createCriminalCheckUpload,
  deleteCriminalCheckFile,
  finalizeCriminalCheckUpload,
} from '../actions/criminal-check-files';
import { CRIMINAL_CHECK_MAX_FILE_BYTES } from '@/app/lib/centers/criminalCheckFiles';
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
import { optimizeToWebP, validateImageFormat } from '@/app/lib/admin/assets/imageOptimizer';
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Trash2,
  X,
  Plus,
  Clock,
  History,
  FileUp,
  FileText,
  Eye,
  EyeOff,
  Copy,
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
  active: '운영 중',
  paused: '일시중지',
  ended: '종료',
};

const editControl = 'mt-1 h-10 w-full min-w-0 max-w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';
const editField = 'grid min-w-0 grid-cols-1 items-center gap-x-3 text-sm text-slate-600 sm:grid-cols-[8rem_minmax(0,1fr)] [&>input]:sm:mt-0 [&>select]:sm:mt-0';

const DAY_LABELS: Record<string, string> = {
  mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일',
};

type EditForm = {
  settlement_defaults: CenterSettlementDefaults;
  name: string;
  region_tag: string;
  address: string;
  project_name: string;
  access_note: string;
  contact_name: string;
  contact_phone: string;
  contact_phone_secondary: string;
  contact_email: string;
  contact_role: string;
  status: CenterStatus;
  contract_start: string;
  contract_end: string;
  session_fee: string;
  main_charge: string;
  assist_charge: string;
  rental_charge: string;
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
  settlement_defaults: DEFAULT_CENTER_SETTLEMENT,
  name: '',
  region_tag: '',
  address: '',
  project_name: '',
  access_note: '',
  contact_name: '',
  contact_phone: '',
  contact_phone_secondary: '',
  contact_email: '',
  contact_role: '',
  status: 'active',
  contract_start: '',
  contract_end: '',
  session_fee: '',
  main_charge: '',
  assist_charge: '',
  rental_charge: '',
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

export function CenterDetailClient({ id, onClose, onSaved, onDeleted, registerCloseGuard }: {
  id: string;
  onClose?: () => void;
  onSaved?: (center: Center) => void;
  onDeleted?: () => void;
  registerCloseGuard?: (check: () => boolean) => void;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('basic');
  const [center, setCenter] = useState<Center | null>(null);
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>(DEFAULT_EDIT_FORM);
  const [resolvedLabor, setResolvedLabor] = useState<ResolvedCenterLabor | null>(null);
  const onResolvedFees = useCallback((value: ResolvedCenterLabor) => setResolvedLabor(value), []);
  const assignmentKey = [editForm.main_teacher_id, editForm.main_teacher_2_id, editForm.main_teacher_3_id].join('|');
  const draftLabor = resolvedLabor?.assignmentKey === assignmentKey ? resolveCenterLabor({
    mainId: editForm.main_teacher_id, assistantIds: [editForm.main_teacher_2_id, editForm.main_teacher_3_id],
    fees: resolvedLabor.fees,
  }) : null;
  const parsedBilling = centerBillingBreakdownSchema.safeParse({
    mainCharge: editForm.main_charge.trim() === '' ? null : Number(editForm.main_charge),
    assistCharge: editForm.assist_charge.trim() === '' ? null : Number(editForm.assist_charge),
    rentalCharge: editForm.rental_charge.trim() === '' ? null : Number(editForm.rental_charge),
  });
  const draftBreakdown = parsedBilling.success ? parsedBilling.data : null;
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
  const [criminalDeletingPath, setCriminalDeletingPath] = useState<string | null>(null);
  const [revealedPassword, setRevealedPassword] = useState<string | null | undefined>(undefined);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [passwordDeleteRequested, setPasswordDeleteRequested] = useState(false);
  const editSnapshot = useRef('');
  const editDialog = useRef<HTMLDivElement>(null);
  const initialRequest = useRef<{ id: string; promise: Promise<Center | null> } | null>(null);
  const historyRequest = useRef<{ id: string; promise: Promise<CenterHistoryEntry[]> } | null>(null);
  const teachersRequest = useRef<Promise<TeacherOption[]> | null>(null);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [teachersError, setTeachersError] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const dirty = (isEditOpen && JSON.stringify(editForm) !== editSnapshot.current) ||
    Boolean(historyDraft.trim() || historyEditingId || passwordChanged || passwordDeleteRequested);
  const busy = editSubmitting || deleteSubmitting || criminalUploading || Boolean(criminalDeletingPath) ||
    historySaving || historyUpdating || Boolean(historyDeletingId);
  const canLeave = () => {
    if (busy) { toast.error('진행 중인 작업이 끝난 후 닫아주세요.'); return false; }
    return !dirty || window.confirm('저장하지 않은 변경사항을 버릴까요?');
  };
  const closeEdit = () => { if (canLeave()) { setIsEditOpen(false); setPasswordChanged(false); setPasswordDeleteRequested(false); } };

  useEffect(() => { registerCloseGuard?.(canLeave); });
  useEffect(() => {
    if (!isEditOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    editDialog.current?.querySelector<HTMLInputElement>('input')?.focus();
    return () => previous?.focus({ preventScroll: true });
  }, [isEditOpen]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty, busy]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    if (initialRequest.current?.id !== id) {
      initialRequest.current = { id, promise: getCenterById(id) };
    }
    initialRequest.current.promise.then((data) => { if (!cancelled) setCenter(data); })
      .catch((err) => devLogger.error(err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const loadTeachers = () => {
    setTeachersLoading(true);
    setTeachersError(false);
    const request = teachersRequest.current ?? getActiveTeachers();
    teachersRequest.current = request;
    request.then((rows) => { if (mounted.current) setTeachers(rows); }).catch((err) => {
      teachersRequest.current = null;
      if (mounted.current) setTeachersError(true);
      devLogger.error(err);
    }).finally(() => { if (mounted.current) setTeachersLoading(false); });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      try {
        if (historyRequest.current?.id !== id) historyRequest.current = { id, promise: getCenterHistory(id) };
        const rows = await historyRequest.current.promise;
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
    loadTeachers();
    setHistoryEditingId(null);
    setHistoryEditBody('');
    const [primaryPhone, ...otherPhones] = (center.contact_phone ?? '').split(/\s*\/\s*/);
    setResolvedLabor(null);
    const nextForm: EditForm = {
      settlement_defaults: readCenterSettlementDefaults(center.settlement_defaults),
      name: center.name,
      region_tag: center.region_tag ?? '',
      address: center.address ?? '',
      project_name: center.settlement_defaults?.projectName ?? '',
      access_note: center.access_note ?? '',
      contact_name: center.contact_name ?? '',
      contact_phone: primaryPhone,
      contact_phone_secondary: otherPhones.join(' / '),
      contact_email: center.contact_email ?? '',
      contact_role: center.contact_role ?? '',
      status: center.status,
      contract_start: center.contract_start ?? '',
      contract_end: center.contract_end ?? '',
      session_fee: center.session_fee != null ? String(center.session_fee) : '',
      main_charge: center.settlement_defaults?.billingBreakdown ? String(center.settlement_defaults.billingBreakdown.mainCharge) : '',
      assist_charge: center.settlement_defaults?.billingBreakdown ? String(center.settlement_defaults.billingBreakdown.assistCharge) : '',
      rental_charge: center.settlement_defaults?.billingBreakdown ? String(center.settlement_defaults.billingBreakdown.rentalCharge) : '',
      main_teacher_id: center.main_teacher_id ?? '',
      main_teacher_2_id: center.main_teacher_2_id ?? '',
      main_teacher_3_id: center.main_teacher_3_id ?? '',
      highlights: center.highlights ?? '',
      weekly_schedule: center.weekly_schedule ?? [],
      instructors_default: center.instructors_default ?? { main: null, sub: null, backup: [] },
      criminal_check_facility_id: center.criminal_check_facility_id ?? '',
      criminal_check_facility_password: '',
      criminal_check_files: center.criminal_check_files ?? [],
    };
    setEditForm(nextForm);
    editSnapshot.current = JSON.stringify(nextForm);
    setShowEditPassword(false);
    setPasswordChanged(false);
    setPasswordDeleteRequested(false);
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
        const isRasterImage = validateImageFormat(file).valid;
        const uploadBlob: File = isRasterImage
          ? await optimizeToWebP(file, { maxW: 1920, maxH: 1920, quality: 0.9 })
          : file;
        if (uploadBlob.size > CRIMINAL_CHECK_MAX_FILE_BYTES) {
          toast.error(`${file.name}: 파일 크기는 25MB 이하여야 합니다.`);
          return;
        }
        const safeName = sanitizeFileName(uploadBlob.name || file.name || 'file');
        const contentType = isRasterImage ? 'image/webp' : uploadBlob.type || file.type || undefined;
        const upload = await createCriminalCheckUpload(center.id, safeName, contentType);
        if (!upload.data || upload.error) {
          toast.error(upload.error ?? '업로드 URL을 만들지 못했습니다.');
          return;
        }
        const put = await fetch(upload.data.signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': contentType ?? 'application/octet-stream' },
          body: uploadBlob,
        });
        if (!put.ok) throw new Error(`Storage 업로드 실패: ${put.status} ${put.statusText}`);
        const finalized = await finalizeCriminalCheckUpload(center.id, {
          name: safeName,
          path: upload.data.path,
          bucket: upload.data.bucket,
        });
        if (!finalized.data || finalized.error) {
          toast.error(finalized.error ?? '첨부파일 등록을 완료하지 못했습니다.');
          return;
        }
        setCenter((current) => current ? { ...current, criminal_check_files: finalized.data ?? [] } : current);
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
    const file = center.criminal_check_files?.[idx];
    if (!file || !confirm(`${file.name} 파일을 Storage와 센터 기록에서 삭제할까요?`)) return;
    setCriminalDeletingPath(file.path);
    try {
      const res = await deleteCriminalCheckFile(center.id, file);
      if (!res.data || res.error) {
        toast.error(res.error ?? '파일 삭제에 실패했습니다.');
        return;
      }
      setCenter((current) => current ? { ...current, criminal_check_files: res.data ?? [] } : current);
      toast.success('첨부파일을 삭제했습니다.');
    } finally {
      setCriminalDeletingPath(null);
    }
  };

  const openCriminalFile = async (file: CriminalCheckFile) => {
    if (!center) return;
    const previewWindow = window.open('about:blank', '_blank');
    if (previewWindow) previewWindow.opener = null;
    const result = await createCriminalCheckDownloadUrl(center.id, file);
    if (!result.data || result.error) {
      previewWindow?.close();
      toast.error(result.error ?? '파일을 열지 못했습니다.');
      return;
    }
    if (previewWindow) previewWindow.location.replace(result.data);
    else window.location.assign(result.data);
  };

  const revealCriminalCheckPassword = async () => {
    if (!center) return;
    if (revealedPassword !== undefined) {
      setRevealedPassword(undefined);
      return;
    }
    setPasswordLoading(true);
    try {
      const result = await getCenterCriminalCheckPassword(center.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setRevealedPassword(result.data ?? null);
    } finally {
      setPasswordLoading(false);
    }
  };

  const copyCriminalCheckPassword = async () => {
    if (!revealedPassword) return;
    try {
      await navigator.clipboard.writeText(revealedPassword);
      toast.success('시설 비밀번호를 복사했습니다.');
    } catch {
      toast.error('클립보드 복사에 실패했습니다.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!center) return;
    setEditError('');
    if (!editForm.name.trim()) {
      setEditError('센터명을 입력해주세요.');
      return;
    }
    if (!draftBreakdown || !draftLabor || !resolvedLabor) {
      setEditError('센터 청구 금액 3개와 선생님 지급 강사료를 각각 확인해 주세요. 금액이 없으면 0원을 입력해 주세요.');
      return;
    }
    setEditSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        settlement_defaults: { ...editForm.settlement_defaults, projectName: editForm.project_name.trim(), billingBreakdown: draftBreakdown },
        contract_start: editForm.contract_start || null,
        contract_end: editForm.contract_end || null,
        weekly_schedule: editForm.weekly_schedule,
        name: editForm.name.trim(),
        address: editForm.address.trim() || null,
        access_note: editForm.access_note.trim() || null,
        contact_name: editForm.contact_name.trim() || null,
        contact_phone: [editForm.contact_phone.trim(), editForm.contact_phone_secondary.trim()].filter(Boolean).join(' / ') || null,
        status: editForm.status,
        session_fee: totalCenterFee(draftBreakdown),
        main_teacher_id: editForm.main_teacher_id.trim() || null,
        main_teacher_2_id: editForm.main_teacher_2_id.trim() || null,
        main_teacher_3_id: editForm.main_teacher_3_id.trim() || null,
        highlights: editForm.highlights.trim() || null,
        instructors_default: { ...editForm.instructors_default, fees: [
          ...(editForm.instructors_default.fees ?? []).filter((fee) => !resolvedLabor.fees.some((next) => next.teacher_id === fee.teacher_id && next.role === fee.role)),
          ...resolvedLabor.fees,
        ] },
        criminal_check_facility_id: editForm.criminal_check_facility_id.trim() || null,
      };
      if (passwordDeleteRequested) {
        payload.criminal_check_facility_password = null;
      } else if (passwordChanged && editForm.criminal_check_facility_password.length > 0) {
        payload.criminal_check_facility_password = editForm.criminal_check_facility_password;
      }
      const result = await updateCenter(center.id, payload);
      if (result.error) {
        setEditError(result.error);
        toast.error(result.error);
      } else if (result.data) {
        setCenter(result.data);
        onSaved?.(result.data);
        setRevealedPassword(undefined);
        setPasswordChanged(false);
        setPasswordDeleteRequested(false);
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
      if (onDeleted) onDeleted();
      else router.push('/admin/centers');
    } finally {
      setDeleteSubmitting(false);
    }
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
        <Link href="/admin/centers" onClick={(event) => { if (onClose) { event.preventDefault(); onClose(); } else if (!canLeave()) event.preventDefault(); }} className="text-indigo-600 hover:underline cursor-pointer">
          센터 목록으로
        </Link>
      </div>
    );
  }

  const schedule = center.weekly_schedule ?? [];

  return (
    <div className={`min-w-0 flex-1 ${onClose ? 'min-h-0 bg-white' : 'min-h-screen bg-slate-50'} w-full pb-[env(safe-area-inset-bottom,0px)]`}>
      <div inert={isEditOpen} className="p-3 sm:p-4 min-w-0 max-w-4xl mx-auto">

        {/* 헤더 */}
        {!onClose && <div className="mb-2">
          <Link
            href="/admin/centers"
            onClick={(event) => { if (!canLeave()) event.preventDefault(); }}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            센터 목록
          </Link>
        </div>}

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div>
              <h1 className="break-words text-lg font-semibold tracking-tight text-slate-900 sm:text-xl leading-tight">
                {centerDisplayName(center)}
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

        <CenterTeacherFees ids={[center.main_teacher_id, center.main_teacher_2_id, center.main_teacher_3_id]}
          overrides={center.instructors_default?.fees} sessionFee={center.session_fee} summary
          billingBreakdown={center.settlement_defaults?.billingBreakdown}
          names={[center.main_teacher_name, center.main_teacher_2_name, center.main_teacher_3_name]} />
        <nav aria-label="센터 상세 탭" className="mt-3 mb-2 grid grid-cols-2 border-b border-slate-200">
          {([['basic', '센터 정보'], ['history', '운영기록']] as const).map(([key, label]) => (
            <button key={key} type="button" aria-current={activeTab === key ? 'page' : undefined}
              onClick={() => setActiveTab(key)} className={`min-h-10 border-b-2 px-3 text-sm font-semibold ${activeTab === key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500'}`}>{label}</button>
          ))}
        </nav>
        <div hidden={activeTab !== 'basic'} className="min-w-0 space-y-3">
          <dl className="divide-y divide-slate-100 text-sm">
            {[
              ['주소', center.address || '미설정'],
              ['수업(프로젝트)명', center.settlement_defaults?.projectName || '미설정'],
              ['담당자', [center.contact_name, center.contact_phone, center.contact_email].filter(Boolean).join(' · ') || '미설정'],
              ['수업', schedule.map((slot) => `${DAY_LABELS[slot.day] ?? slot.day} ${slot.start}–${slot.end}${slot.place ? ` · ${slot.place}` : ''}${slot.note ? ` (${slot.note})` : ''}`).join('\n') || '미설정'],
              ...(center.contract_start || center.contract_end ? [['수업 기간', `${center.contract_start || '미설정'} ~ ${center.contract_end || '미설정'}`]] : []),
              ['출입 안내', center.access_note || '미설정'],
              ['운영 메모', center.highlights || '미설정'],
            ].map(([label, value]) => <div key={label} className="grid min-w-0 grid-cols-[8rem_minmax(0,1fr)] gap-3 py-3">
              <dt className="whitespace-nowrap text-slate-500">{label}</dt><dd title={value} className={label === '수업(프로젝트)명' ? 'min-w-0 truncate text-slate-800' : 'min-w-0 whitespace-pre-wrap break-words text-slate-800 [overflow-wrap:anywhere]'}>{value}</dd>
            </div>)}
          </dl>
          {/* 회보서 관련 정보 */}
          <details className="min-w-0 rounded-lg border border-slate-200 bg-white p-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              회보서·시설 인증
            </summary>
            <div className="text-sm text-slate-700 space-y-1">
              <p>
                시설 ID: <span className="font-medium">{center.criminal_check_facility_id ?? '-'}</span>
              </p>
              <p>
                시설 PW:{' '}
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-medium break-all">
                    {revealedPassword === undefined
                      ? '••••••••'
                      : revealedPassword || <span className="text-slate-400 font-normal">미설정</span>}
                  </span>
                  <button
                    type="button"
                    disabled={passwordLoading}
                    onClick={() => void revealCriminalCheckPassword()}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                    aria-label={revealedPassword === undefined ? '시설 비밀번호 조회' : '시설 비밀번호 숨기기'}
                  >
                    {revealedPassword === undefined ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  {revealedPassword ? (
                    <button
                      type="button"
                      onClick={() => void copyCriminalCheckPassword()}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100"
                      aria-label="시설 비밀번호 복사"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </span>
              </p>
              {(center.criminal_check_files?.length ?? 0) > 0 ? (
                <ul className="mt-2 space-y-1">
                  {(center.criminal_check_files ?? []).slice(0, 3).map((f, i) => (
                    <li key={`${f.path}-${i}`} className="text-xs text-slate-500">
                      <button
                        type="button"
                        onClick={() => void openCriminalFile(f)}
                        className="hover:underline"
                      >
                        {f.name}
                      </button>
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
          </details>
          <details className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-medium text-slate-700">정산 추가정보</summary>
            <div className="pt-3"><CenterSettlementPanel defaults={readCenterSettlementDefaults(center.settlement_defaults)} onEdit={openEditModal} /></div>
          </details>
        </div>
        <div hidden={activeTab !== 'history'}>
        {/* 수업 / 운영 히스토리 */}
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-3">
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
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
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
                  accept=".hwp,.doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
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
                  <button
                    type="button"
                    onClick={() => void openCriminalFile(f)}
                    className="text-sm text-indigo-600 hover:underline break-all"
                  >
                    {f.name}
                  </button>
                  <button
                    type="button"
                    disabled={criminalUploading || criminalDeletingPath === f.path}
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
      </div>

      {/* 수정 모달 (전체 필드) */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-2 sm:p-4">
          <div ref={editDialog} role="dialog" aria-modal="true" aria-labelledby="center-edit-heading"
            onKeyDown={(event) => {
              if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeEdit(); }
              if (event.key === 'Tab') {
                const nodes = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary')].filter((node) => node.getClientRects().length > 0);
                const first = nodes[0]; const last = nodes[nodes.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
              }
            }} className="w-full max-w-2xl min-w-0 rounded-xl bg-white shadow-xl border border-slate-200 max-h-[94dvh] flex flex-col xl:max-w-6xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 sm:px-6">
              <h2 id="center-edit-heading" className="text-lg font-semibold tracking-tight text-slate-900">센터 정보 수정</h2>
              <button
                type="button"
                onClick={closeEdit}
                aria-label="센터 정보 수정 닫기"
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {teachersLoading && <p role="status" className="px-6 pt-4 text-sm text-slate-500">강사 목록을 불러오는 중…</p>}
              {teachersError && <button type="button" onClick={loadTeachers} className="px-6 pt-4 text-sm text-red-600">강사 목록 조회 실패 · 다시 시도</button>}
              <div data-center-edit-body className="grid min-h-0 min-w-0 flex-1 grid-cols-1 content-start items-start gap-5 overflow-x-hidden overflow-y-auto px-5 py-5 sm:px-6 xl:grid-cols-2 xl:gap-x-8 [&_label]:text-[13px] [&_legend]:text-[13px]">
                {editError && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg lg:col-span-2">{editError}</p>
                )}

                <fieldset className="min-w-0 space-y-3">
                  <legend className="mb-2 text-xs font-semibold text-slate-500">기본정보</legend>
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_6.5rem] gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                    <label className={editField}>센터명 *<input required value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className={editControl} /></label>
                    <label className="min-w-0 text-xs text-slate-600"><span className="sr-only">상태</span><select aria-label="상태" value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as CenterStatus }))} className={editControl + ' sm:mt-0'}><option value="active">운영 중</option><option value="paused">일시중지</option><option value="ended">종료</option></select></label>
                  </div>
                  <label className={editField}>주소<input value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} className={editControl} /></label>
                  <label className={editField}>수업(프로젝트)명<input maxLength={160} value={editForm.project_name} onChange={(e) => setEditForm((form) => ({ ...form, project_name: e.target.value }))} className={editControl + ' sm:mt-0'} /></label>
                  <label className={editField}>담당자<input value={editForm.contact_name} onChange={(e) => setEditForm((f) => ({ ...f, contact_name: e.target.value }))} className={editControl} /></label>
                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className={editField}>연락처 1<input type="tel" value={editForm.contact_phone} onChange={(e) => setEditForm((f) => ({ ...f, contact_phone: e.target.value }))} className={editControl} /></label>
                    <label className={editField}>연락처 2<input type="tel" value={editForm.contact_phone_secondary} onChange={(e) => setEditForm((f) => ({ ...f, contact_phone_secondary: e.target.value }))} className={editControl} /></label>
                  </div>
                </fieldset>
                <fieldset className="min-w-0 space-y-3 border-t border-slate-100 pt-4">
                  <legend className="text-xs font-semibold text-slate-500">수업 기간·스케줄</legend>
                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="min-w-0 text-xs text-slate-600">수업 시작일<input type="date" value={editForm.contract_start} onChange={(e) => setEditForm((form) => ({ ...form, contract_start: e.target.value }))} className={editControl} /></label>
                    <label className="min-w-0 text-xs text-slate-600">수업 종료일<input type="date" value={editForm.contract_end} onChange={(e) => setEditForm((form) => ({ ...form, contract_end: e.target.value }))} className={editControl} /></label>
                  </div>
                  <div className="space-y-3">
                    {editForm.weekly_schedule.map((slot, index) => <div key={index} className="min-w-0 space-y-3 rounded-lg border border-slate-200 p-2">
                      <div className="grid min-w-0 grid-cols-2 items-center gap-1.5 sm:grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)_2rem]">
                        <select aria-label={`스케줄 ${index + 1} 요일`} value={slot.day} onChange={(e) => setEditForm((form) => ({ ...form, weekly_schedule: form.weekly_schedule.map((row, i) => i === index ? { ...row, day: e.target.value } : row) }))} className={editControl + ' mt-0 px-1'}>{Object.entries(DAY_LABELS).map(([day, label]) => <option key={day} value={day}>{label}요일</option>)}</select>
                        <input aria-label={`스케줄 ${index + 1} 시작`} type="time" value={slot.start} onChange={(e) => setEditForm((form) => ({ ...form, weekly_schedule: form.weekly_schedule.map((row, i) => i === index ? { ...row, start: e.target.value } : row) }))} className={editControl + ' mt-0 px-1'} />
                        <input aria-label={`스케줄 ${index + 1} 종료`} type="time" value={slot.end} onChange={(e) => setEditForm((form) => ({ ...form, weekly_schedule: form.weekly_schedule.map((row, i) => i === index ? { ...row, end: e.target.value } : row) }))} className={editControl + ' mt-0 px-1'} />
                        <button type="button" aria-label={`스케줄 ${index + 1} 삭제`} onClick={() => setEditForm((form) => ({ ...form, weekly_schedule: form.weekly_schedule.filter((_, i) => i !== index) }))} className="inline-flex h-9 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"><X className="h-4 w-4" /></button>
                      </div>
                      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                        <input aria-label={`스케줄 ${index + 1} 장소`} placeholder="장소" value={slot.place} onChange={(e) => setEditForm((form) => ({ ...form, weekly_schedule: form.weekly_schedule.map((row, i) => i === index ? { ...row, place: e.target.value } : row) }))} className={editControl + ' mt-0'} />
                        <input aria-label={`스케줄 ${index + 1} 비고`} placeholder="스케줄 비고" value={slot.note} onChange={(e) => setEditForm((form) => ({ ...form, weekly_schedule: form.weekly_schedule.map((row, i) => i === index ? { ...row, note: e.target.value } : row) }))} className={editControl + ' mt-0'} />
                      </div>
                    </div>)}
                  </div>
                  <button type="button" onClick={() => setEditForm((form) => ({ ...form, weekly_schedule: [...form.weekly_schedule, { day: 'mon', start: '09:00', end: '10:00', place: '', note: '' }] }))} className="min-h-9 text-xs font-medium text-indigo-600">+ 스케줄 추가</button>
                </fieldset>
                <fieldset className="min-w-0 space-y-3 border-t border-slate-100 pt-4">
                  <legend className="text-xs font-semibold text-slate-500">우리가 받는 회당 수업료</legend>
                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
                    {([['주강사비', 'main_charge'], ['보조강사비', 'assist_charge'], ['대여비', 'rental_charge']] as const).map(([label, field]) => <label key={field} className="min-w-0 text-xs text-slate-600">{label}
                      <span className="flex min-w-0 items-center gap-1"><input aria-label={`청구 ${label}`} required type="number" min={0} step={1} max={Number.MAX_SAFE_INTEGER} placeholder="없으면 0 입력" value={editForm[field]} onChange={(e) => setEditForm((form) => ({ ...form, [field]: e.target.value }))} className={editControl + ' text-right tabular-nums'} /><span className="shrink-0">원</span></span>
                    </label>)}
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg bg-indigo-50/70 px-3 py-2 text-sm font-semibold text-indigo-700"><span>총 회당 수업료</span><output aria-label="회당 수업료 합계" className="min-w-0 break-words tabular-nums">{draftBreakdown ? `${totalCenterFee(draftBreakdown).toLocaleString()}원` : '청구 금액을 입력해 주세요.'}</output></div>
                  {!editForm.settlement_defaults.billingBreakdown && <p className="text-xs text-slate-500">기존 회당 수업료: {editForm.session_fee ? `${Number(editForm.session_fee).toLocaleString()}원` : '미설정'} · 청구 항목별 금액을 확인해 입력해 주세요.</p>}
                </fieldset>
                <fieldset className="min-w-0 space-y-3 border-t border-slate-100 pt-4 xl:row-span-4">
                  <legend className="text-xs font-semibold text-slate-500">선생님이 받는 강사료</legend>
                  <CenterTeacherFees ids={[editForm.main_teacher_id, editForm.main_teacher_2_id, editForm.main_teacher_3_id]}
                    onResolvedFees={onResolvedFees}
                    names={[center.main_teacher_name, center.main_teacher_2_name, center.main_teacher_3_name]}
                    teachers={teachers} onTeacherChange={(index, id) => setEditForm((form) => ({ ...form, [(['main_teacher_id', 'main_teacher_2_id', 'main_teacher_3_id'] as const)[index]]: id }))}
                    overrides={editForm.instructors_default.fees}
                    onFeesChange={(fees) => setEditForm((form) => ({ ...form, instructors_default: { ...form.instructors_default, fees } }))} />
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800"><span>강사료 합계 (인건비 / 회)</span><output aria-label="강사료 인건비 합계" className="min-w-0 break-words tabular-nums">{draftLabor ? `${(draftLabor.mainFee + draftLabor.assistFee).toLocaleString()}원` : '강사 지급 금액 확인'}</output></div>
                  <p className="text-xs leading-5 text-slate-500">센터 청구 수업료와 선생님 지급 인건비를 정산에 각각 반영합니다.</p>
                </fieldset>
                <details className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 xl:col-start-1">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-600">운영 메모<span className="ml-2 font-normal text-slate-400">출입 안내·특이사항</span></summary>
                  <div className="grid min-w-0 grid-cols-1 gap-3 pt-3 sm:grid-cols-2">
                    <label className="min-w-0 text-xs text-slate-600">출입 안내<textarea aria-label="출입 안내" rows={5} value={editForm.access_note} onChange={(e) => setEditForm((f) => ({ ...f, access_note: e.target.value }))} className={editControl + ' h-auto min-h-28 py-2'} /></label>
                    <label className="min-w-0 text-xs text-slate-600">특이사항<textarea aria-label="특이사항" rows={5} value={editForm.highlights} onChange={(e) => setEditForm((f) => ({ ...f, highlights: e.target.value }))} className={editControl + ' h-auto min-h-28 py-2'} /></label>
                  </div>
                </details>
                <details className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 xl:col-start-1"><summary className="cursor-pointer text-xs font-semibold text-slate-600">정산 추가설정</summary>
                  <div className="pt-3"><CenterSettlementFields value={editForm.settlement_defaults} onChange={(settlement_defaults) => setEditForm((form) => ({ ...form, settlement_defaults }))} /></div>
                </details>
                {/* 회보서 관련 정보 */}
                <details className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 xl:col-start-1"><summary className="cursor-pointer text-xs font-semibold text-slate-600">회보서 관련 정보</summary><div className="pt-3"><fieldset className="space-y-3 border-b border-slate-100 pb-3">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">시설 아이디</label>
                      <input
                        type="text"
                        value={editForm.criminal_check_facility_id}
                        onChange={(e) => setEditForm((f) => ({ ...f, criminal_check_facility_id: e.target.value }))}
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">시설 비밀번호</label>
                      <div className="relative">
                        <input
                          type={showEditPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={editForm.criminal_check_facility_password}
                          disabled={passwordDeleteRequested}
                          placeholder="변경할 때만 입력"
                          onChange={(e) => {
                            setPasswordChanged(true);
                            setEditForm((f) => ({ ...f, criminal_check_facility_password: e.target.value }));
                          }}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none disabled:bg-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditPassword((value) => !value)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100"
                          aria-label={showEditPassword ? '입력 비밀번호 숨기기' : '입력 비밀번호 보기'}
                        >
                          {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <label className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <input
                          type="checkbox"
                          checked={passwordDeleteRequested}
                          onChange={(e) => {
                            setPasswordDeleteRequested(e.target.checked);
                            if (e.target.checked) {
                              setPasswordChanged(false);
                              setEditForm((f) => ({ ...f, criminal_check_facility_password: '' }));
                            }
                          }}
                        />
                        저장된 비밀번호 삭제
                      </label>
                    </div>
                  </div>
                </fieldset></div></details>



              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="min-h-[40px] rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting || teachersLoading || teachersError}
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
