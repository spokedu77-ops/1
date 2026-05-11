'use client';

import type { ElementType } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n, useTranslator } from '@/app/providers/I18nProvider';
import type { UiLocale } from '@/app/lib/i18n/constants';
import {
  AlertCircle,
  Award,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  CloudOff,
  Crown,
  Pencil,
  Plus,
  RefreshCw,
  Share2,
  Shuffle,
  Trash2,
  UserPlus,
  Users,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { SubscriberBadge, SubscriberButton } from '../components/SubscriberWorkspacePrimitives';
import {
  LEVEL_LABELS,
  PHYSICAL_LABELS,
  type AttendanceStatus,
  type PhysicalFunctions,
  type PhysicalLevel,
  type Student,
  useStudentStore,
} from '../hooks/useStudentStore';
import { type ClassGroup, useClassStore } from '../hooks/useClassStore';
import { type Badge, useBadgeStore } from '../hooks/useBadgeStore';
import { useProContext } from '../hooks/useProContext';

const ALL_CLASSES = '전체';
const UNASSIGNED_CLASS = '미분류';

function normalizeClassGroup(value?: string | null): string {
  if (!value) return UNASSIGNED_CLASS;
  if (value === '誘몃텇瑜?' || value.includes('誘몃텇')) return UNASSIGNED_CLASS;
  return value;
}

function makeBadgeTitle(tr: (text: string) => string, strengthSummary: string): string {
  return strengthSummary ? `${tr('이번 주의')} ${tr(strengthSummary)}` : tr('성장 배지');
}

function intlLocaleTag(ui: UiLocale): string {
  switch (ui) {
    case 'ko':
      return 'ko-KR';
    case 'ja':
      return 'ja-JP';
    case 'zh':
      return 'zh-CN';
    case 'es':
      return 'es-ES';
    default:
      return 'en-US';
  }
}

function ClassLimitModal({
  plan,
  limit,
  onClose,
  onGoToSettings,
}: {
  plan: string;
  limit: number;
  onClose: () => void;
  onGoToSettings: () => void;
}) {
  const tr = useTranslator();
  const isFree = plan === 'free';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-slate-700 bg-slate-800 p-7 shadow-2xl">
        <div className="flex items-center gap-3">
          {isFree ? <Zap className="h-6 w-6 shrink-0 text-blue-400" /> : <Crown className="h-6 w-6 shrink-0 text-amber-400" />}
          <h3 className="text-lg font-black text-white">{isFree ? tr('Basic으로 업그레이드') : tr('Pro로 업그레이드')}</h3>
        </div>
        <p className="text-sm leading-relaxed text-slate-300">
          {tr('현재 플랜에서는 반을')} <span className="font-bold text-white">{limit}{tr('개')}</span>{tr('까지 만들 수 있습니다.')}
          <br />
          {isFree
            ? tr('Basic 플랜으로 업그레이드하면 반 3개까지 관리할 수 있어요.')
            : tr('Pro 플랜으로 업그레이드하면 반 개수 제한 없이 관리할 수 있어요.')}
        </p>
        <div className="flex gap-3">
          <SubscriberButton tone="slate" wide onClick={onClose}>
            {tr('닫기')}
          </SubscriberButton>
          <SubscriberButton
            tone="blue"
            wide
            onClick={() => {
              onGoToSettings();
              onClose();
            }}
          >
            {tr('설정에서 업그레이드')}
          </SubscriberButton>
        </div>
      </div>
    </div>
  );
}

