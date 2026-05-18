'use client';

import Link from 'next/link';
import { Award, Check, ChevronRight, ExternalLink, FileText, Link2, Plus, Trash2, TrendingUp, TriangleAlert } from 'lucide-react';
import { useLayoutEffect, useState } from 'react';
import { BottomSheet } from '../components/ui/BottomSheet';
import { createParentShareToken } from '../lib/subscription';
import { useMasterStore } from '../store';

function SkillBar({ label, value, delta }: { label: string; value: number; delta: string }) {
  const stalled = delta === '정체' || delta.startsWith('-');
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-bold" style={{ color: 'var(--spm-t)' }}>{label}</span>
        <span className="text-[11px] font-black" style={{ color: stalled ? 'var(--spm-amb)' : 'var(--spm-grn)' }}>{delta}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--spm-s4)' }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: stalled ? 'var(--spm-amb)' : 'linear-gradient(90deg,#6366f1,#10b981)' }} />
      </div>
    </div>
  );
}

export default function StudentsPage() {
  const students = useMasterStore((state) => state.students);
  const records = useMasterStore((state) => state.classRecords);
  const addStudent = useMasterStore((state) => state.addStudent);
  const removeStudent = useMasterStore((state) => state.removeStudent);
  const [selectedId, setSelectedId] = useState<string | null>(students[0]?.id ?? null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [parentShareTokens, setParentShareTokens] = useState<Record<string, string>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [newMeta, setNewMeta] = useState('');
  const selected = students.find((student) => student.id === selectedId) ?? students[0];

  const handleAdd = () => {
    if (!newName.trim()) return;
    const newId = Date.now().toString();
    addStudent(newName.trim(), newGroup.trim() || '미분류', newMeta.trim(), newId);
    setSelectedId(newId);
    setNewName('');
    setNewGroup('');
    setNewMeta('');
    setAddOpen(false);
  };
  const selectedRecordCount = selected ? records.filter((record) => record.students.some((student) => student.studentId === selected.id)).length : 0;
  const copyParentLink = async (studentId: string, token: string) => {
    const url = `${window.location.origin}/spokedu-master/parent/${studentId}?token=${token}`;
    await navigator.clipboard.writeText(url).catch(() => undefined);
    setCopiedLinkId(studentId);
    window.setTimeout(() => setCopiedLinkId(null), 2000);
  };

  useLayoutEffect(() => {
    if (!selected) return;
    setParentShareTokens((prev) => {
      if (prev[selected.id]) return prev;
      return { ...prev, [selected.id]: createParentShareToken(selected.id) };
    });
  }, [selected]);

  const selectedParentToken = selected ? parentShareTokens[selected.id] ?? '' : '';

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>student history</p>
            <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>학생 이력</h1>
            <p className="mt-2 max-w-[720px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
              수업 기록이 쌓이면 학생별 성장 이력, 출석률, 동작 발전을 한눈에 확인할 수 있습니다.
            </p>
          </div>
          <button type="button" onClick={() => setAddOpen(true)} className="mt-1 flex h-11 shrink-0 items-center gap-2 rounded-[12px] px-4 text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
            <Plus size={15} />
            학생 추가
          </button>
        </div>
      </header>

      {students.length === 0 ? (
        <section className="mx-[22px] rounded-[18px] p-6 text-center sm:mx-8 lg:mx-10" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <h2 className="text-[20px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>아직 등록된 학생이 없습니다</h2>
          <p className="mt-2 text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t3)' }}>수업 기록을 저장하면 학생 이력에 자동으로 반영됩니다.</p>
          <Link href="/spokedu-master/class-record" className="mt-5 inline-flex h-11 items-center justify-center rounded-[12px] px-5 text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>수업 기록 시작</Link>
        </section>
      ) : null}

      <div className="grid gap-5 px-[22px] sm:px-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-10">
        {students.length > 0 ? <section className="space-y-2">
          {students.map((student) => (
            <div key={student.id} className="flex items-center gap-2 rounded-[15px]" style={{ background: selectedId === student.id ? 'rgba(99,102,241,0.14)' : 'var(--spm-s2)', border: selectedId === student.id ? '1px solid rgba(99,102,241,0.45)' : '1px solid var(--spm-br)' }}>
              <button type="button" onClick={() => setSelectedId(student.id)} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left">
                <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-[15px] font-black text-white" style={{ background: 'var(--spm-acc)', fontFamily: 'var(--spm-font-display)' }}>
                  {student.name.slice(0, 1)}
                  {student.risk ? <span className="absolute right-0 top-0 h-3 w-3 rounded-full" style={{ background: 'var(--spm-red)', border: '2px solid var(--spm-s2)' }} /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>{student.name}</strong>
                  <span className="mt-1 block text-[11px]" style={{ color: 'var(--spm-t3)' }}>{student.group} / {student.level}</span>
                </span>
                <ChevronRight size={16} color="var(--spm-t3)" />
              </button>
              <button type="button" onClick={() => { removeStudent(student.id); if (selectedId === student.id) setSelectedId(null); }} className="mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s3)' }} aria-label={`${student.name} 삭제`}>
                <Trash2 size={14} color="var(--spm-red)" />
              </button>
            </div>
          ))}
        </section> : null}

        {selected ? (
          <section className="overflow-hidden rounded-[20px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-acc)' }}>{selected.group}</p>
                  <h2 className="mt-2 text-[30px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>{selected.name}</h2>
                  <p className="mt-1 text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>{selected.level}</p>
                  <p className="mt-2 text-[11px] font-semibold" style={{ color: 'var(--spm-grn)' }}>누적 기록 {selectedRecordCount}건</p>
                </div>
                <span className="grid h-12 w-12 place-items-center rounded-full" style={{ background: 'rgba(16,185,129,0.14)' }}>
                  <TrendingUp size={20} color="var(--spm-grn)" />
                </span>
              </div>
              {selected.risk ? (
                <div className="mt-5 flex gap-2 rounded-[13px] p-3" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--spm-red)' }}>
                  <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                  <p className="text-[12px] font-bold leading-5">{selected.risk}</p>
                </div>
              ) : null}
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  ['수업', `${selected.classes}회`],
                  ['출석률', `${selected.attendance}%`],
                  ['연속', `${selected.streak}주`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[12px] p-3 text-center" style={{ background: 'var(--spm-s3)' }}>
                    <p className="text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{value}</p>
                    <p className="mt-1 text-[10px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5 border-t p-5" style={{ borderColor: 'var(--spm-br2)' }}>
              <div>
                <h3 className="mb-3 text-[16px] font-black" style={{ color: 'var(--spm-t)' }}>동작 성장</h3>
                <div className="space-y-4">{selected.skills.map((skill) => <SkillBar key={skill.label} label={skill.label} value={skill.value} delta={skill.delta} />)}</div>
              </div>
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-[16px] font-black" style={{ color: 'var(--spm-t)' }}>
                  <Award size={17} color="var(--spm-amb)" />
                  배지
                </h3>
                <div className="flex flex-wrap gap-2">{selected.badges.map((badge) => <span key={badge} className="rounded-full px-3 py-2 text-[12px] font-black" style={{ background: 'rgba(245,158,11,0.13)', color: 'var(--spm-amb)' }}>{badge}</span>)}</div>
              </div>
              <div>
                <h3 className="mb-3 text-[16px] font-black" style={{ color: 'var(--spm-t)' }}>최근 이력</h3>
                <div className="space-y-2">{selected.history.map((item) => <p key={item} className="rounded-[12px] p-3 text-[12px] font-semibold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>{item}</p>)}</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Link href="/spokedu-master/report" className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
                  <FileText size={15} />
                  설명 문구
                </Link>
                <button type="button" onClick={() => void copyParentLink(selected.id, selectedParentToken)} className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black" style={{ background: copiedLinkId === selected.id ? 'rgba(16,185,129,0.13)' : 'var(--spm-s3)', color: copiedLinkId === selected.id ? 'var(--spm-grn)' : 'var(--spm-t)' }}>
                  {copiedLinkId === selected.id ? <Check size={15} /> : <Link2 size={15} />}
                  {copiedLinkId === selected.id ? '복사됨' : '링크 복사'}
                </button>
                <Link href={`/spokedu-master/parent/${selected.id}?token=${selectedParentToken}`} className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
                  <ExternalLink size={15} />
                  미리보기
                </Link>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <BottomSheet open={addOpen} title="학생 추가" onClose={() => setAddOpen(false)}>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>이름 *</span>
            <input type="text" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="예: 김민준" className="h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} />
          </label>
          <label className="block">
            <span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>반 / 그룹</span>
            <input type="text" value={newGroup} onChange={(event) => setNewGroup(event.target.value)} placeholder="예: 초등 A반, 유아반" className="h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} />
          </label>
          <label className="block">
            <span className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>나이 / 수강 기간</span>
            <input type="text" value={newMeta} onChange={(event) => setNewMeta(event.target.value)} placeholder="예: 8세 / 3개월차" className="h-11 w-full rounded-[12px] border px-3 text-[14px] font-bold outline-none" style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }} />
          </label>
          <button type="button" onClick={handleAdd} disabled={!newName.trim()} className="h-12 w-full rounded-[12px] text-[14px] font-black text-white disabled:opacity-50" style={{ background: 'var(--spm-acc)' }}>
            추가
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
