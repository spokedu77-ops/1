'use client';

import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { brandContactLinks, brandProfile } from '../data/brand';
import { koreanLineBreak, siteBtnPrimary, siteBtnSecondary } from '../lib/ui-classes';

const PROGRAM_OPTIONS = [
  'SPOMOVE',
  '월간 뉴스포츠',
  '특수체육',
  '미니 올림픽',
  '스포츠 부스·원데이',
  '방학캠프',
  '맞춤 스포츠 특강',
  '기타',
] as const;

const AGE_OPTIONS = ['유아', '초등 저학년', '초등 고학년', '중등', '혼합 연령'] as const;
const HEADCOUNT_OPTIONS = ['10명 미만', '10~20명', '20~30명', '30명 이상'] as const;

const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';
const labelClass = 'text-sm font-semibold text-slate-800';
const hintClass = 'mt-1 text-xs leading-relaxed text-slate-500';

type Status = { tone: 'idle' | 'ok' | 'error'; message: string };

export function DispatchProposalForm() {
  const [organization, setOrganization] = useState('');
  const [manager, setManager] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [programs, setPrograms] = useState<string[]>([]);
  const [programOther, setProgramOther] = useState('');
  const [targetAge, setTargetAge] = useState<string[]>([]);
  const [headcount, setHeadcount] = useState('');
  const [specialNeeds, setSpecialNeeds] = useState('');
  const [inquiry, setInquiry] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>({ tone: 'idle', message: '' });

  const toggleProgram = useCallback((value: string) => {
    setPrograms((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }, []);

  const toggleAge = useCallback((value: string) => {
    setTargetAge((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }, []);

  const reset = useCallback(() => {
    setOrganization('');
    setManager('');
    setPhone('');
    setEmail('');
    setLocation('');
    setStartDate('');
    setEndDate('');
    setPrograms([]);
    setProgramOther('');
    setTargetAge([]);
    setHeadcount('');
    setSpecialNeeds('');
    setInquiry('');
  }, []);

  const programsPayload = useMemo(() => {
    const list = [...programs];
    if (programs.includes('기타') && programOther.trim()) {
      return list.map((p) => (p === '기타' ? `기타: ${programOther.trim()}` : p));
    }
    return list;
  }, [programs, programOther]);

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (!organization.trim() || !manager.trim()) {
        setStatus({ tone: 'error', message: '기관명과 담당자 정보는 필수입니다.' });
        return;
      }
      if (!phone.trim() && !email.trim()) {
        setStatus({ tone: 'error', message: '전화번호 또는 이메일 중 하나는 필수입니다.' });
        return;
      }

      setSubmitting(true);
      setStatus({ tone: 'idle', message: '' });
      try {
        const response = await fetch('/api/dispatch/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'dispatch',
            organization: organization.trim(),
            manager: manager.trim(),
            phone: phone.trim(),
            email: email.trim(),
            location: location.trim(),
            startDate,
            endDate,
            programs: programsPayload,
            targetAge,
            headcount,
            specialNeeds,
            inquiry: inquiry.trim(),
            source: 'spokedu-dispatch-proposal',
          }),
        });
        const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; message?: string } | null;
        if (!response.ok || !result?.ok) {
          setStatus({
            tone: 'error',
            message: result?.error || result?.message || '접수에 실패했습니다. 잠시 후 다시 시도해 주세요.',
          });
          return;
        }
        reset();
        setStatus({ tone: 'ok', message: '운영 상담이 접수되었습니다. 담당자가 확인 후 연락드립니다.' });
      } catch {
        setStatus({ tone: 'error', message: '네트워크 오류로 접수에 실패했습니다.' });
      } finally {
        setSubmitting(false);
      }
    },
    [
      organization,
      manager,
      phone,
      email,
      location,
      startDate,
      endDate,
      programsPayload,
      targetAge,
      headcount,
      specialNeeds,
      inquiry,
      reset,
    ],
  );

  return (
    <section id="contact" className="scroll-mt-24 space-y-6 sm:space-y-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-800">운영 상담</p>
        <h2 className={`mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl ${koreanLineBreak}`}>
          기관 맞춤 운영 상담
        </h2>
        <p className={`mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanLineBreak}`}>
          공간·인원·일정·프로그램 조건을 알려주시면 정규·원데이·방학·SPOMOVE 중 맞는 운영안을 제안합니다.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-900/[0.03] sm:p-6 lg:p-8"
        noValidate
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="dispatch-org">
              기관명 / 센터명 <span className="text-teal-700">*</span>
            </label>
            <input
              id="dispatch-org"
              className={inputClass}
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="예: ○○거점형키움센터"
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="dispatch-manager">
              담당자 직책 및 성함 <span className="text-teal-700">*</span>
            </label>
            <input
              id="dispatch-manager"
              className={inputClass}
              value={manager}
              onChange={(e) => setManager(e.target.value)}
              placeholder="예: 김○○ 담당자"
              required
            />
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50/50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-teal-900">연락처 안내</p>
          <p className={`mt-1 text-sm text-slate-600 ${koreanLineBreak}`}>
            전화번호 또는 이메일 중 하나만 있어도 접수됩니다. 운영안 안내는 이메일로 회신하는 경우가 많습니다.
          </p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="dispatch-phone">
              담당자 전화번호
            </label>
            <p className={hintClass}>휴대전화·유선 모두 가능</p>
            <input
              id="dispatch-phone"
              type="tel"
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="예: 010-1234-5678"
              autoComplete="tel"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="dispatch-email">
              담당자 이메일
            </label>
            <p className={hintClass}>운영안 회신용</p>
            <input
              id="dispatch-email"
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="예: manager@org.kr"
              autoComplete="email"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className={labelClass} htmlFor="dispatch-location">
            기관 소재지 <span className="font-medium text-slate-400">(선택)</span>
          </label>
          <input
            id="dispatch-location"
            className={inputClass}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="예: 서울 양천구"
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="dispatch-start">
              희망 시작일 <span className="font-medium text-slate-400">(선택)</span>
            </label>
            <input
              id="dispatch-start"
              type="date"
              className={inputClass}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="dispatch-end">
              희망 종료일 <span className="font-medium text-slate-400">(선택)</span>
            </label>
            <input
              id="dispatch-end"
              type="date"
              className={inputClass}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <fieldset className="mt-6">
          <legend className={labelClass}>희망 프로그램 (다중 선택)</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {PROGRAM_OPTIONS.map((option) => {
              const active = programs.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleProgram(option)}
                  className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                    active
                      ? 'border-teal-600 bg-teal-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {programs.includes('기타') ? (
            <input
              className={`${inputClass} mt-3`}
              value={programOther}
              onChange={(e) => setProgramOther(e.target.value)}
              placeholder="기타 프로그램·조건을 적어 주세요"
            />
          ) : null}
        </fieldset>

        <fieldset className="mt-6">
          <legend className={labelClass}>대상 연령 (다중 선택)</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {AGE_OPTIONS.map((option) => {
              const active = targetAge.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleAge(option)}
                  className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                    active
                      ? 'border-teal-600 bg-teal-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className={labelClass}>대략적인 인원</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {HEADCOUNT_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setHeadcount(option)}
                className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                  headcount === option
                    ? 'border-teal-600 bg-teal-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className={labelClass}>특수 아동 참여 유무</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {['있음', '없음', '상담 후 확인'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSpecialNeeds(option)}
                className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                  specialNeeds === option
                    ? 'border-teal-600 bg-teal-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-6">
          <label className={labelClass} htmlFor="dispatch-inquiry">
            희망 수업 내용 또는 방향성
          </label>
          <textarea
            id="dispatch-inquiry"
            className={`${inputClass} min-h-[110px] resize-y`}
            value={inquiry}
            onChange={(e) => setInquiry(e.target.value)}
            placeholder="운영 목적, 공간 조건, 꼭 반영하고 싶은 사항을 자유롭게 적어 주세요."
          />
        </div>

        {status.message ? (
          <p
            className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${
              status.tone === 'ok'
                ? 'bg-teal-50 text-teal-900'
                : status.tone === 'error'
                  ? 'bg-rose-50 text-rose-800'
                  : 'bg-slate-50 text-slate-700'
            }`}
            role="status"
          >
            {status.message}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button type="submit" disabled={submitting} className={`${siteBtnPrimary} disabled:opacity-60`}>
            {submitting ? '접수 중…' : '맞춤 운영안 받아보기'}
          </button>
          <a href={brandContactLinks.phone} className={siteBtnSecondary}>
            전화 상담 {brandProfile.phone}
          </a>
          <a
            href="https://pf.kakao.com/_VGWxeb/chat"
            target="_blank"
            rel="noopener noreferrer"
            className={siteBtnSecondary}
          >
            카카오 B2B 상담
          </a>
        </div>
      </form>
    </section>
  );
}
