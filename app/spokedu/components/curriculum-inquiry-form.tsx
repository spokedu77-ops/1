'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { brandContactLinks, brandProfile } from '../data/brand';
import {
  CURRICULUM_COMMERCIAL_MODES,
  curriculumCommercialModes,
  curriculumModeLabel,
  curriculumSubmitLabel,
  type CurriculumCommercialMode,
  type CurriculumFormDefaults,
} from '../data/curriculum-commercial-modes';
import { parseConversionEvidenceSlug } from '../data/commercial-routes';
import type { FieldRecordSlug } from '../data/field-records-catalog';
import { captureAcquisitionFromLocation, getAcquisitionContext } from '../lib/acquisition';
import { trackCommercialEvent } from '../lib/commercial-events';
import { koreanLineBreak, siteBtnPrimary, siteBtnSecondary } from '../lib/ui-classes';
import { useSearchParams } from 'next/navigation';

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

type Props = {
  leadMode: CurriculumCommercialMode;
  formDefaults?: CurriculumFormDefaults;
  onLeadModeChange?: (mode: CurriculumCommercialMode) => void;
};

/** 커리큘럼·지도자 교육 온페이지 문의 — /api/curriculum/leads */
export function CurriculumInquiryForm({ leadMode, formDefaults, onLeadModeChange }: Props) {
  const searchParams = useSearchParams();
  const [nameOrOrg, setNameOrOrg] = useState('');
  const [phone, setPhone] = useState('');
  const [contentType, setContentType] = useState('');
  const [targetAge, setTargetAge] = useState('');
  const [purpose, setPurpose] = useState('');
  const [teacherTraining, setTeacherTraining] = useState('');
  const [partnershipType, setPartnershipType] = useState('');
  const [extra, setExtra] = useState('');
  const [conversionEvidenceSlug, setConversionEvidenceSlug] = useState<FieldRecordSlug | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>({ tone: 'idle', message: '' });

  useEffect(() => {
    captureAcquisitionFromLocation();
    const evidence = parseConversionEvidenceSlug(searchParams.get('conversionEvidence'));
    if (evidence) setConversionEvidenceSlug(evidence);
  }, [searchParams]);

  useEffect(() => {
    if (!formDefaults) return;
    if (formDefaults.contentType) setContentType(formDefaults.contentType);
    if (formDefaults.purpose) setPurpose(formDefaults.purpose);
    if (formDefaults.teacherTraining) setTeacherTraining(formDefaults.teacherTraining);
    if (formDefaults.partnershipType) setPartnershipType(formDefaults.partnershipType);
  }, [formDefaults, leadMode]);

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
    setTargetAge('');
    setExtra('');
    if (formDefaults?.contentType) setContentType(formDefaults.contentType);
    else setContentType('');
    if (formDefaults?.purpose) setPurpose(formDefaults.purpose);
    else setPurpose('');
    if (formDefaults?.teacherTraining) setTeacherTraining(formDefaults.teacherTraining);
    else setTeacherTraining('');
    if (formDefaults?.partnershipType) setPartnershipType(formDefaults.partnershipType);
    else setPartnershipType('');
  }, [formDefaults]);

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (!canSubmit) {
        setStatus({ tone: 'error', message: '필수 항목을 모두 선택·입력해 주세요.' });
        return;
      }

      setSubmitting(true);
      setStatus({ tone: 'idle', message: '' });
      const ctaIntentId =
        curriculumCommercialModes[leadMode].primaryAction.intentId === 'master_view'
          ? 'master_org_inquiry'
          : curriculumCommercialModes[leadMode].primaryAction.intentId;
      try {
        const response = await fetch('/api/curriculum/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'curriculum',
            lead_mode: leadMode,
            name_or_org: nameOrOrg.trim(),
            phone: phone.trim(),
            content_type: contentType,
            target_age: targetAge,
            purpose,
            teacher_training: teacherTraining,
            partnership_type: partnershipType,
            extra: extra.trim(),
            acquisition: getAcquisitionContext(),
            cta_intent_id: ctaIntentId,
            conversion_evidence_slug: conversionEvidenceSlug ?? undefined,
          }),
        });
        const result = (await response.json().catch(() => null)) as
          | { ok?: boolean; message?: string; leadId?: string }
          | null;
        if (!response.ok || !result?.ok) {
          setStatus({
            tone: 'error',
            message: result?.message || '접수에 실패했습니다. 잠시 후 다시 시도해 주세요.',
          });
          return;
        }
        if (result.leadId) {
          trackCommercialEvent({
            name: 'form_submitted',
            route: 'curriculum',
            leadId: result.leadId,
            selectionId: leadMode,
            ctaIntentId,
          });
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
      leadMode,
      nameOrOrg,
      phone,
      contentType,
      targetAge,
      purpose,
      teacherTraining,
      partnershipType,
      extra,
      conversionEvidenceSlug,
      reset,
    ],
  );

  return (
    <section id="inquiry" className="scroll-mt-36 space-y-5 sm:space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-800">문의</p>
        <h2 className={`mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl ${koreanLineBreak}`}>
          {curriculumModeLabel(leadMode)} 문의
        </h2>
        <p className={`mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanLineBreak}`}>
          페이지에서 고른 도입 모드가 아래 기본값과 접수 데이터에 함께 저장됩니다. 세부 항목은 수정할 수 있습니다.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className={`${formShell} p-5 sm:p-6 lg:p-7`}
        noValidate
        data-lead-mode={leadMode}
        data-track-label={`curriculum-inquiry-${leadMode}`}
      >
        <div className="rounded-2xl border border-teal-200 bg-teal-50/70 px-4 py-3.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-800">현재 선택 모드</p>
          <p className="mt-1 text-sm font-semibold text-teal-950">{curriculumModeLabel(leadMode)}</p>
          {onLeadModeChange ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {CURRICULUM_COMMERCIAL_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onLeadModeChange(mode)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    mode === leadMode
                      ? 'border-teal-700 bg-teal-700 text-white'
                      : 'border-teal-200 bg-white text-teal-900 hover:border-teal-400'
                  }`}
                >
                  {curriculumModeLabel(mode)}
                </button>
              ))}
            </div>
          ) : null}
          {leadMode === 'master' ? (
            <p className={`mt-3 text-xs leading-relaxed text-teal-900/80 ${koreanLineBreak}`}>
              개인 지도자 구독은 Primary로 MASTER 제품 페이지를 이용하세요. 이 폼은 기관·단체 이용 문의용입니다.
            </p>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
              placeholder="예: 010-1234-5678"
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
            {submitting ? '접수 중…' : curriculumSubmitLabel(leadMode)}
          </button>
          <a href={brandContactLinks.phone} className={siteBtnSecondary}>
            전화 {brandProfile.phone}
          </a>
        </div>
      </form>
    </section>
  );
}
