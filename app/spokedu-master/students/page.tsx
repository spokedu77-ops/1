'use client';

import Link from 'next/link';
import { Award, ChevronRight, ExternalLink, FileText, MessageCircle, TrendingUp, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
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
  const [selectedId, setSelectedId] = useState(students[0]?.id ?? null);
  const [kakaoReadyId, setKakaoReadyId] = useState<string | null>(null);
  const selected = students.find((student) => student.id === selectedId) ?? students[0];
  const selectedRecordCount = selected ? records.filter((record) => record.students.some((student) => student.studentId === selected.id)).length : 0;
  const selectedParentToken = selected ? createParentShareToken(selected.id) : '';

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>student history</p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>학생 이력</h1>
        <p className="mt-2 max-w-[720px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          수업 기록이 쌓이면 학생별 성장 이력으로 이어지는 프리뷰 화면입니다. 첫 상용 버전에서는 라이브러리와 SPOMOVE 사용 흐름을 해치지 않는 범위에서 점진적으로 다듬습니다.
        </p>
      </header>

      {students.length === 0 ? (
        <section className="mx-[22px] rounded-[18px] p-6 text-center sm:mx-8 lg:mx-10" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <h2 className="text-[20px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>아직 등록된 학생이 없습니다</h2>
          <p className="mt-2 text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t3)' }}>수업 기록을 저장하면 학생 이력 프리뷰에 반영됩니다.</p>
          <Link href="/spokedu-master/class-record" className="mt-5 inline-flex h-11 items-center justify-center rounded-[12px] px-5 text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>수업 기록 시작</Link>
        </section>
      ) : null}

      <div className="grid gap-5 px-[22px] sm:px-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-10">
        {students.length > 0 ? <section className="space-y-2">
          {students.map((student) => (
            <button key={student.id} type="button" onClick={() => setSelectedId(student.id)} className="flex w-full items-center gap-3 rounded-[15px] p-3 text-left" style={{ background: selectedId === student.id ? 'rgba(99,102,241,0.14)' : 'var(--spm-s2)', border: selectedId === student.id ? '1px solid rgba(99,102,241,0.45)' : '1px solid var(--spm-br2)' }}>
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
              {kakaoReadyId === selected.id ? (
                <div className="rounded-[13px] p-3" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <p className="text-[12px] font-black" style={{ color: 'var(--spm-grn)' }}>보호자 공유 문구가 준비되었습니다.</p>
                  <p className="mt-1 text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>{selected.name} 학생의 최근 성장 기록을 설명 문구로 정리할 수 있습니다.</p>
                </div>
              ) : null}
              <div className="grid grid-cols-3 gap-2">
                <Link href="/spokedu-master/report" className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
                  <FileText size={15} />
                  리포트
                </Link>
                <Link href={`/spokedu-master/parent/${selected.id}?token=${selectedParentToken}`} className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
                  <ExternalLink size={15} />
                  링크
                </Link>
                <button type="button" onClick={() => setKakaoReadyId(selected.id)} className="flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black" style={{ background: kakaoReadyId === selected.id ? 'rgba(16,185,129,0.13)' : 'var(--spm-s3)', color: kakaoReadyId === selected.id ? 'var(--spm-grn)' : 'var(--spm-t)' }}>
                  <MessageCircle size={15} />
                  {kakaoReadyId === selected.id ? '준비됨' : '공유'}
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
