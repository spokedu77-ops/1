'use client';

import { useState, useMemo } from 'react';
import { Users, UserPlus, X, ChevronDown, ChevronUp, CheckCircle, Clock, XCircle, RefreshCw, AlertCircle, CloudOff } from 'lucide-react';
import {
  useStudentStore,
  CLASS_GROUPS,
  PHYSICAL_LABELS,
  LEVEL_LABELS,
  type Student,
  type PhysicalFunctions,
  type PhysicalLevel,
} from '../hooks/useStudentStore';
import { useProContext } from '../hooks/useProContext';

// ── 신체 기능 레벨 버튼 ──────────────────────────────────────────────
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

// ── 원생 카드 ────────────────────────────────────────────────────────
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
            <p className="text-slate-400 text-xs font-medium">{student.classGroup}</p>
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
            <button type="button" onClick={() => setExpanded((e) => !e)} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors" aria-label="신체 기능 펼치기">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button type="button" onClick={() => onRemove(student.id)} className="p-2 rounded-lg bg-slate-700 hover:bg-red-900/40 text-slate-500 hover:text-red-400 transition-colors" aria-label="삭제">
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
          {/* 768px 미만은 1열만 사용해 가로 overflow 제거 — 오른쪽 버튼이 터치를 받지 못하는 현상 방지 */}
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

// ── 메인 컴포넌트 ────────────────────────────────────────────────────
export default function DataCenterView() {
  const { students, loaded, syncing, syncError, addStudent, removeStudent, cycleStatus, markAllPresent, updatePhysical } =
    useStudentStore();
  const { ctx } = useProContext();

  const studentLimit = ctx.usage.studentLimit;
  const isAtLimit = studentLimit !== null && students.length >= studentLimit;

  const [filterGroup, setFilterGroup] = useState('전체');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState(CLASS_GROUPS[0]);
  const [nameError, setNameError] = useState('');

  const filteredStudents = useMemo(
    () => (filterGroup === '전체' ? students : students.filter((s) => s.classGroup === filterGroup)),
    [students, filterGroup]
  );

  const presentCount = filteredStudents.filter((s) => s.status === 'present').length;

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) { setNameError('이름을 입력해주세요.'); return; }
    if (isAtLimit) { setNameError(`현재 플랜 한도(${studentLimit}명)에 도달했습니다. 업그레이드가 필요합니다.`); return; }
    if (students.some((s) => s.name === trimmed && s.classGroup === newGroup)) {
      setNameError('동일 반에 같은 이름이 있습니다.'); return;
    }
    addStudent(trimmed, newGroup);
    setNewName('');
    setNameError('');
    setShowAddForm(false);
  };

  if (!loaded) {
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
      {/* 헤더 */}
      <header className="space-y-3 border-b border-slate-800 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold uppercase tracking-widest">
          <Users className="w-4 h-4" /> 원생 관리 및 평가
        </div>
        <h2 className="text-4xl font-black text-white tracking-tight">출석부 & 신체 기능 평가</h2>
        <p className="text-slate-400 font-medium">
          출결을 관리하고 신체 기능을 평가하세요. 평가 데이터는 수업 보조도구의 술래 정하기·팀 나누기에 자동 활용됩니다.
        </p>
      </header>

      {/* 동기화 상태 배너 */}
      {syncError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
          <CloudOff className="w-4 h-4 shrink-0" />
          <span>서버 연결 실패 — 로컬 캐시로 표시 중. 변경사항은 연결 복구 시 저장됩니다.</span>
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
            {CLASS_GROUPS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
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

        <div className="flex items-center gap-3">
          {studentLimit !== null && (
            <span className="text-xs text-slate-500 tabular-nums">
              <span className={isAtLimit ? 'text-red-400 font-bold' : 'text-slate-400 font-medium'}>
                {students.length}
              </span>
              /{studentLimit}명
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            disabled={isAtLimit}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-lg"
          >
            <UserPlus className="w-4 h-4" />
            원생 등록
          </button>
        </div>
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
              {CLASS_GROUPS.map((g) => (
                <option key={g} value={g}>{g}</option>
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
              onClick={() => { setShowAddForm(false); setNewName(''); setNameError(''); }}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors"
            >
              취소
            </button>
          </div>
          {nameError && <p className="text-red-400 text-sm font-medium">{nameError}</p>}
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
            <p className="text-white font-black text-xl">등록된 원생이 없습니다</p>
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

    </section>
  );
}