function ClassManagerPanel({
  classes,
  classLimit,
  studentsByClass,
  onCreateClass,
  onRenameClass,
  onDeleteClass,
}: {
  classes: ClassGroup[];
  classLimit: number | null;
  studentsByClass: Record<string, number>;
  onCreateClass: (name: string) => void;
  onRenameClass: (id: string, name: string) => void;
  onDeleteClass: (id: string) => void;
}) {
  const tr = useTranslator();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [nameError, setNameError] = useState('');
  const isAtLimit = classLimit !== null && classes.length >= classLimit;

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setNameError('반 이름을 입력해 주세요.');
      return;
    }
    if (classes.some((item) => item.name === trimmed)) {
      setNameError('이미 같은 이름의 반이 있습니다.');
      return;
    }
    setNameError('');
    onCreateClass(trimmed);
    setNewName('');
  };

  const handleRenameSubmit = (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    if (classes.some((item) => item.name === trimmed && item.id !== id)) {
      setNameError('이미 같은 이름의 반이 있습니다.');
      return;
    }
    setNameError('');
    onRenameClass(id, trimmed);
    setEditingId(null);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{tr('반 관리')}</p>
        {classLimit !== null ? (
          <span className="text-xs tabular-nums text-slate-500">
            <span className={isAtLimit ? 'font-bold text-amber-400' : 'text-slate-400'}>{classes.length}</span>/{classLimit}{tr('개')}
          </span>
        ) : null}
      </div>

      {classes.length === 0 ? (
        <p className="py-2 text-sm text-slate-500">{tr('등록된 반이 없습니다. 첫 반을 만들어 보세요.')}</p>
      ) : (
        <ul className="space-y-2">
          {classes.map((item) => (
            <li key={item.id} className="flex items-center gap-2 rounded-xl bg-slate-700/40 px-4 py-2.5">
              {editingId === item.id ? (
                <form
                  className="flex flex-1 items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleRenameSubmit(item.id);
                  }}
                >
                  <input
                    type="text"
                    value={editName}
                    onChange={(event) => {
                      setEditName(event.target.value);
                      setNameError('');
                    }}
                    autoFocus
                    className="flex-1 rounded-lg border border-blue-500 bg-slate-900 px-3 py-1 text-sm text-white outline-none"
                  />
                  <button type="submit" className="text-xs font-bold text-blue-400 hover:text-blue-300">{tr('저장')}</button>
                  <button type="button" onClick={() => setEditingId(null)} className="text-xs text-slate-500 hover:text-slate-300">{tr('취소')}</button>
                </form>
              ) : (
                <>
                  <span className="flex-1 text-sm font-bold text-white">{item.name}</span>
                  <span className="text-xs tabular-nums text-slate-500">{studentsByClass[item.name] ?? 0}{tr('명')}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(item.id);
                      setEditName(item.name);
                      setNameError('');
                    }}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-600 hover:text-white"
                    aria-label={tr('반 이름 수정')}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(tr(`"${item.name}" 반을 삭제할까요? 해당 반의 학생은 미분류로 이동합니다.`))) onDeleteClass(item.id);
                    }}
                    className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-900/40 hover:text-red-400"
                    aria-label={tr('반 삭제')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {nameError ? <p className="text-xs text-red-400">{tr(nameError)}</p> : null}

      <div className="flex gap-2 pt-1">
        <input
          type="text"
          placeholder={tr('새 반 이름')}
          value={newName}
          onChange={(event) => {
            setNewName(event.target.value);
            setNameError('');
          }}
          onKeyDown={(event) => event.key === 'Enter' && !isAtLimit && handleCreate()}
          disabled={isAtLimit}
          className="flex-1 rounded-xl border border-slate-600 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500 disabled:opacity-40"
        />
        <SubscriberButton
          tone="blue"
          size="sm"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => {
            if (isAtLimit) {
              onCreateClass('__limit__');
              return;
            }
            handleCreate();
          }}
        >
          {tr('반 추가')}
        </SubscriberButton>
      </div>

      {isAtLimit ? (
        <p className="flex items-center gap-1 text-xs text-amber-400">
          <AlertCircle className="h-3.5 w-3.5" />
          {tr('플랜 한도에 도달했습니다. 업그레이드하면 더 많은 반을 만들 수 있어요.')}
        </p>
      ) : null}
    </div>
  );
}

function LevelButton({ value, current, onChange }: { value: PhysicalLevel; current: PhysicalLevel; onChange: (value: PhysicalLevel) => void }) {
  const tr = useTranslator();
  const colors: Record<PhysicalLevel, string> = {
    1: 'bg-red-500/20 text-red-400 border-red-500/50',
    2: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
    3: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
  };
  const active: Record<PhysicalLevel, string> = {
    1: 'bg-red-500 text-white border-red-500',
    2: 'bg-amber-500 text-white border-amber-500',
    3: 'bg-emerald-500 text-white border-emerald-500',
  };

  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`h-8 w-12 rounded-lg border text-xs font-bold transition-all ${current === value ? active[value] : `${colors[value]} hover:opacity-80`}`}
    >
      {tr(LEVEL_LABELS[value])}
    </button>
  );
}

