'use client';

import { useState } from 'react';
import { Users, CheckCircle, Plus, X, UserPlus, ClipboardList, TrendingUp } from 'lucide-react';

type Student = {
  id: string;
  name: string;
  classGroup: string;
  status: 'present' | 'absent' | 'late';
};

type AddStudentForm = {
  name: string;
  classGroup: string;
};

const CLASS_GROUPS = ['유치부 인지반', '초등 기초반', '초등 심화반', '중등반'];

/** 빈 상태 컴포넌트 */
function EmptyState({
  onAddStudent,
}: {
  onAddStudent: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-5">
      <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
        <Users className="w-9 h-9 text-slate-600" />
      </div>
      <div className="space-y-2">
        <p className="text-white font-black text-xl">등록된 원생이 없습니다</p>
        <p className="text-slate-400 text-sm max-w-xs mx-auto">
          원생을 등록하면 출결 관리, 관찰 기록, 학부모 리포트를 사용할 수 있습니다.
        </p>
      </div>
      <button
        type="button"
        onClick={onAddStudent}
        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 transition-colors"
      >
        <UserPlus className="w-4 h-4" /> 첫 원생 등록하기
      </button>
    </div>
  );
}

/** 원생 카드 */
function StudentCard({
  student,
  onToggleStatus,
}: {
  student: Student;
  onToggleStatus: (id: string) => void;
}) {
  const statusColors = {
    present: 'bg-emerald-500',
    absent: 'bg-slate-600',
    late: 'bg-amber-500',
  };
  const statusLabels = {
    present: '출석',
    absent: '결석',
    late: '지각',
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white font-black text-lg">{student.name}</p>
          <p className="text-slate-400 text-xs font-medium">{student.classGroup}</p>
        </div>
        <button
          type="button"
          onClick={() => onToggleStatus(student.id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors ${statusColors[student.status]}`}
        >
          {statusLabels[student.status]}
        </button>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <ClipboardList className="w-3.5 h-3.5" />
        관찰 기록 0건
      </div>
    </div>
  );
}

export default function DataCenterView() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddStudentForm>({ name: '', classGroup: CLASS_GROUPS[0] });
  const [addError, setAddError] = useState('');

  const filteredStudents =
    selectedGroup === 'all' ? students : students.filter((s) => s.classGroup === selectedGroup);

  const presentCount = filteredStudents.filter((s) => s.status === 'present').length;
  const totalCount = filteredStudents.length;

  const handleAddStudent = () => {
    if (!addForm.name.trim()) {
      setAddError('이름을 입력해 주세요.');
      return;
    }
    const newStudent: Student = {
      id: crypto.randomUUID(),
      name: addForm.name.trim(),
      classGroup: addForm.classGroup,
      status: 'absent',
    };
    setStudents((prev) => [...prev, newStudent]);
    setAddForm({ name: '', classGroup: CLASS_GROUPS[0] });
    setAddError('');
    setShowAddForm(false);
  };

  const handleToggleStatus = (id: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const next: Student['status'] = s.status === 'absent' ? 'present' : s.status === 'present' ? 'late' : 'absent';
        return { ...s, status: next };
      })
    );
  };

  const handleMarkAllPresent = () => {
    setStudents((prev) =>
      prev.map((s) =>
        selectedGroup === 'all' || s.classGroup === selectedGroup ? { ...s, status: 'present' } : s
      )
    );
  };

  return (
    <section className="px-8 lg:px-16 py-12 pb-36 space-y-6">
      {/* 헤더 */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
        <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-400" /> 원생 관리 및 평가
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-sm font-bold rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
          >
            <option value="all">전체 반</option>
            {CLASS_GROUPS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          {students.length > 0 && (
            <button
              type="button"
              onClick={handleMarkAllPresent}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-colors"
            >
              <CheckCircle className="w-4 h-4" /> 전체 출석
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> 원생 추가
          </button>
        </div>
      </header>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">클래스 출석률 (오늘)</p>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-black text-white">{presentCount}</span>
            <span className="text-xl text-slate-400 font-bold mb-1">/ {totalCount}명</span>
          </div>
          {totalCount > 0 && (
            <div className="mt-3 w-full bg-slate-700 rounded-full h-1.5">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(presentCount / totalCount) * 100}%` }}
              />
            </div>
          )}
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">작성 완료된 관찰 기록</p>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-black text-blue-400">0</span>
            <span className="text-xl text-blue-500 font-bold mb-1">건</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">수업 후 기록을 추가하세요.</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">오늘 획득한 클래스 경험치</p>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-black text-purple-400">0</span>
            <span className="text-xl text-purple-500 font-bold mb-1">XP</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> 출석·수업 완료 시 XP가 쌓입니다.
          </p>
        </div>
      </div>

      {/* 원생 추가 폼 */}
      {showAddForm && (
        <div className="bg-slate-800 border border-blue-600/50 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-black text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-400" /> 원생 등록
            </h3>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setAddError(''); }}
              className="text-slate-500 hover:text-white"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">이름 *</label>
              <input
                type="text"
                value={addForm.name}
                onChange={(e) => { setAddForm((f) => ({ ...f, name: e.target.value })); setAddError(''); }}
                placeholder="원생 이름"
                className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500 font-medium"
                onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">반 선택</label>
              <select
                value={addForm.classGroup}
                onChange={(e) => setAddForm((f) => ({ ...f, classGroup: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500 font-medium"
              >
                {CLASS_GROUPS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>
          {addError && <p className="text-red-400 text-sm">{addError}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleAddStudent}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm transition-colors"
            >
              등록
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setAddError(''); }}
              className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-sm transition-colors"
            >
              취소
            </button>
          </div>
          <p className="text-xs text-slate-500">
            * 현재 로컬 임시 저장 상태입니다. DB 연동 후 영구 저장됩니다.
          </p>
        </div>
      )}

      {/* 원생 그리드 or 빈 상태 */}
      {filteredStudents.length === 0 ? (
        <EmptyState onAddStudent={() => setShowAddForm(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredStudents.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      )}
    </section>
  );
}
