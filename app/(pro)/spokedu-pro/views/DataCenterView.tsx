'use client';

import { useState, useMemo, useCallback } from 'react';
import Script from 'next/script';
import {
  Users, UserPlus, X, ChevronDown, ChevronUp, CheckCircle, Clock, XCircle,
  RefreshCw, AlertCircle, CloudOff, Plus, Pencil, Trash2, Zap, Crown, Award, Share2,
} from 'lucide-react';
import {
  useStudentStore,
  PHYSICAL_LABELS,
  LEVEL_LABELS,
  type Student,
  type PhysicalFunctions,
  type PhysicalLevel,
} from '../hooks/useStudentStore';
import { useClassStore, type ClassGroup } from '../hooks/useClassStore';
import { useBadgeStore, type Badge } from '../hooks/useBadgeStore';
import { useProContext } from '../hooks/useProContext';

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: {
        sendDefault: (options: { objectType: string; text: string; link: { mobileWebUrl: string; webUrl: string } }) => void;
      };
    };
  }
}

function makeBadgeTitle(strengthSummary: string): string {
  return strengthSummary ? `이번 달의 ${strengthSummary}` : '성취 뱃지';
}

// ── 업셀 팝업 ────────────────────────────────────────────────────────────────
function ClassLimitModal({
  plan,
  limit,
  onClose,
}: {
  plan: string;
  limit: number;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-7 max-w-sm w-full space-y-5 shadow-2xl">
        <div className="flex items-center gap-3">
          {plan === 'free' ? (
            <Zap className="w-6 h-6 text-blue-400 shrink-0" />
          ) : (
            <Crown className="w-6 h-6 text-amber-400 shrink-0" />
          )}
          <h3 className="text-lg font-black text-white">
            {plan === 'free' ? 'Basic으로 업그레이드' : 'Pro로 업그레이드'}
          </h3>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed">
          현재 플랜은 반을 <span className="text-white font-bold">{limit}개</span>까지만
          만들 수 있습니다.
          <br />
          {plan === 'free'
            ? 'Basic 플랜으로 업그레이드하면 반 3개까지 관리할 수 있어요.'
            : 'Pro 플랜으로 업그레이드하면 반 개수 제한 없이 관리할 수 있어요.'}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-400 text-sm font-bold hover:border-slate-500 transition-colors"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors"
          >
            설정에서 업그레이드
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 반 관리 패널 ──────────────────────────────────────────────────────────────
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
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [nameError, setNameError] = useState('');

  const isAtLimit = classLimit !== null && classes.length >= classLimit;

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) { setNameError('반 이름을 입력해주세요.'); return; }
    if (classes.some((c) => c.name === trimmed)) { setNameError('이미 같은 이름의 반이 있습니다.'); return; }
    setNameError('');
    onCreateClass(trimmed);
    setNewName('');
  };

  const handleRenameSubmit = (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    if (classes.some((c) => c.name === trimmed && c.id !== id)) {
      setNameError('이미 같은 이름의 반이 있습니다.');
      return;
    }
    setNameError('');
    onRenameClass(id, trimmed);
    setEditingId(null);
  };

  return (
    <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">반 관리</p>
        {classLimit !== null && (
          <span className="text-xs text-slate-500 tabular-nums">
            <span className={isAtLimit ? 'text-amber-400 font-bold' : 'text-slate-400'}>
              {classes.length}
            </span>
            /{classLimit}개
          </span>
        )}
      </div>

      {/* 반 목록 */}
      {classes.length === 0 ? (
        <p className="text-sm text-slate-500 py-2">등록된 반이 없습니다. 첫 반을 만들어 보세요.</p>
      ) : (
        <ul className="space-y-2">
          {classes.map((c) => (
            <li key={c.id} className="flex items-center gap-2 bg-slate-700/40 rounded-xl px-4 py-2.5">
              {editingId === c.id ? (
                <form
                  className="flex flex-1 items-center gap-2"
                  onSubmit={(e) => { e.preventDefault(); handleRenameSubmit(c.id); }}
                >
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => { setEditName(e.target.value); setNameError(''); }}
                    autoFocus
                    className="flex-1 bg-slate-900 border border-blue-500 rounded-lg px-3 py-1 text-sm text-white focus:outline-none"
                  />
                  <button type="submit" className="text-xs font-bold text-blue-400 hover:text-blue-300">저장</button>
                  <button type="button" onClick={() => { setEditingId(null); setNameError(''); }} className="text-xs text-slate-500 hover:text-slate-300">취소</button>
                </form>
              ) : (
                <>
                  <span className="flex-1 text-sm font-bold text-white">{c.name}</span>
                  <span className="text-xs text-slate-500 tabular-nums">{studentsByClass[c.name] ?? 0}명</span>
                  <button
                    type="button"
                    onClick={() => { setEditingId(c.id); setEditName(c.name); setNameError(''); }}
                    className="p-1.5 rounded-lg hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`"${c.name}" 반을 삭제하시겠습니까?\n해당 반의 학생은 '미분류'로 이동됩니다.`)) {
                        onDeleteClass(c.id);
                      }
                    }}
                    className="p-1.5 rounded-lg hover:bg-red-900/40 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {nameError && (
        <p className="text-xs text-red-400">{nameError}</p>
      )}

      {/* 새 반 추가 */}
      <div className="flex gap-2 pt-1">
        <input
          type="text"
          placeholder="새 반 이름"
          value={newName}
          onChange={(e) => { setNewName(e.target.value); setNameError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && !isAtLimit && handleCreate()}
          disabled={isAtLimit}
          className="flex-1 bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600 disabled:opacity-40"
        />
        <button
          type="button"
          onClick={() => {
            if (isAtLimit) {
              onCreateClass('__limit__');
              return;
            }
            handleCreate();
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          반 추가
        </button>
      </div>

      {isAtLimit && (
        <p className="text-xs text-amber-400 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          플랜 한도에 도달했습니다. 업그레이드하면 더 많은 반을 만들 수 있어요.
        </p>
      )}
    </div>
  );
}

// ── 신체 기능 레벨 버튼 ──────────────────────────────────────────────────────
function LevelButton({
  value,
  current,
  onChange,
}: {
  value: PhysicalLevel;
  current: PhysicalLevel;
  onChange: (v: PhysicalLevel) => void;
}) {
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
      className={`w-9 h-8 rounded-lg text-xs font-bold border transition-all ${
        current === value ? active[value] : colors[value] + ' hover:opacity-80'
      }`}
    >
      {LEVEL_LABELS[value]}
    </button>
  );
}

// ── 원생 카드 ────────────────────────────────────────────────────────────────
function StudentCard({
  student,
  onCycleStatus,
  onRemove,
  onUpdatePhysical,
}: {
  student: Student;
  onCycleStatus: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdatePhysical: (id: string, key: keyof PhysicalFunctions, v: PhysicalLevel) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
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
    <div className="w-full min-w-0 bg-slate-800/60 border border-slate-700 rounded-2xl">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-lg shrink-0 font-bold text-white">
            {student.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-base truncate">{student.name}</p>
            <p className="text-slate-400 text-xs font-medium">{student.classGroup || '미분류'}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 w-28 shrink-0">
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden min-w-0">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 font-bold shrink-0">{totalScore}/{maxScore}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onCycleStatus(student.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${cfg.cls}`}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              {cfg.label}
            </button>
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
              aria-label="신체 기능 펼치기"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`"${student.name}" 원생을 삭제하시겠습니까?`)) {
                  onRemove(student.id);
                }
              }}
              className="p-2 rounded-lg bg-slate-700 hover:bg-red-900/40 text-slate-500 hover:text-red-400 transition-colors"
              aria-label="삭제"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-700 p-4 bg-slate-900/40 overflow-x-auto">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            신체 기능 평가 — 팀 나누기·술래 정하기에 활용됩니다
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(Object.keys(PHYSICAL_LABELS) as (keyof PhysicalFunctions)[]).map((key) => (
              <div key={key} className="flex items-center justify-between gap-2 min-w-[180px]">
                <span className="text-sm text-slate-300 font-semibold shrink-0">{PHYSICAL_LABELS[key]}</span>
                <div className="flex gap-1 shrink-0">
                  {([1, 2, 3] as PhysicalLevel[]).map((v) => (
                    <LevelButton
                      key={v}
                      value={v}
                      current={student.physical[key]}
                      onChange={(val) => onUpdatePhysical(student.id, key, val)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function DataCenterView() {
  const { students, loaded: studentsLoaded, syncing, syncError, refetch, addStudent, removeStudent, cycleStatus, markAllPresent, updatePhysical } =
    useStudentStore();
  const { classes, loaded: classesLoaded, createClass, renameClass, deleteClass } = useClassStore();
  const { badges, loaded: badgesLoaded } = useBadgeStore();
  const { ctx } = useProContext();

  const classLimit = ctx.usage.classLimit ?? null;
  const [filterGroup, setFilterGroup] = useState('전체');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [nameError, setNameError] = useState('');
  const [showClassManager, setShowClassManager] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ plan: string; limit: number } | null>(null);

  const filteredStudents = useMemo(
    () => (filterGroup === '전체' ? students : students.filter((s) => s.classGroup === filterGroup)),
    [students, filterGroup]
  );

  const studentsByClass = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of students) {
      map[s.classGroup] = (map[s.classGroup] ?? 0) + 1;
    }
    return map;
  }, [students]);

  const presentCount = filteredStudents.filter((s) => s.status === 'present').length;

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) { setNameError('이름을 입력해주세요.'); return; }
    addStudent(trimmed, newGroup || '미분류');
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

  const handleRenameClass = useCallback(async (id: string, name: string) => {
    await renameClass(id, name);
  }, [renameClass]);

  const handleDeleteClass = useCallback(async (id: string) => {
    const targetName = classes.find((c) => c.id === id)?.name;
    await deleteClass(id);
    if (filterGroup !== '전체' && targetName && filterGroup === targetName) {
      setFilterGroup('전체');
    }
  }, [deleteClass, filterGroup, classes]);

  const handleBadgeKakaoShare = useCallback((badge: Badge) => {
    if (!window.Kakao?.isInitialized()) return;
    const title = makeBadgeTitle(badge.strengthSummary);
    window.Kakao.Share.sendDefault({
      objectType: 'text',
      text: `${badge.studentName} · ${title}\n${badge.growthTag}\n\n- 스포키듀 성취 뱃지`,
      link: { mobileWebUrl: window.location.href, webUrl: window.location.href },
    });
  }, []);

  const isLoaded = studentsLoaded && classesLoaded;

  if (!isLoaded) {
    return (
      <section className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>데이터 불러오는 중...</span>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 lg:px-12 py-10 pb-32 space-y-8 max-w-5xl mx-auto">
      <Script
        src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
        crossOrigin="anonymous"
        strategy="afterInteractive"
        onLoad={() => {
          const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
          if (key && window.Kakao && !window.Kakao.isInitialized()) window.Kakao.init(key);
        }}
      />

      {/* 업셀 팝업 */}
      {showLimitModal && limitInfo && (
        <ClassLimitModal
          plan={limitInfo.plan}
          limit={limitInfo.limit}
          onClose={() => setShowLimitModal(false)}
        />
      )}

      {/* 헤더 */}
      <header className="space-y-3 border-b border-slate-800 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold uppercase tracking-widest">
          <Users className="w-4 h-4" /> 원생 관리 및 평가
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-white tracking-tight">출석부 & 신체 기능 평가</h2>
            <p className="text-slate-400 font-medium">
              출결을 관리하고 신체 기능을 평가하세요. 평가 데이터는 수업 보조도구의 술래 정하기·팀 나누기에 자동 활용됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowClassManager((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-bold rounded-xl transition-colors shrink-0"
          >
            <Pencil className="w-4 h-4" />
            반 관리
          </button>
        </div>
      </header>

      {/* 반 관리 패널 (토글) */}
      {showClassManager && (
        <ClassManagerPanel
          classes={classes}
          classLimit={classLimit}
          studentsByClass={studentsByClass}
          onCreateClass={handleCreateClass}
          onRenameClass={handleRenameClass}
          onDeleteClass={handleDeleteClass}
        />
      )}

      {/* 동기화 상태 배너 */}
      {syncError && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
          <div className="flex items-center gap-2 flex-1">
            <CloudOff className="w-4 h-4 shrink-0" />
            <span>서버 연결 실패 — 로컬 캐시로 표시 중. 변경사항은 연결 복구 시 저장됩니다.</span>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors shrink-0"
          >
            다시 시도
          </button>
        </div>
      )}
      {syncing && !syncError && (
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-500 text-xs">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>서버에서 최신 데이터를 불러오고 있어요...</span>
        </div>
      )}
      {!syncing && !syncError && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-500/70">
          <AlertCircle className="w-3 h-3" />
          <span>데이터가 서버에 안전하게 저장됩니다.</span>
        </div>
      )}

      {/* 툴바 */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-sm font-medium rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500"
          >
            <option value="전체">전체 반</option>
            {classes.map((g) => (
              <option key={g.id} value={g.name}>{g.name}</option>
            ))}
            {students.some((s) => !classes.some((c) => c.name === s.classGroup)) && (
              <option value="미분류">미분류</option>
            )}
          </select>

          {filteredStudents.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-bold text-white">출석 {presentCount}</span>
              <span className="text-slate-500">/</span>
              <span className="text-sm text-slate-400">{filteredStudents.length}명</span>
            </div>
          )}

          {filteredStudents.length > 0 && (
            <button
              type="button"
              onClick={() => markAllPresent(filteredStudents.map((s) => s.id))}
              className="px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 text-sm font-bold rounded-xl transition-colors"
            >
              전체 출석 처리
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors shadow-lg"
        >
          <UserPlus className="w-4 h-4" />
          원생 등록
        </button>
      </div>

      {/* 원생 추가 폼 */}
      {showAddForm && (
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 space-y-4">
          <p className="text-white font-black text-base">새 원생 등록</p>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="이름"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setNameError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              autoFocus
              className="flex-1 min-w-[180px] bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
            />
            <select
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              className="bg-slate-900 border border-slate-600 text-white text-sm font-medium rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500"
            >
              <option value="">미분류</option>
              {classes.map((g) => (
                <option key={g.id} value={g.name}>{g.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAdd}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
            >
              추가
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setNewName(''); setNewGroup(''); setNameError(''); }}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors"
            >
              취소
            </button>
          </div>
          {nameError && <p className="text-red-400 text-sm font-medium">{nameError}</p>}

          {classes.length === 0 && (
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              반을 먼저 만들면 학생을 반별로 관리할 수 있어요.{' '}
              <button
                type="button"
                onClick={() => setShowClassManager(true)}
                className="text-blue-400 underline underline-offset-2"
              >
                반 관리 열기
              </button>
            </p>
          )}
        </div>
      )}

      {/* 출석 진행률 */}
      {filteredStudents.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-slate-400">
            <span>오늘 출석률</span>
            <span>{Math.round((presentCount / filteredStudents.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
              style={{ width: `${(presentCount / filteredStudents.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 원생 목록 */}
      {filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            <Users className="w-9 h-9 text-slate-600" />
          </div>
          <div className="space-y-2">
            <p className="text-white font-black text-xl">
              {filterGroup === '전체' ? '등록된 원생이 없습니다' : `${filterGroup}에 원생이 없습니다`}
            </p>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">
              원생을 등록하면 출결 관리, 신체 기능 평가, 술래 정하기, 팀 나누기를 사용할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 transition-colors"
          >
            <UserPlus className="w-4 h-4" /> 첫 원생 등록하기
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            {filteredStudents.length}명 등록 · 상태 버튼 클릭으로 출결 변경 · ∨ 버튼으로 신체 기능 평가
          </p>
          {filteredStudents.map((s) => (
            <StudentCard
              key={s.id}
              student={s}
              onCycleStatus={cycleStatus}
              onRemove={removeStudent}
              onUpdatePhysical={updatePhysical}
            />
          ))}
        </div>
      )}

      {/* 성취 뱃지 섹션 */}
      {badgesLoaded && badges.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-black text-white">이달의 성취 뱃지</h3>
          </div>
          <p className="text-slate-400 text-sm">AI 리포트에서 도출된 강점·성장 태그로 만든 뱃지예요.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white font-bold truncate">{badge.studentName}</p>
                    <p className="text-slate-500 text-xs">{badge.classGroup || '미분류'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBadgeKakaoShare(badge)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-300 rounded-lg text-xs font-bold shrink-0"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    공유
                  </button>
                </div>
                <p className="text-amber-400 font-bold text-sm">{makeBadgeTitle(badge.strengthSummary)}</p>
                {badge.growthTag && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full w-fit">
                    {badge.growthTag}
                  </span>
                )}
                <p className="text-slate-500 text-xs mt-auto">
                  {new Date(badge.generatedAt).toLocaleDateString('ko-KR')} · {badge.period}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