function StudentCard({
  student,
  onCycleStatus,
  onRemove,
  onUpdatePhysical,
}: {
  student: Student;
  onCycleStatus: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdatePhysical: (id: string, key: keyof PhysicalFunctions, value: PhysicalLevel) => void;
}) {
  const tr = useTranslator();
  const [expanded, setExpanded] = useState(false);
  const statusConfig: Record<AttendanceStatus, { label: string; icon: ElementType; cls: string }> = {
    present: { label: '출석', icon: CheckCircle, cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
    absent: { label: '결석', icon: XCircle, cls: 'bg-slate-700 text-slate-400 border-slate-600' },
    late: { label: '지각', icon: Clock, cls: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  };
  const cfg = statusConfig[student.status];
  const StatusIcon = cfg.icon;
  const totalScore = Object.values(student.physical).reduce((a, b) => a + b, 0);
  const maxScore = 15;
  const pct = Math.round((totalScore / maxScore) * 100);

  return (
    <div className="w-full min-w-0 rounded-2xl border border-slate-700 bg-slate-800/60">
      <div className="space-y-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-600 bg-slate-700 text-lg font-bold text-white">
            {student.name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black text-white">{student.name}</p>
            <p className="text-xs font-medium text-slate-400">{normalizeClassGroup(student.classGroup)}</p>
          </div>
          <div className="hidden w-28 shrink-0 items-center gap-2 sm:flex">
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-700">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="shrink-0 text-xs font-bold text-slate-400">{totalScore}/{maxScore}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => onCycleStatus(student.id)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${cfg.cls}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {tr(cfg.label)}
            </button>
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="rounded-lg bg-slate-700 p-2 text-slate-300 transition-colors hover:bg-slate-600"
              aria-label={tr('신체 기능 펼치기')}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(tr(`"${student.name}" 학생을 삭제할까요?`))) onRemove(student.id);
              }}
              className="rounded-lg bg-slate-700 p-2 text-slate-500 transition-colors hover:bg-red-900/40 hover:text-red-400"
              aria-label={tr('삭제')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {expanded ? (
        <div className="overflow-x-auto border-t border-slate-700 bg-slate-900/40 p-4">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
            {tr('신체 기능 평가는 팀 나누기와 활동 추천에 사용됩니다.')}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(Object.keys(PHYSICAL_LABELS) as (keyof PhysicalFunctions)[]).map((key) => (
              <div key={key} className="flex min-w-[200px] items-center justify-between gap-2">
                <span className="shrink-0 text-sm font-semibold text-slate-300">{tr(PHYSICAL_LABELS[key])}</span>
                <div className="flex shrink-0 gap-1">
                  {([1, 2, 3] as PhysicalLevel[]).map((level) => (
                    <LevelButton key={level} value={level} current={student.physical[key]} onChange={(value) => onUpdatePhysical(student.id, key, value)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function DataCenterView({
  onOpenSettings,
  onGoToAssistantTools,
  attendanceInlineClassGroup = null,
}: {
  onOpenSettings?: () => void;
  onGoToAssistantTools?: () => void;
  attendanceInlineClassGroup?: string | null;
}) {
  const tr = useTranslator();
  const { locale } = useI18n();
  const {
    students,
    loaded: studentsLoaded,
    syncing,
    syncError,
    refetch,
    addStudent,
    removeStudent,
    cycleStatus,
    setAttendanceStatus,
    markAllPresent,
    updatePhysical,
  } = useStudentStore();
  const { classes, loaded: classesLoaded, createClass, renameClass, deleteClass } = useClassStore();
  const { badges, loaded: badgesLoaded } = useBadgeStore();
  const { ctx } = useProContext();

  const classLimit = ctx.usage.classLimit ?? null;
  const [filterGroup, setFilterGroup] = useState(ALL_CLASSES);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [nameError, setNameError] = useState('');
  const [showClassManager, setShowClassManager] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ plan: string; limit: number } | null>(null);
  const [attendanceRange, setAttendanceRange] = useState<{ date: string; records: Record<string, AttendanceStatus> }[]>([]);
  const [attendanceRangeError, setAttendanceRangeError] = useState(false);
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => setChartsReady(true), []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/spokedu-pro/attendance/range?days=30')
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !json?.ok || !Array.isArray(json.days)) {
          setAttendanceRangeError(true);
          return;
        }
        setAttendanceRange(json.days);
        setAttendanceRangeError(false);
      })
      .catch(() => {
        if (!cancelled) setAttendanceRangeError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const prevSyncError = useRef<string | null>(null);
  useEffect(() => {
    if (prevSyncError.current && !syncError) toast.success(tr('서버와 다시 연결되었습니다.'));
    prevSyncError.current = syncError;
  }, [syncError, tr]);

  const filteredStudents = useMemo(
    () => (filterGroup === ALL_CLASSES ? students : students.filter((student) => normalizeClassGroup(student.classGroup) === filterGroup)),
    [students, filterGroup]
  );

  const studentsByClass = useMemo(() => {
    const map: Record<string, number> = {};
    for (const student of students) {
      const classGroup = normalizeClassGroup(student.classGroup);
      map[classGroup] = (map[classGroup] ?? 0) + 1;
    }
    return map;
  }, [students]);

  const presentCount = filteredStudents.filter((student) => student.status === 'present').length;

  const attendanceChartPoints = useMemo(() => {
    if (attendanceRange.length === 0) return [];
    const idSet = new Set(filteredStudents.map((student) => student.id));
    const total = filteredStudents.length;
    return attendanceRange.map(({ date, records }) => {
      let attended = 0;
      for (const [studentId, status] of Object.entries(records)) {
        if (!idSet.has(studentId)) continue;
        if (status === 'present' || status === 'late') attended += 1;
      }
      return {
        dateShort: date.slice(5).replace('-', '/'),
        date,
        rate: total > 0 ? Math.round((attended / total) * 100) : 0,
        attended,
        total,
      };
    });
  }, [attendanceRange, filteredStudents]);

  const classRadarData = useMemo(() => {
    if (filteredStudents.length === 0) return [];
    const keys = Object.keys(PHYSICAL_LABELS) as (keyof PhysicalFunctions)[];
    return keys.map((key) => {
      const sum = filteredStudents.reduce((acc, student) => acc + student.physical[key], 0);
      return { subject: tr(PHYSICAL_LABELS[key]), value: (sum / filteredStudents.length) * 33.3 };
    });
  }, [filteredStudents, tr]);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setNameError('이름을 입력해 주세요.');
      return;
    }
    addStudent(trimmed, newGroup || UNASSIGNED_CLASS);
    setNewName('');
    setNameError('');
    setShowAddForm(false);
  };

  const handleCreateClass = useCallback(async (name: string) => {
    if (name === '__limit__') {
      setLimitInfo({ plan: ctx.entitlement.plan, limit: classLimit ?? 0 });
      setShowLimitModal(true);
      return;
    }
    const result = await createClass(name);
    if ('error' in result && result.error === 'class_limit_exceeded') {
      const err = result as { plan: string; limit: number };
      setLimitInfo({ plan: err.plan, limit: err.limit });
      setShowLimitModal(true);
    } else if ('id' in result && newGroup === '') {
      setNewGroup(result.name);
    }
  }, [createClass, classLimit, ctx.entitlement.plan, newGroup]);

  const handleDeleteClass = useCallback(async (id: string) => {
    const targetName = classes.find((item) => item.id === id)?.name;
    await deleteClass(id);
    if (filterGroup !== ALL_CLASSES && targetName && filterGroup === targetName) setFilterGroup(ALL_CLASSES);
  }, [deleteClass, filterGroup, classes]);

  const handleBadgeKakaoShare = useCallback((badge: Badge) => {
    const title = makeBadgeTitle(tr, badge.strengthSummary);
    const growthLine = badge.growthTag ? `${tr(badge.growthTag)}\n` : '';
    const text = `${badge.studentName} · ${title}\n${growthLine}\n- ${tr('스포키듀 성장 배지')}`;
    void navigator.clipboard.writeText(text).catch(() => {});
  }, [tr]);

  const isLoaded = studentsLoaded && classesLoaded;

  if (!isLoaded) {
    return (
      <section className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>{tr('데이터를 불러오는 중...')}</span>
        </div>
      </section>
    );
  }

  if (attendanceInlineClassGroup != null && attendanceInlineClassGroup !== '') {
    return (
      <AttendanceInline
        classGroup={attendanceInlineClassGroup}
        students={students.filter((student) => normalizeClassGroup(student.classGroup) === attendanceInlineClassGroup)}
        onSetAttendance={setAttendanceStatus}
      />
    );
  }

  return (
    <section className="mx-auto max-w-5xl space-y-8 px-6 py-10 pb-32 lg:px-12">
      {showLimitModal && limitInfo ? (
        <ClassLimitModal
          plan={limitInfo.plan}
          limit={limitInfo.limit}
          onClose={() => setShowLimitModal(false)}
          onGoToSettings={onOpenSettings ?? (() => {})}
        />
      ) : null}

      <header className="space-y-3 border-b border-slate-800 pb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-400">
          <Users className="h-4 w-4" /> {tr('학생 관리 및 평가')}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-4xl font-black tracking-tight text-white">{tr('출석부 & 신체 기능 평가')}</h2>
            <p className="font-medium text-slate-400">
              {tr('출석을 관리하고 신체 기능을 평가하세요. 평가 데이터는 수업 보조 도구의 학생 뽑기와 팀 나누기에 사용됩니다.')}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {onGoToAssistantTools ? (
              <SubscriberButton tone="purple" size="sm" icon={<Shuffle className="h-4 w-4" />} onClick={onGoToAssistantTools}>
                {tr('수업 보조 도구')}
              </SubscriberButton>
            ) : null}
            <SubscriberButton tone="slate" size="sm" icon={<Pencil className="h-4 w-4" />} onClick={() => setShowClassManager((value) => !value)}>
              {tr('반 관리')}
            </SubscriberButton>
          </div>
        </div>
      </header>

      {showClassManager ? (
        <ClassManagerPanel
          classes={classes}
          classLimit={classLimit}
          studentsByClass={studentsByClass}
          onCreateClass={handleCreateClass}
          onRenameClass={renameClass}
          onDeleteClass={handleDeleteClass}
        />
      ) : null}

      <SyncStatus syncError={syncError} syncing={syncing} refetch={refetch} />

      {(attendanceChartPoints.length > 0 || classRadarData.length > 0) ? (
        <DataCharts
          attendanceChartPoints={attendanceChartPoints}
          classRadarData={classRadarData}
          attendanceRangeError={attendanceRangeError}
          chartsReady={chartsReady}
        />
      ) : null}

      <Toolbar
        filterGroup={filterGroup}
        classes={classes}
        students={students}
        filteredStudents={filteredStudents}
        presentCount={presentCount}
        onFilterChange={setFilterGroup}
        onMarkAllPresent={() => markAllPresent(filteredStudents.map((student) => student.id))}
        onToggleAdd={() => setShowAddForm((value) => !value)}
      />

      {showAddForm ? (
        <AddStudentForm
          classes={classes}
          newName={newName}
          newGroup={newGroup}
          nameError={nameError}
          onNameChange={(value) => {
            setNewName(value);
            setNameError('');
          }}
          onGroupChange={setNewGroup}
          onSubmit={handleAdd}
          onCancel={() => {
            setShowAddForm(false);
            setNewName('');
            setNewGroup('');
            setNameError('');
          }}
          onOpenClassManager={() => setShowClassManager(true)}
        />
      ) : null}

      {filteredStudents.length > 0 ? (
        <AttendanceProgress presentCount={presentCount} total={filteredStudents.length} />
      ) : null}

      {filteredStudents.length === 0 ? (
        <EmptyStudents filterGroup={filterGroup} onAdd={() => setShowAddForm(true)} />
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {filteredStudents.length}{tr('명 등록 · 상태 버튼으로 출석 변경 · 펼치기 버튼으로 신체 기능 평가')}
          </p>
          {filteredStudents.map((student) => (
            <StudentCard key={student.id} student={student} onCycleStatus={cycleStatus} onRemove={removeStudent} onUpdatePhysical={updatePhysical} />
          ))}
        </div>
      )}

      {badgesLoaded && badges.length > 0 ? (
        <BadgeSection badges={badges} locale={locale} onShare={handleBadgeKakaoShare} />
      ) : null}
    </section>
  );
}

function AttendanceInline({
  classGroup,
  students,
  onSetAttendance,
}: {
  classGroup: string;
  students: Student[];
  onSetAttendance: (id: string, status: AttendanceStatus) => void;
}) {
  const tr = useTranslator();
  return (
    <section className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-4">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{tr('출석')} · {classGroup}</p>
      {students.length === 0 ? (
        <p className="text-sm text-slate-500">{tr('이 반에 등록된 학생이 없습니다.')}</p>
      ) : (
        <ul className="space-y-2">
          {students.map((student) => (
            <li key={student.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-600 bg-slate-800/80 px-3 py-2">
              <span className="truncate text-sm font-bold text-white">{student.name}</span>
              <div className="flex shrink-0 gap-1">
                <AttendanceIconButton status="present" active={student.status === 'present'} onClick={() => onSetAttendance(student.id, 'present')} />
                <AttendanceIconButton status="late" active={student.status === 'late'} onClick={() => onSetAttendance(student.id, 'late')} />
                <AttendanceIconButton status="absent" active={student.status === 'absent'} onClick={() => onSetAttendance(student.id, 'absent')} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AttendanceIconButton({ status, active, onClick }: { status: AttendanceStatus; active: boolean; onClick: () => void }) {
  const tr = useTranslator();
  const config: Record<AttendanceStatus, { label: string; icon: ElementType; active: string; hover: string }> = {
    present: { label: '출석', icon: CheckCircle, active: 'bg-emerald-500/30 border-emerald-500 text-emerald-400', hover: 'hover:border-emerald-500/50' },
    late: { label: '지각', icon: Clock, active: 'bg-amber-500/30 border-amber-500 text-amber-400', hover: 'hover:border-amber-500/50' },
    absent: { label: '결석', icon: XCircle, active: 'bg-red-500/30 border-red-500 text-red-400', hover: 'hover:border-red-500/50' },
  };
  const item = config[status];
  const Icon = item.icon;
  return (
    <button type="button" onClick={onClick} className={`rounded-lg border p-2 transition-colors ${active ? item.active : `border-slate-600 text-slate-500 ${item.hover}`}`} aria-label={tr(item.label)}>
      <Icon className="h-4 w-4" />
    </button>
  );
}

function SyncStatus({ syncError, syncing, refetch }: { syncError: string | null; syncing: boolean; refetch: () => Promise<void> }) {
  const tr = useTranslator();
  if (syncError) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-400 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2">
          <CloudOff className="h-4 w-4 shrink-0" />
          <span>{tr('서버 연결에 실패했습니다. 변경 사항은 연결 복구 후 다시 확인해 주세요.')}</span>
        </div>
        <SubscriberButton tone="amber" size="sm" onClick={() => void refetch()}>{tr('다시 시도')}</SubscriberButton>
      </div>
    );
  }
  if (syncing) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-500">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>{tr('서버에서 최신 데이터를 불러오고 있어요...')}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-emerald-500/70">
      <AlertCircle className="h-3 w-3" />
      <span>{tr('데이터가 서버에 안전하게 저장됩니다.')}</span>
    </div>
  );
}

function DataCharts({
  attendanceChartPoints,
  classRadarData,
  attendanceRangeError,
  chartsReady,
}: {
  attendanceChartPoints: Array<{ dateShort: string; date: string; rate: number; attended: number; total: number }>;
  classRadarData: Array<{ subject: string; value: number }>;
  attendanceRangeError: boolean;
  chartsReady: boolean;
}) {
  const tr = useTranslator();
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-800/40 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{tr('최근 30일 출석률')}</p>
          <p className="mt-1 text-sm text-slate-400">{tr('선택한 반 기준 · 일별 출석·지각 비율')}</p>
        </div>
        {attendanceRangeError ? (
          <p className="text-sm text-amber-400">{tr('출석 기록을 불러오지 못했습니다.')}</p>
        ) : attendanceChartPoints.length === 0 ? (
          <p className="text-sm text-slate-500">{tr('표시할 데이터가 없습니다.')}</p>
        ) : !chartsReady ? (
          <div className="h-[220px] w-full min-w-0 rounded-xl border border-slate-700 bg-slate-900/30" />
        ) : (
          <div className="h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceChartPoints} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="3 3" />
                <XAxis dataKey="dateShort" tick={{ fill: '#94a3b8', fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} width={32} unit="%" />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 12 }}
                  labelFormatter={(_, payload) => (payload?.[0]?.payload as { date?: string } | undefined)?.date ?? ''}
                  formatter={(value) => [`${value ?? 0}%`, tr('출석률')]}
                />
                <Line type="monotone" dataKey="rate" stroke="#34d399" strokeWidth={2} dot={false} name={tr('출석률')} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-800/40 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{tr('반 평균 신체 기능')}</p>
          <p className="mt-1 text-sm text-slate-400">{tr('필터에 맞는 학생 평균을 1~3단계로 환산합니다.')}</p>
        </div>
        {classRadarData.length === 0 ? (
          <p className="text-sm text-slate-500">{tr('학생을 등록하면 레이더가 표시됩니다.')}</p>
        ) : !chartsReady ? (
          <div className="h-[220px] w-full min-w-0 rounded-xl border border-slate-700 bg-slate-900/30" />
        ) : (
          <div className="h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={classRadarData} cx="50%" cy="50%" outerRadius="78%">
                <PolarGrid stroke="rgba(148,163,184,0.2)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                <Radar name={tr('평균')} dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip
                  contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10 }}
                  formatter={(value) => [`${((Number(value) || 0) / 33.3).toFixed(1)} / 3`, tr('평균 단계')]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function Toolbar({
  filterGroup,
  classes,
  students,
  filteredStudents,
  presentCount,
  onFilterChange,
  onMarkAllPresent,
  onToggleAdd,
}: {
  filterGroup: string;
  classes: ClassGroup[];
  students: Student[];
  filteredStudents: Student[];
  presentCount: number;
  onFilterChange: (value: string) => void;
  onMarkAllPresent: () => void;
  onToggleAdd: () => void;
}) {
  const tr = useTranslator();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterGroup} onChange={(event) => onFilterChange(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-white outline-none focus:border-blue-500">
          <option value={ALL_CLASSES}>{tr('전체 반')}</option>
          {classes.map((group) => <option key={group.id} value={group.name}>{group.name}</option>)}
          {students.some((student) => !classes.some((group) => group.name === normalizeClassGroup(student.classGroup))) ? (
            <option value={UNASSIGNED_CLASS}>{tr(UNASSIGNED_CLASS)}</option>
          ) : null}
        </select>

        {filteredStudents.length > 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-bold text-white">{tr('출석')} {presentCount}</span>
            <span className="text-slate-500">/</span>
            <span className="text-sm text-slate-400">{filteredStudents.length}{tr('명')}</span>
          </div>
        ) : null}

        {filteredStudents.length > 0 ? (
          <SubscriberButton tone="emerald" size="sm" onClick={onMarkAllPresent}>{tr('전체 출석 처리')}</SubscriberButton>
        ) : null}
      </div>

      <SubscriberButton tone="blue" icon={<UserPlus className="h-4 w-4" />} onClick={onToggleAdd}>
        {tr('학생 등록')}
      </SubscriberButton>
    </div>
  );
}

function AddStudentForm({
  classes,
  newName,
  newGroup,
  nameError,
  onNameChange,
  onGroupChange,
  onSubmit,
  onCancel,
  onOpenClassManager,
}: {
  classes: ClassGroup[];
  newName: string;
  newGroup: string;
  nameError: string;
  onNameChange: (value: string) => void;
  onGroupChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onOpenClassManager: () => void;
}) {
  const tr = useTranslator();
  return (
    <div className="space-y-4 rounded-2xl border border-slate-700 bg-slate-800/80 p-6">
      <p className="text-base font-black text-white">{tr('새 학생 등록')}</p>
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder={tr('이름')}
          value={newName}
          onChange={(event) => onNameChange(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && onSubmit()}
          autoFocus
          className="min-w-[180px] flex-1 rounded-xl border border-slate-600 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
        />
        <select value={newGroup} onChange={(event) => onGroupChange(event.target.value)} className="rounded-xl border border-slate-600 bg-slate-900 px-4 py-2.5 text-sm font-medium text-white outline-none focus:border-blue-500">
          <option value="">{tr(UNASSIGNED_CLASS)}</option>
          {classes.map((group) => <option key={group.id} value={group.name}>{group.name}</option>)}
        </select>
        <SubscriberButton tone="blue" onClick={onSubmit}>{tr('추가')}</SubscriberButton>
        <SubscriberButton tone="slate" onClick={onCancel}>{tr('취소')}</SubscriberButton>
      </div>
      {nameError ? <p className="text-sm font-medium text-red-400">{tr(nameError)}</p> : null}

      {classes.length === 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <AlertCircle className="h-3.5 w-3.5" />
          {tr('반을 먼저 만들면 학생을 반별로 관리할 수 있어요.')}{' '}
          <button type="button" onClick={onOpenClassManager} className="text-blue-400 underline underline-offset-2">{tr('반 관리 열기')}</button>
        </p>
      ) : null}
    </div>
  );
}

function AttendanceProgress({ presentCount, total }: { presentCount: number; total: number }) {
  const tr = useTranslator();
  const pct = total > 0 ? Math.round((presentCount / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold text-slate-400">
        <span>{tr('오늘 출석률')}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EmptyStudents({ filterGroup, onAdd }: { filterGroup: string; onAdd: () => void }) {
  const tr = useTranslator();
  return (
    <div className="flex flex-col items-center justify-center space-y-5 py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-700 bg-slate-800">
        <Users className="h-9 w-9 text-slate-600" />
      </div>
      <div className="space-y-2">
        <p className="text-xl font-black text-white">
          {filterGroup === ALL_CLASSES ? tr('등록된 학생이 없습니다') : tr(`${filterGroup}에 학생이 없습니다`)}
        </p>
        <p className="mx-auto max-w-xs text-sm text-slate-400">
          {tr('학생을 등록하면 출석 관리, 신체 기능 평가, 학생 뽑기, 팀 나누기를 사용할 수 있습니다.')}
        </p>
      </div>
      <SubscriberButton tone="emerald" icon={<UserPlus className="h-4 w-4" />} onClick={onAdd}>
        {tr('첫 학생 등록하기')}
      </SubscriberButton>
    </div>
  );
}

function BadgeSection({ badges, locale, onShare }: { badges: Badge[]; locale: UiLocale; onShare: (badge: Badge) => void }) {
  const tr = useTranslator();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Award className="h-5 w-5 text-amber-400" />
        <h3 className="text-lg font-black text-white">{tr('이번 달 성장 배지')}</h3>
      </div>
      <p className="text-sm text-slate-400">{tr('AI 리포트에서 도출된 강점·성장 태그로 만든 배지예요.')}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((badge) => (
          <div key={badge.id} className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-bold text-white">{badge.studentName}</p>
                <p className="text-xs text-slate-500">{normalizeClassGroup(badge.classGroup)}</p>
              </div>
              <SubscriberButton tone="amber" size="sm" icon={<Share2 className="h-3.5 w-3.5" />} onClick={() => onShare(badge)}>
                {tr('공유')}
              </SubscriberButton>
            </div>
            <p className="text-sm font-bold text-amber-400">{makeBadgeTitle(tr, badge.strengthSummary)}</p>
            {badge.growthTag ? <SubscriberBadge tone="emerald">{tr(badge.growthTag)}</SubscriberBadge> : null}
            <p className="mt-auto text-xs text-slate-500">
              {new Date(badge.generatedAt).toLocaleDateString(intlLocaleTag(locale))} · {tr(badge.period)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
