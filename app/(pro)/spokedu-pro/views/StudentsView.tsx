'use client';

/**
 * 원생 관리 뷰 — 원생 목록, 추가/수정/삭제, 출결 탭, CSV 내보내기
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Pencil, Trash2, CheckCircle, XCircle, Clock,
  Download, RefreshCw, ChevronLeft, ChevronRight, Search,
} from 'lucide-react';
import { useProContext } from '../hooks/useProContext';

// ── 타입 ────────────────────────────────────────────────────────────────────
type PhysicalLevel = 1 | 2 | 3;
type PhysicalFunctions = {
  coordination: PhysicalLevel;
  agility: PhysicalLevel;
  endurance: PhysicalLevel;
  balance: PhysicalLevel;
  strength: PhysicalLevel;
};

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

type AttendanceStatus = 'present' | 'absent' | 'late';
type AttendanceRecords = Record<string, AttendanceStatus>;

const PHYSICAL_LABELS: Record<keyof PhysicalFunctions, string> = {
  coordination: '협응력',
  agility: '민첩성',
  endurance: '지구력',
  balance: '균형감',
  strength: '근력',
};

const PLAN_LIMITS: Record<string, number> = {
  free: 10,
  basic: 50,
  pro: Infinity,
};

// ── 신체기능 미니 바 ─────────────────────────────────────────────────────────
function PhysicalBar({ value }: { value: PhysicalLevel }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-sm ${i <= value ? 'bg-emerald-400' : 'bg-slate-700'}`}
        />
      ))}
    </div>
  );
}

// ── 신체기능 슬라이더 (레벨 1-3) ────────────────────────────────────────────
function PhysicalSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: PhysicalLevel;
  onChange: (v: PhysicalLevel) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-14 shrink-0">{label}</span>
      <div className="flex gap-1.5">
        {([1, 2, 3] as PhysicalLevel[]).map((lvl) => (
          <button
            key={lvl}
            type="button"
            onClick={() => onChange(lvl)}
            className={`w-7 h-7 rounded-lg text-xs font-bold border transition-all ${
              value === lvl
                ? 'bg-emerald-500 border-emerald-400 text-white'
                : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
            }`}
          >
            {lvl}
          </button>
        ))}
      </div>
      <span className="text-xs text-slate-500">
        {value === 1 ? '기초' : value === 2 ? '중간' : '우수'}
      </span>
    </div>
  );
}

// ── 학생 추가/수정 모달 ──────────────────────────────────────────────────────
function StudentModal({
  student,
  onSave,
  onClose,
  saving,
}: {
  student: StoredStudent | null;
  onSave: (data: Partial<StoredStudent>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(student?.name ?? '');
  const [classGroup, setClassGroup] = useState(student?.classGroup ?? '미분류');
  const [physical, setPhysical] = useState<PhysicalFunctions>(
    student?.physical ?? { coordination: 2, agility: 2, endurance: 2, balance: 2, strength: 2 }
  );
  const [note, setNote] = useState(student?.note ?? '');

  const handlePhysical = (key: keyof PhysicalFunctions, val: PhysicalLevel) => {
    setPhysical((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col gap-5 p-6">
        <h3 className="text-lg font-black text-white">{student ? '원생 수정' : '원생 추가'}</h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-bold uppercase tracking-widest block mb-1">이름 *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-bold uppercase tracking-widest block mb-1">반</label>
            <input
              value={classGroup}
              onChange={(e) => setClassGroup(e.target.value)}
              placeholder="초등반"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-bold uppercase tracking-widest block mb-2">신체기능 평가</label>
            <div className="space-y-2">
              {(Object.keys(PHYSICAL_LABELS) as (keyof PhysicalFunctions)[]).map((key) => (
                <PhysicalSlider
                  key={key}
                  label={PHYSICAL_LABELS[key]}
                  value={physical[key]}
                  onChange={(v) => handlePhysical(key, v)}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-bold uppercase tracking-widest block mb-1">메모</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="특이사항, 주의사항 등"
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!name.trim() || saving}
            onClick={() => onSave({ name: name.trim(), classGroup, physical, note })}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 출결 탭 ─────────────────────────────────────────────────────────────────
function AttendanceTab({ students }: { students: StoredStudent[] }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState<AttendanceRecords>({});
  const [saving, setSaving] = useState(false);
  const [loadingDate, setLoadingDate] = useState(false);

  const fetchAttendance = useCallback(async (date: string) => {
    setLoadingDate(true);
    try {
      const res = await fetch(`/api/spokedu-pro/attendance?date=${date}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setRecords(data.records ?? {});
    } finally {
      setLoadingDate(false);
    }
  }, []);

  useEffect(() => { fetchAttendance(selectedDate); }, [selectedDate, fetchAttendance]);

  const setRecord = (studentId: string, status: AttendanceStatus) => {
    setRecords((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/spokedu-pro/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, records }),
        credentials: 'include',
      });
    } finally {
      setSaving(false);
    }
  };

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const statusIcon = (status: AttendanceStatus | undefined) => {
    if (status === 'present') return <CheckCircle className="w-5 h-5 text-emerald-400" />;
    if (status === 'absent') return <XCircle className="w-5 h-5 text-red-400" />;
    if (status === 'late') return <Clock className="w-5 h-5 text-amber-400" />;
    return <div className="w-5 h-5 rounded-full border-2 border-slate-600" />;
  };

  const presentCount = students.filter((s) => records[s.id] === 'present').length;
  const absentCount = students.filter((s) => records[s.id] === 'absent').length;
  const lateCount = students.filter((s) => records[s.id] === 'late').length;

  return (
    <div className="space-y-5">
      {/* 날짜 선택 */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => shiftDate(-1)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        />
        <button type="button" onClick={() => shiftDate(1)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="flex gap-3 text-sm ml-2">
          <span className="text-emerald-400 font-bold">출석 {presentCount}</span>
          <span className="text-amber-400 font-bold">지각 {lateCount}</span>
          <span className="text-red-400 font-bold">결석 {absentCount}</span>
        </div>
      </div>

      {loadingDate ? (
        <div className="flex items-center justify-center py-12 text-slate-500 text-sm gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> 불러오는 중...
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">등록된 원생이 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {students.map((student) => (
            <div key={student.id} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{student.name}</p>
                <p className="text-xs text-slate-500">{student.classGroup}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {(['present', 'late', 'absent'] as AttendanceStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRecord(student.id, s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      records[student.id] === s
                        ? s === 'present' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : s === 'absent' ? 'bg-red-500/20 border-red-500 text-red-300'
                          : 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'
                    }`}
                  >
                    {s === 'present' ? '출석' : s === 'absent' ? '결석' : '지각'}
                  </button>
                ))}
                <div className="ml-1">{statusIcon(records[student.id] as AttendanceStatus | undefined)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={saving || students.length === 0}
        onClick={handleSave}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
      >
        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
        출결 저장
      </button>
    </div>
  );
}

// ── CSV 내보내기 ─────────────────────────────────────────────────────────────
function exportCSV(students: StoredStudent[]) {
  const header = ['이름', '반', '등록일', '협응력', '민첩성', '지구력', '균형감', '근력', '메모'];
  const rows = students.map((s) => [
    s.name,
    s.classGroup,
    s.enrolledAt,
    s.physical.coordination,
    s.physical.agility,
    s.physical.endurance,
    s.physical.balance,
    s.physical.strength,
    s.note ?? '',
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `spokedu_students_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── 메인 뷰 ─────────────────────────────────────────────────────────────────
export default function StudentsView() {
  const { ctx } = useProContext();
  const [students, setStudents] = useState<StoredStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'list' | 'attendance'>('list');
  const [search, setSearch] = useState('');
  const [modalStudent, setModalStudent] = useState<StoredStudent | null | 'new'>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const plan = ctx.entitlement.plan;
  const limit = PLAN_LIMITS[plan] ?? 10;
  const atLimit = students.length >= limit;
  const canExportCSV = plan === 'basic' || plan === 'pro';

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/spokedu-pro/students', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setStudents(data.students ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleSave = async (formData: Partial<StoredStudent>) => {
    setSaving(true);
    try {
      if (modalStudent === 'new') {
        const res = await fetch('/api/spokedu-pro/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
          credentials: 'include',
        });
        const data = await res.json();
        if (data.ok) {
          setStudents((prev) => [...prev, data.student]);
          setModalStudent(null);
        }
      } else if (modalStudent) {
        const res = await fetch(`/api/spokedu-pro/students/${modalStudent.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
          credentials: 'include',
        });
        const data = await res.json();
        if (data.ok) {
          setStudents((prev) => prev.map((s) => (s.id === data.student.id ? data.student : s)));
          setModalStudent(null);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
    try {
      const res = await fetch(`/api/spokedu-pro/students/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.ok) setStudents((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.classGroup.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="px-6 lg:px-12 py-10 pb-32 space-y-8 max-w-4xl mx-auto">
      {/* 헤더 */}
      <header className="space-y-3 border-b border-slate-800 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-700/50 text-slate-300 rounded-full text-xs font-bold uppercase tracking-widest">
          <Users className="w-4 h-4" /> 원생 관리
        </div>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tight">원생 관리</h2>
            <p className="text-slate-400 font-medium mt-1">
              원생을 등록하고 출결을 기록하세요.{' '}
              <span className="text-slate-500">
                {students.length}{limit !== Infinity ? `/${limit}` : ''}명
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            {canExportCSV && students.length > 0 && (
              <button
                type="button"
                onClick={() => exportCSV(students)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm font-bold hover:bg-slate-800 transition-colors"
              >
                <Download className="w-4 h-4" /> CSV 내보내기
              </button>
            )}
            <button
              type="button"
              disabled={atLimit}
              onClick={() => setModalStudent('new')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
            >
              <Plus className="w-4 h-4" /> 원생 추가
            </button>
          </div>
        </div>
      </header>

      {/* 플랜 한도 배너 */}
      {atLimit && limit !== Infinity && (
        <div className="px-5 py-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
          <span className="font-bold">{plan === 'free' ? 'Free' : 'Basic'} 플랜 한도 도달.</span>{' '}
          {plan === 'free'
            ? 'Basic 플랜으로 업그레이드하면 최대 50명까지 등록할 수 있습니다.'
            : 'Pro 플랜으로 업그레이드하면 원생을 무제한 등록할 수 있습니다.'}
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl w-fit">
        {(['list', 'attendance'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {t === 'list' ? '원생 목록' : '출결 관리'}
          </button>
        ))}
      </div>

      {/* 원생 목록 탭 */}
      {tab === 'list' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름 또는 반으로 검색"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500 text-sm gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> 불러오는 중...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm">
              {search ? '검색 결과가 없습니다.' : '등록된 원생이 없습니다. 원생 추가 버튼을 눌러 시작하세요.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-sm shrink-0">
                    {student.name.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{student.name}</p>
                    <p className="text-xs text-slate-500">{student.classGroup} · 등록일 {student.enrolledAt}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-3">
                    {(Object.keys(PHYSICAL_LABELS) as (keyof PhysicalFunctions)[]).map((key) => (
                      <div key={key} className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-slate-500">{PHYSICAL_LABELS[key].slice(0, 2)}</span>
                        <PhysicalBar value={student.physical[key]} />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      type="button"
                      onClick={() => setModalStudent(student)}
                      className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={deleteId === student.id}
                      onClick={() => handleDelete(student.id)}
                      className="p-2 rounded-lg hover:bg-red-900/30 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      {deleteId === student.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 출결 탭 */}
      {tab === 'attendance' && <AttendanceTab students={students} />}

      {/* 원생 추가/수정 모달 */}
      {modalStudent !== null && (
        <StudentModal
          student={modalStudent === 'new' ? null : modalStudent}
          onSave={handleSave}
          onClose={() => setModalStudent(null)}
          saving={saving}
        />
      )}
    </section>
  );
}
