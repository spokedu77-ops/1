'use client';

import { ArrowRight, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { brandContactLinks, brandProfile } from '../data/brand';
import {
  DISPATCH_PROGRAM_OPTIONS,
  parseConversionEvidenceSlug,
  parseDispatchProgramLabel,
} from '../data/commercial-routes';
import { KAKAO_CHANNEL_URL } from '../data/external-channels';
import type { FieldRecordSlug } from '../data/field-records-catalog';
import { getAcquisitionContext } from '../lib/acquisition';
import { trackCommercialEvent } from '../lib/commercial-events';
import {
  koreanLineBreak,
  marketingButtonPrimary,
  marketingButtonSecondary,
  marketingCardStatic,
  v0FilterChipActive,
  v0FilterChipBase,
  v0FilterChipIdle,
} from '../lib/ui-classes';

const AGE_OPTIONS = ['유아', '초등 저학년', '초등 고학년', '중등', '혼합 연령'] as const;
const HEADCOUNT_OPTIONS = ['10명 미만', '10~20명', '20~30명', '30명 이상'] as const;

const inputClass =
  'mt-1.5 w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15';
const v0InputClass =
  'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';
const labelClass = 'text-sm font-semibold text-slate-800';
const hintClass = 'mt-1 text-xs leading-relaxed text-stone-500';
type Status = { tone: 'idle' | 'ok' | 'error'; message: string };

const V0_PROGRAM_CHIPS = [
  { label: '정기수업', value: '월간 뉴스포츠' },
  { label: 'SPOMOVE', value: 'SPOMOVE' },
  { label: '특수·포용체육', value: '특수체육' },
  { label: '미니올림픽', value: '미니 올림픽' },
  { label: '스포츠부스', value: '스포츠 부스·원데이' },
  { label: '방학캠프·PAPS', value: 'PAPS 놀이체육' },
  { label: '맞춤상담', value: '맞춤 스포츠 특강' },
] as const;

export type DispatchProposalFormProps = {
  /** v0 /education 문의 섹션 — 흰 카드 폼만 렌더 */
  variant?: 'default' | 'educationV0';
};

export function DispatchProposalForm({ variant = 'default' }: DispatchProposalFormProps) {
  const searchParams = useSearchParams();
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
  const [conversionEvidenceSlug, setConversionEvidenceSlug] = useState<FieldRecordSlug | null>(null);
  const [v0ContactLine, setV0ContactLine] = useState('');
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
    setV0ContactLine('');
  }, []);

  useEffect(() => {
    const programLabel = parseDispatchProgramLabel(searchParams.get('program'));
    if (programLabel) {
      setPrograms((prev) => (prev.includes(programLabel) ? prev : [...prev, programLabel]));
    }
    const evidence = parseConversionEvidenceSlug(searchParams.get('conversionEvidence'));
    if (evidence) setConversionEvidenceSlug(evidence);
  }, [searchParams]);

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
      const resolvedPhone =
        variant === 'educationV0'
          ? v0ContactLine.includes('@')
            ? ''
            : v0ContactLine.trim()
          : phone.trim();
      const resolvedEmail =
        variant === 'educationV0'
          ? v0ContactLine.includes('@')
            ? v0ContactLine.trim()
            : ''
          : email.trim();

      if (!resolvedPhone && !resolvedEmail) {
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
            phone: resolvedPhone,
            email: resolvedEmail,
            location: location.trim(),
            startDate,
            endDate,
            programs: programsPayload,
            targetAge,
            headcount,
            specialNeeds,
            inquiry: inquiry.trim(),
            source: variant === 'educationV0' ? 'spokedu-education-v0' : 'spokedu-dispatch-proposal',
            acquisition: getAcquisitionContext({
              submitPath:
                typeof window !== 'undefined'
                  ? `${window.location.pathname}${window.location.search || ''}`
                  : '/education',
            }),
            cta_intent_id: 'dispatch_proposal',
            conversion_evidence_slug: conversionEvidenceSlug ?? undefined,
          }),
        });
        const result = (await response.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          message?: string;
          leadId?: string;
        } | null;
        if (!response.ok || !result?.ok) {
          setStatus({
            tone: 'error',
            message: result?.error || result?.message || '접수에 실패했습니다. 잠시 후 다시 시도해 주세요.',
          });
          return;
        }
        if (result.leadId) {
          trackCommercialEvent({
            name: 'form_submitted',
            route: 'dispatch',
            leadId: result.leadId,
            selectionId: programsPayload[0],
            ctaIntentId: 'dispatch_proposal',
          });
        }
        reset();
        setStatus({
          tone: 'ok',
          message: '접수가 완료되었습니다. 담당자가 확인 후 연락드립니다.',
        });
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
      v0ContactLine,
      variant,
      location,
      startDate,
      endDate,
      programsPayload,
      targetAge,
      headcount,
      specialNeeds,
      inquiry,
      conversionEvidenceSlug,
      reset,
    ],
  );

  if (variant === 'educationV0') {
    return (
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl bg-white p-7 text-slate-900 shadow-2xl md:p-10"
        noValidate
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={`text-sm font-bold ${koreanLineBreak}`}>
            기관/학교명
            <input
              required
              name="organization"
              className={v0InputClass}
              placeholder="예: 매동초등학교"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
          </label>
          <label className={`text-sm font-bold ${koreanLineBreak}`}>
            담당자 성함
            <input
              required
              name="name"
              className={v0InputClass}
              placeholder="홍길동"
              value={manager}
              onChange={(e) => setManager(e.target.value)}
            />
          </label>
        </div>
        <label className={`mt-5 block text-sm font-bold ${koreanLineBreak}`}>
          연락처 또는 이메일
          <input
            required
            name="contact"
            className={v0InputClass}
            placeholder="010-0000-0000 또는 이메일"
            value={v0ContactLine}
            onChange={(e) => setV0ContactLine(e.target.value)}
          />
        </label>
        <fieldset className="mt-5">
          <legend className="text-sm font-bold">희망 프로그램 선택</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {V0_PROGRAM_CHIPS.map(({ label, value }) => (
              <label key={label} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="program"
                  value={value}
                  className="peer sr-only"
                  checked={programs.includes(value)}
                  onChange={() => toggleProgram(value)}
                />
                <span
                  className={`inline-flex ${v0FilterChipBase} ${
                    programs.includes(value) ? v0FilterChipActive : v0FilterChipIdle
                  }`}
                >
                  {label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className={`mt-5 block text-sm font-bold ${koreanLineBreak}`}>
          예상 인원 및 간단 문의사항
          <textarea
            required
            name="message"
            rows={4}
            className={`${v0InputClass} resize-none`}
            placeholder="예상 인원, 희망 일정, 궁금한 점을 남겨주세요."
            value={inquiry}
            onChange={(e) => setInquiry(e.target.value)}
          />
        </label>
        {status.message ? (
          <p
            className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${
              status.tone === 'ok'
                ? 'bg-blue-50 text-blue-900'
                : status.tone === 'error'
                  ? 'bg-rose-50 text-rose-800'
                  : 'bg-slate-50 text-slate-700'
            }`}
            role="status"
          >
            {status.message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              접수 중…
            </>
          ) : (
            <>
              기관 조건으로 맞춤 운영안 받기
              <ArrowRight className="size-4" aria-hidden />
            </>
          )}
        </button>
      </form>
    );
  }

  return (
    <section id="contact" className="scroll-mt-36 space-y-5 sm:space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-800">운영안 요청</p>
        <h2 className={`mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl ${koreanLineBreak}`}>
          기관 조건으로 운영안 받기
        </h2>
        <p className={`mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanLineBreak}`}>
          프로그램·연령·인원을 알려주시면 운영 가능 범위를 맞춰 제안합니다.
          {conversionEvidenceSlug ? (
            <span className="mt-1 block text-xs font-semibold text-teal-800">
              연결 사례: {conversionEvidenceSlug}
            </span>
          ) : null}
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`${marketingCardStatic} overflow-hidden p-5 sm:p-6 lg:p-7`} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="dispatch-org">
              기관명 <span className="text-teal-700">*</span>
            </label>
            <input
              id="dispatch-org"
              className={inputClass}
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="예: ○○키움센터"
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="dispatch-manager">
              담당자 <span className="text-teal-700">*</span>
            </label>
            <input
              id="dispatch-manager"
              className={inputClass}
              value={manager}
              onChange={(e) => setManager(e.target.value)}
              placeholder="예: 홍길동"
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="dispatch-phone">
              연락처
            </label>
            <input
              id="dispatch-phone"
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="예: 010-1234-5678"
              inputMode="tel"
            />
            <p className={hintClass}>전화 또는 이메일 중 하나는 필수입니다.</p>
          </div>
          <div>
            <label className={labelClass} htmlFor="dispatch-email">
              이메일
            </label>
            <input
              id="dispatch-email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="예: name@org.kr"
              inputMode="email"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="dispatch-location">
              기관 소재지
            </label>
            <input
              id="dispatch-location"
              className={inputClass}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="예: 서울 양천구"
            />
          </div>
        </div>

        <fieldset className="mt-6">
          <legend className={labelClass}>희망 프로그램</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {DISPATCH_PROGRAM_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => toggleProgram(option)}
                className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                  programs.includes(option)
                    ? 'border-teal-600 bg-teal-600 text-white'
                    : 'border-stone-200 bg-white text-slate-700 hover:border-teal-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          {programs.includes('기타') ? (
            <input
              className={inputClass}
              value={programOther}
              onChange={(e) => setProgramOther(e.target.value)}
              placeholder="기타 프로그램명을 적어 주세요"
            />
          ) : null}
        </fieldset>

        <fieldset className="mt-6">
          <legend className={labelClass}>대상 연령</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {AGE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => toggleAge(option)}
                className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                  targetAge.includes(option)
                    ? 'border-teal-600 bg-teal-600 text-white'
                    : 'border-stone-200 bg-white text-slate-700 hover:border-teal-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className={labelClass}>예상 인원</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {HEADCOUNT_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setHeadcount(option)}
                className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                  headcount === option
                    ? 'border-teal-600 bg-teal-600 text-white'
                    : 'border-stone-200 bg-white text-slate-700 hover:border-teal-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="dispatch-start">
              희망 시작일
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
              희망 종료일
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

        <div className="mt-6">
          <label className={labelClass} htmlFor="dispatch-special">
            특수·통합 운영
          </label>
          <input
            id="dispatch-special"
            className={inputClass}
            value={specialNeeds}
            onChange={(e) => setSpecialNeeds(e.target.value)}
            placeholder="예: 통합반 포함 / 해당 없음"
          />
        </div>

        <div className="mt-6">
          <label className={labelClass} htmlFor="dispatch-inquiry">
            희망 수업 내용·방향
          </label>
          <textarea
            id="dispatch-inquiry"
            className={`${inputClass} min-h-[96px] resize-y`}
            value={inquiry}
            onChange={(e) => setInquiry(e.target.value)}
            placeholder="공간, 일정, 목적 등 참고할 내용을 적어 주세요."
          />
        </div>

        {status.message ? (
          <p
            className={`mt-4 rounded-2xl px-4 py-3 text-sm font-medium ${
              status.tone === 'ok'
                ? 'bg-teal-50 text-teal-900'
                : status.tone === 'error'
                  ? 'bg-rose-50 text-rose-800'
                  : 'bg-stone-50 text-stone-700'
            }`}
            role="status"
          >
            {status.message}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button type="submit" disabled={submitting} className={`${marketingButtonPrimary} disabled:opacity-60`}>
            {submitting ? '접수 중…' : '기관 조건으로 운영안 요청하기'}
          </button>
          <a href={brandContactLinks.phone} className={marketingButtonSecondary}>
            전화 {brandProfile.phone}
          </a>
          {KAKAO_CHANNEL_URL ? (
            <a href={KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className={marketingButtonSecondary}>
              카카오 채널
            </a>
          ) : null}
        </div>
      </form>
    </section>
  );
}
