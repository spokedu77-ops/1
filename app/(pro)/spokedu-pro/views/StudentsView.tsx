'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  UserPlus,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import {
  CLASS_GROUPS,
  PHYSICAL_LABELS,
  LEVEL_LABELS,
  type PhysicalFunctions,
  type PhysicalLevel,
} from '../hooks/useStudentStore';

type AttendanceStatus = 'present' | 'absent' | 'late';
type AttendanceRecords = Record<string, AttendanceStatus>;

type StoredStudent = {
  id: string;
  name: string;
  classGroup: string;
  physical: PhysicalFunctions;
  enrolledAt: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_PHYSICAL: PhysicalFunctions = {
  coordination: 2,
  agility: 2,
  endurance: 2,
  balance: 2,
  strength: 2,
};

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; icon: React.ElementType; cls: string }> = {
  present: { label: '출석', icon: CheckCircle, cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  absent: { label: '결석', icon: XCircle, cls: 'bg-slate-700 text-slate-400 border-slate-600' },
  late: { label: '지각', icon: Clock, cls: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
};

const STATUS_CYCLE: Record<AttendanceStatus, AttendanceStatus> = {
  absent: 'present',
  present: 'late',
  late: 'absent',
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function StudentsView() {
  const [students, setStudents] = useState<StoredStudent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  // 출결 탭
  const [tab, setTab] = useState<'students' | 'attendance'>('students');
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [attendance, setAttendance] = useState<AttendanceRecords>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  // 학생 추가 폼
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState(CLASS_GROUPS[0]);
  const [nameError, setNameError] = useState('');
  const [adding, setAdding] = useState(false);

  // debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // pageError 자동 소멸 (5초)
  useEffect(() => {
    if (!pageError) return;
    const t = setTimeout(() => setPageError(null), 5000);
    return () => clearTimeout(t);
  }, [pageError]);

  // 학생 목록 로드
  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch('/api/spokedu-pro/students', { credentials: 'include' });
      if (!res.ok) {
        setPageError('학생 목록을 불러오지 못했습니다.');
        return;
      }
      const data = await res.json();
      setStudents(data.students ?? []);
    } catch {
      setPageError('학생 목록을 불러오지 못했습니다.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // 출결 로드 (200ms debounce)
  const fetchAttendance = useCallback((date: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/spokedu-pro/attendance?date=${date}`, { credentials: 'include' });
        if (!res.ok) {
          setPageError('출결 데이터를 불러오지 못했습니다.');
          return;
        }
        const data = await res.json();
        setAttendance(data.records ?? {});
      } catch {
        setPageError('출결 데이터를 불러오지 못했습니다.');
      }
    }, 200);
  }, []);

  useEffect(() => {
    if (tab === 'attendance') {
      fetchAttendance(selectedDate);
    }
  }, [tab, selectedDate, fetchAttendance]);

  const handleDateChange = (delta: number) => {
    setSelectedDate((prev) => addDays(prev, delta));
  };

  const handleSetToday = () => {
    setSelectedDate(todayISO());
  };

  const handleCycleAttendance = async (studentId: string) => {
    const current = attendance[studentId] ?? 'absent';
    const next = STATUS_CYCLE[current];
    const updated = { ...attendance, [studentId]: next };
    setAttendance(updated);
    setSavingAttendance(true);
    try {
      await fetch('/api/spokedu-pro/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, records: { [studentId]: next } }),
        credentials: 'include',
      });
    } catch {
      setPageError('출결 저장에 실패했습니다.');
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleMarkAllPresent = async () => {
    const updated: AttendanceRecords = {};
    students.forEach((s) => { updated[s.id] = 'present'; });
    setAttendance(updated);
    setSavingAttendance(true);
    try {
      await fetch('/api/spokedu-pro/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, records: updated }),
        credentials: 'include',
      });
    } catch {
      setPageError('출결 저장에 실패했습니다.');
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleAddStudent = async () => {
    const trimmed = newName.trim();
    if (!trimmed) { setNameError('이름을 입력해주세요.'); return; }
    if (students.some((s) => s.name === trimmed && s.classGroup === newGroup)) {
      setNameError('동일 반에 같은 이름이 있습니다.'); return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/spokedu-pro/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, classGroup: newGroup, physical: DEFAULT_PHYSICAL }),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        setNameError(data.error ?? '추가에 실패했습니다.');
        return;
      }
      const data = await res.json();
      setStudents((prev) => [...prev, data.student]);
      setNewName('');
      setNameError('');
      setShowAddForm(false);
    } catch {
      setNameError('추가 중 오류가 발생했습니다.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveStudent = async (id: string) => {
    try {
      const res = await fetch(`/api/spokedu-pro/students/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        setPageError('학생 삭제에 실패했습니다.');
        return;
      }
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setPageError('학생 삭제 중 오류가 발생했습니다.');
    }
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

  const presentCount = students.filter((s) => (attendance[s.id] ?? 'absent') === 'present').length;

  return (
    <section className="px-6 lg:px-12 py-10 pb-32 space-y-8 max-w-5xl mx-auto">
      {/* 헤더 */}
      <header className="space-y-3 border-b border-slate-800 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold uppercase tracking-widest">
          <Users className="w-4 h-4" /> 원생 관리
        </div>
        <h2 className="text-4xl font-black text-white tracking-tight">원생 & 출결</h2>
        <p className="text-slate-400 font-medium">원생을 등록하고 출결을 관리하세요.</p>
      </header>

      {/* 에러 배너 (5초 후 자동 소멸) */}
      {pageError && (
        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {pageError}
          </div>
          <button
            type="button"
            onClick={() => setPageError(null)}
            className="text-red-400 hover:text-red-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('students')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
            tab === 'students'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          원생 목록
        </button>
        <button
          type="button"
          onClick={() => setTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
            tab === 'attendance'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          출결 관리
          {savingAttendance && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
        </button>
      </div>

      {/* ── 원생 목록 탭 ── */}
      {tab === 'students' && (
        <div className="space-y-5">
          {/* 툴바 */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors shadow-lg"
            >
              <UserPlus className="w-4 h-4" />
              원생 등록
            </button>
          </div>

          {/* 추가 폼 */}
          {showAddForm && (
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 space-y-4">
              <p className="text-white font-black text-base">새 원생 등록</p>
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  placeholder="이름 (최대 100자)"
                  value={newName}
                  onChange={(e) => { setNewName(e.target.value); setNameError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                  autoFocus
                  maxLength={100}
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
                  onClick={handleAddStudent}
                  disabled={adding}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {adding && <RefreshCw className="w-4 h-4 animate-spin" />}
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

          {/* 학생 목록 */}
          {students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-5">
              <Users className="w-16 h-16 text-slate-600" />
              <div className="space-y-2">
                <p className="text-white font-black text-xl">등록된 원생이 없습니다</p>
                <p className="text-slate-400 text-sm">원생을 등록하면 출결 관리와 신체 기능 평가를 사용할 수 있습니다.</p>
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
                {students.length}명 등록
              </p>
              {students.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-4 p-4 bg-slate-800/60 border border-slate-700 rounded-2xl"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-lg font-bold text-white shrink-0">
                    {s.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-base truncate">{s.name}</p>
                    <p className="text-slate-400 text-xs">
                      {s.classGroup} · 등록일: {new Date(s.enrolledAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div className="hidden sm:flex flex-wrap gap-1">
                    {(Object.keys(PHYSICAL_LABELS) as (keyof PhysicalFunctions)[]).map((key) => {
                      const level = s.physical[key];
                      const colorMap: Record<number, string> = {
                        1: 'bg-red-500/20 text-red-400',
                        2: 'bg-amber-500/20 text-amber-400',
                        3: 'bg-emerald-500/20 text-emerald-400',
                      };
                      return (
                        <span
                          key={key}
                          className={`px-1.5 py-0.5 rounded text-xs font-bold ${colorMap[level]}`}
                        >
                          {PHYSICAL_LABELS[key]} {LEVEL_LABELS[level]}
                        </span>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveStudent(s.id)}
                    className="p-2 rounded-lg bg-slate-700 hover:bg-red-900/40 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 출결 탭 ── */}
      {tab === 'attendance' && (
        <div className="space-y-5">
          {/* 날짜 네비게이션 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDateChange(-1)}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleSetToday}
                className="px-3 py-2 bg-slate-800 hover:bg-blue-600/20 border border-slate-700 hover:border-blue-500/50 text-slate-300 hover:text-blue-400 text-xs font-bold rounded-xl transition-colors"
              >
                오늘
              </button>
              <button
                type="button"
                onClick={() => handleDateChange(1)}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-white ml-1">
                {new Date(selectedDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              {selectedDate === todayISO() && (
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full">오늘</span>
              )}
            </div>
            {students.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 text-sm font-bold rounded-xl transition-colors"
              >
                전체 출석 처리
              </button>
            )}
          </div>

          {/* 출석률 */}
          {students.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>출석률</span>
                <span>
                  {presentCount}/{students.length}명 ({Math.round((presentCount / students.length) * 100)}%)
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                  style={{ width: `${students.length > 0 ? (presentCount / students.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* 출결 목록 */}
          {students.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm">
              원생 목록 탭에서 먼저 학생을 등록해주세요.
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((s) => {
                const status = attendance[s.id] ?? 'absent';
                const cfg = STATUS_CONFIG[status];
                const StatusIcon = cfg.icon;
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center font-bold text-white text-sm">
                        {s.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.classGroup}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCycleAttendance(s.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${cfg.cls}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
