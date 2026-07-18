'use client';

import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { brandContactLinks, brandProfile } from '../data/brand';
import { koreanLineBreak, siteBtnPrimary, siteBtnSecondary } from '../lib/ui-classes';

const CONTENT_OPTIONS = [
  '수업안',
  '운영 매뉴얼',
  '지도자 교육·세미나',
  'SPOMOVE 도입 교육',
  '교구 활용 교육',
  '기관 컨설팅',
  '프로그램 라이선싱',
  '기타',
] as const;

const AGE_OPTIONS = ['유아', '초등', '중등', '혼합 연령', '지도자(성인)'] as const;
const PURPOSE_OPTIONS = ['내부 운영', '강사 교육', '기관 도입', '협업 검토', '구매·라이선스'] as const;
const TRAINING_OPTIONS = ['필요', '선택', '불필요', '상담 후 결정'] as const;
const PARTNERSHIP_OPTIONS = ['단건 구매', '구독·정기', '교육 위탁', '협업 검토', '기타'] as const;

const inputClass =
  'mt-1.5 w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15';
const labelClass = 'text-sm font-semibold text-slate-800';
const formShell =
  'overflow-hidden rounded-[1.5rem] border border-stone-200/70 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]';

type Status = { tone: 'idle' | 'ok' | 'error'; message: string };

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
            value === option
              ? 'border-teal-600 bg-teal-600 text-white'
              : 'border-stone-200 bg-white text-slate-700 hover:border-teal-300'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

/** 커리큘럼·지도자 교육 온페이지 문의 — /api/curriculum/leads */
export function CurriculumInquiryForm() {
  const [nameOrOrg, setNameOrOrg] = useState('');
  const [phone, setPhone] = useState('');
  const [contentType, setContentType] = useState('');
  const [targetAge, setTargetAge] = useState('');
  const [purpose, setPurpose] = useState('');
  const [teacherTraining, setTeacherTraining] = useState('');
  const [partnershipType, setPartnershipType] = useState('');
  const [extra, setExtra] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>({ tone: 'idle', message: '' });

  const canSubmit = useMemo(
    () =>
      Boolean(
        nameOrOrg.trim() &&
          phone.trim() &&
          contentType &&
          targetAge &&
          purpose &&
          teacherTraining &&
          partnershipType,
      ),
    [nameOrOrg, phone, contentType, targetAge, purpose, teacherTraining, partnershipType],
  );

  const reset = useCallback(() => {
    setNameOrOrg('');
    setPhone('');
    setContentType('');
    setTargetAge('');
    setPurpose('');
    setTeacherTraining('');
    setPartnershipType('');
    setExtra('');
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (!canSubmit) {
        setStatus({ tone: 'error', message: '필수 항목을 모두 선택·입력해 주세요.' });
        return;
      }

      setSubmitting(true);
      setStatus({ tone: 'idle', message: '' });
      try {
        const response = await fetch('/api/curriculum/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'curriculum',
            name_or_org: nameOrOrg.trim(),
            phone: phone.trim(),
            content_type: contentType,
            target_age: targetAge,
            purpose,
            teacher_training: teacherTraining,
            partnership_type: partnershipType,
            extra: extra.trim(),
          }),
        });
        const result = (await response.json().catch(() => null)) as
          | { ok?: boolean; message?: string }
          | null;
        if (!response.ok || !result?.ok) {
          setStatus({
            tone: 'error',
            message: result?.message || '접수에 실패했습니다. 잠시 후 다시 시도해 주세요.',
          });
          return;
        }
        reset();
        setStatus({
          tone: 'ok',
          message: '문의가 접수되었습니다. 담당자가 확인 후 연락드립니다.',
        });
      } catch {
        setStatus({ tone: 'error', message: '네트워크 오류로 접수에 실패했습니다.' });
      } finally {
        setSubmitting(false);
      }
    },
    [
      canSubmit,
      nameOrOrg,
      phone,
      contentType,
      targetAge,
      purpose,
      teacherTraining,
      partnershipType,
      extra,
      reset,
    ],
  );

  return (
    <section id="inquiry" className="scroll-mt-36 space-y-5 sm:space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-800">문의</p>
        <h2 className={`mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl ${koreanLineBreak}`}>
          지도자 교육·커리큘럼 문의
        </h2>
        <p className={`mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanLineBreak}`}>
          수업안, 매뉴얼, 세미나, SPOMOVE 도입 교육, 라이선싱 등 필요한 범위를 알려주시면 맞는 협업 방식을
          안내드립니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`${formShell} p-5 sm:p-6 lg:p-7`} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="curriculum-name">
              이름 / 기관명 <span className="text-teal-700">*</span>
            </label>
            <input
              id="curriculum-name"
              className={inputClass}
              value={nameOrOrg}
              onChange={(e) => setNameOrOrg(e.target.value)}
              placeholder="예: ○○키움센터 / 홍길동"
              required
            />
          </div>
          <div className="sm:col-span-2 sm:max-w-md">
            <label className={labelClass} htmlFor="curriculum-phone">
              연락처 <span className="text-teal-700">*</span>
            </label>
            <input
              id="curriculum-phone"
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              inputMode="tel"
              required
            />
          </div>
        </div>

        <fieldset className="mt-6">
          <legend className={labelClass}>
            필요한 콘텐츠·교육 <span className="text-teal-700">*</span>
          </legend>
          <ChipGroup options={CONTENT_OPTIONS} value={contentType} onChange={setContentType} />
        </fieldset>

        <fieldset className="mt-6">
          <legend className={labelClass}>
            대상 연령 <span className="text-teal-700">*</span>
          </legend>
          <ChipGroup options={AGE_OPTIONS} value={targetAge} onChange={setTargetAge} />
        </fieldset>

        <fieldset className="mt-6">
          <legend className={labelClass}>
            활용 목적 <span className="text-teal-700">*</span>
          </legend>
          <ChipGroup options={PURPOSE_OPTIONS} value={purpose} onChange={setPurpose} />
        </fieldset>

        <fieldset className="mt-6">
          <legend className={labelClass}>
            지도자 교육 필요 여부 <span className="text-teal-700">*</span>
          </legend>
          <ChipGroup options={TRAINING_OPTIONS} value={teacherTraining} onChange={setTeacherTraining} />
        </fieldset>

        <fieldset className="mt-6">
          <legend className={labelClass}>
            희망 협업·구매 형태 <span className="text-teal-700">*</span>
          </legend>
          <ChipGroup options={PARTNERSHIP_OPTIONS} value={partnershipType} onChange={setPartnershipType} />
        </fieldset>

        <div className="mt-6">
          <label className={labelClass} htmlFor="curriculum-extra">
            추가 문의
          </label>
          <textarea
            id="curriculum-extra"
            className={`${inputClass} min-h-[96px] resize-y`}
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="희망 일정, 인원, 기존 운영 방식 등 참고할 내용을 적어 주세요."
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
          <button type="submit" disabled={submitting || !canSubmit} className={`${siteBtnPrimary} disabled:opacity-60`}>
            {submitting ? '접수 중…' : '커리큘럼·교육 문의하기'}
          </button>
          <a href={brandContactLinks.phone} className={siteBtnSecondary}>
            전화 {brandProfile.phone}
          </a>
        </div>
      </form>
    </section>
  );
}
