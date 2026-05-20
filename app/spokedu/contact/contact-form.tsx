'use client';

import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  brandContactLinks,
  brandProfile,
  contactPage,
  siteBrand,
  type ContactInquiryType,
} from '../data/site';
import { contactTypeOptions } from '../data/contact';
import { submitInquiry } from './inquiry-submit';
import { cardInteractive, fineHover } from '../lib/ui-classes';
import type {
  CurriculumInquiryFields,
  DispatchInquiryFields,
  InquiryCommonFields,
  InquiryPayload,
  InquiryType,
  PrivateInquiryFields,
} from './inquiry-types';

type SubmitNotice = { kind: 'ok' | 'error'; text: string } | null;

const COMMON_DEFAULT: InquiryCommonFields = {
  name: '',
  phone: '',
  email: '',
  message: '',
};

const PRIVATE_DEFAULT: PrivateInquiryFields = {
  ...COMMON_DEFAULT,
  childAge: '',
  exerciseExperience: '',
  concern: '',
  preferredClassType: '',
  preferredLocation: '',
  preferredTime: '',
};

const DISPATCH_DEFAULT: DispatchInquiryFields = {
  ...COMMON_DEFAULT,
  organizationName: '',
  organizationType: '',
  targetAge: '',
  expectedParticipants: '',
  availableSpace: '',
  preferredSchedule: '',
  preferredProgram: '',
  proposalNeeded: '필요',
};

const CURRICULUM_DEFAULT: CurriculumInquiryFields = {
  ...COMMON_DEFAULT,
  nameOrOrg: '',
  contentType: '',
  targetAge: '',
  purpose: '',
  trainingNeeded: '필요',
  partnershipType: '',
};

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

const inputClass =
  'min-h-12 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

function isInquiryType(value: string | null): value is InquiryType {
  return contactTypeOptions.some((option) => option.id === value);
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d-]/g, '');
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-indigo-600"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function ContactSidebar() {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 lg:sticky lg:top-24">
      <p className="text-sm font-semibold text-slate-900">연락처</p>
      <dl className="mt-3 space-y-2.5 text-sm text-slate-700">
        <div>
          <dt className="text-xs font-semibold text-slate-500">대표</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{siteBrand.representative}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">전화</dt>
          <dd className="mt-0.5">
            <a
              href={brandContactLinks.phone}
              data-track="cta-phone"
              data-track-label={contactPage.contactTracks.phone}
              className={`font-medium text-slate-900 underline-offset-2 hover:underline ${focusRing}`}
            >
              {siteBrand.phone}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">이메일</dt>
          <dd className="mt-0.5 break-all">
            <a
              href={brandContactLinks.email}
              data-track="cta-email"
              data-track-label={contactPage.contactTracks.email}
              className={`font-medium text-slate-900 underline-offset-2 hover:underline ${focusRing}`}
            >
              {siteBrand.email}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">운영권역</dt>
          <dd className="mt-0.5 leading-5">{siteBrand.serviceArea}</dd>
        </div>
      </dl>
      <p className="mt-4 text-xs leading-5 text-slate-500">
        {brandProfile.nameKo}는 문의 유형에 맞춰 필요한 항목만 받습니다.
      </p>
    </aside>
  );
}

function CommonFields({
  values,
  onChange,
}: {
  values: InquiryCommonFields;
  onChange: (patch: Partial<InquiryCommonFields>) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="이름" required>
        <input
          required
          autoComplete="name"
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field label="연락처" required>
        <input
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={(e) => onChange({ phone: normalizePhone(e.target.value) })}
          className={inputClass}
        />
      </Field>
      <Field label="이메일" required>
        <input
          required
          type="email"
          inputMode="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => onChange({ email: e.target.value })}
          className={inputClass}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="문의 내용" required>
          <textarea
            required
            rows={3}
            value={values.message}
            onChange={(e) => onChange({ message: e.target.value })}
            className={`${inputClass} min-h-[5.5rem]`}
          />
        </Field>
      </div>
    </div>
  );
}

export default function SpokeduContactForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);
  const [inquiryType, setInquiryType] = useState<InquiryType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<SubmitNotice>(null);
  const [privateForm, setPrivateForm] = useState<PrivateInquiryFields>(PRIVATE_DEFAULT);
  const [dispatchForm, setDispatchForm] = useState<DispatchInquiryFields>(DISPATCH_DEFAULT);
  const [curriculumForm, setCurriculumForm] = useState<CurriculumInquiryFields>(CURRICULUM_DEFAULT);

  useEffect(() => {
    const requestedType = searchParams.get('type');
    if (isInquiryType(requestedType)) {
      setInquiryType(requestedType);
    }

    const classType = searchParams.get('classType');
    if (classType === '1to1') {
      setPrivateForm((prev) => ({ ...prev, preferredClassType: '1:1 개인 체육수업' }));
    } else if (classType === 'small-group') {
      setPrivateForm((prev) => ({ ...prev, preferredClassType: '2~4명 소그룹 수업' }));
    }

    if (requestedType === 'curriculum' && searchParams.get('intent') === 'partnership') {
      setCurriculumForm((prev) => ({
        ...prev,
        partnershipType: prev.partnershipType || '콘텐츠 제휴·라이선싱',
        contentType: prev.contentType || '프로그램 라이선싱',
      }));
    }
  }, [searchParams]);

  const activeOption = useMemo(
    () => contactTypeOptions.find((option) => option.id === inquiryType) ?? null,
    [inquiryType],
  );

  function selectType(type: ContactInquiryType) {
    setInquiryType(type);
    setNotice(null);
    router.replace(`/spokedu/contact?type=${type}`, { scroll: false });
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function resetType() {
    setInquiryType(null);
    setNotice(null);
    router.replace('/spokedu/contact', { scroll: false });
  }

  function buildPayload(): InquiryPayload {
    const createdAt = new Date().toISOString();
    if (inquiryType === 'private') {
      return { type: 'private', createdAt, ...privateForm };
    }
    if (inquiryType === 'dispatch') {
      return { type: 'dispatch', createdAt, ...dispatchForm };
    }
    return { type: 'curriculum', createdAt, ...curriculumForm };
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inquiryType || !activeOption || submitting) return;

    setNotice(null);
    setSubmitting(true);

    try {
      const payload = buildPayload();
      const result = await submitInquiry(payload);

      if (inquiryType === 'private') {
        setPrivateForm(PRIVATE_DEFAULT);
      } else if (inquiryType === 'dispatch') {
        setDispatchForm(DISPATCH_DEFAULT);
      } else {
        setCurriculumForm(CURRICULUM_DEFAULT);
      }

      setNotice({
        kind: 'ok',
        text: activeOption.successMessage,
      });

      if (result.mode === 'temp') {
        setNotice({
          kind: 'ok',
          text: `${activeOption.successMessage}\n\n접수 내용은 안전하게 저장되었으며, 담당자가 순차적으로 확인합니다.`,
        });
      }
    } catch (error) {
      setNotice({
        kind: 'error',
        text: error instanceof Error ? error.message : '문의 처리 중 오류가 발생했습니다.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(240px,280px)] lg:items-start lg:gap-6">
      <div className="space-y-5">
        <section id="contact-type-select" className="space-y-3">
          <h2 className="text-lg font-bold text-slate-950 sm:text-xl">문의 유형을 선택해 주세요</h2>
          <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-3">
            {contactPage.inquiryTypes.map((option) => {
              const active = inquiryType === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  data-track={`contact-${option.id}`}
                  data-track-label={option.selectTrackLabel}
                  onClick={() => selectType(option.id)}
                  className={`rounded-2xl border p-4 text-left transition active:scale-[0.99] sm:p-5 ${cardInteractive} ${focusRing} ${
                    active
                      ? 'border-indigo-400 bg-indigo-50 shadow-md ring-2 ring-indigo-200'
                      : `border-slate-200 bg-white ${fineHover}hover:border-indigo-200 ${fineHover}hover:bg-indigo-50/30`
                  }`}
                >
                  <p className={`text-base font-semibold leading-snug ${active ? 'text-indigo-900' : 'text-slate-900'}`}>
                    {option.title}
                  </p>
                  <p className="mt-2 text-sm leading-5 text-slate-600">{option.description}</p>
                  {active ? (
                    <span className="mt-3 inline-flex text-xs font-semibold text-indigo-700">선택됨 →</span>
                  ) : (
                    <span className="mt-3 inline-flex text-xs font-semibold text-slate-500">선택하기 →</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <div ref={formRef}>
          {inquiryType && activeOption ? (
            <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">문의 접수</p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900 sm:text-xl">{activeOption.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={resetType}
                  className={`rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 ${focusRing} ${fineHover}hover:border-slate-300 ${fineHover}hover:text-slate-900`}
                >
                  유형 다시 선택
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-slate-800">기본 정보</p>
                {inquiryType === 'private' ? (
                  <CommonFields
                    values={privateForm}
                    onChange={(patch) => setPrivateForm((p) => ({ ...p, ...patch }))}
                  />
                ) : null}
                {inquiryType === 'dispatch' ? (
                  <CommonFields
                    values={dispatchForm}
                    onChange={(patch) => setDispatchForm((p) => ({ ...p, ...patch }))}
                  />
                ) : null}
                {inquiryType === 'curriculum' ? (
                  <CommonFields
                    values={curriculumForm}
                    onChange={(patch) => setCurriculumForm((p) => ({ ...p, ...patch }))}
                  />
                ) : null}
              </div>

              {inquiryType === 'private' ? (
                <div className="space-y-4 border-t border-slate-100 pt-4">
                  <p className="text-sm font-medium text-slate-800">개인·소그룹 수업 정보</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="아이 연령" required>
                      <input
                        required
                        value={privateForm.childAge}
                        onChange={(e) => setPrivateForm((p) => ({ ...p, childAge: e.target.value }))}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="운동 경험" required>
                      <input
                        required
                        value={privateForm.exerciseExperience}
                        onChange={(e) => setPrivateForm((p) => ({ ...p, exerciseExperience: e.target.value }))}
                        className={inputClass}
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="현재 고민" required>
                        <textarea
                          required
                          rows={2}
                          value={privateForm.concern}
                          onChange={(e) => setPrivateForm((p) => ({ ...p, concern: e.target.value }))}
                          className={`${inputClass} min-h-[4.5rem]`}
                        />
                      </Field>
                    </div>
                    <Field label="희망 수업 형태" required>
                      <input
                        required
                        value={privateForm.preferredClassType}
                        onChange={(e) => setPrivateForm((p) => ({ ...p, preferredClassType: e.target.value }))}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="희망 장소" required>
                      <input
                        required
                        value={privateForm.preferredLocation}
                        onChange={(e) => setPrivateForm((p) => ({ ...p, preferredLocation: e.target.value }))}
                        className={inputClass}
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="희망 요일/시간" required>
                        <input
                          required
                          value={privateForm.preferredTime}
                          onChange={(e) => setPrivateForm((p) => ({ ...p, preferredTime: e.target.value }))}
                          className={inputClass}
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              ) : null}

              {inquiryType === 'dispatch' ? (
                <div className="space-y-4 border-t border-slate-100 pt-4">
                  <p className="text-sm font-medium text-slate-800">기관 파견 수업 정보</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="기관명" required>
                      <input
                        required
                        value={dispatchForm.organizationName}
                        onChange={(e) => setDispatchForm((p) => ({ ...p, organizationName: e.target.value }))}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="기관 유형" required>
                      <input
                        required
                        value={dispatchForm.organizationType}
                        onChange={(e) => setDispatchForm((p) => ({ ...p, organizationType: e.target.value }))}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="대상 연령" required>
                      <input
                        required
                        value={dispatchForm.targetAge}
                        onChange={(e) => setDispatchForm((p) => ({ ...p, targetAge: e.target.value }))}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="예상 참여 인원" required>
                      <input
                        required
                        value={dispatchForm.expectedParticipants}
                        onChange={(e) => setDispatchForm((p) => ({ ...p, expectedParticipants: e.target.value }))}
                        className={inputClass}
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="사용 가능한 공간" required>
                        <input
                          required
                          value={dispatchForm.availableSpace}
                          onChange={(e) => setDispatchForm((p) => ({ ...p, availableSpace: e.target.value }))}
                          className={inputClass}
                        />
                      </Field>
                    </div>
                    <Field label="희망 일정" required>
                      <input
                        required
                        value={dispatchForm.preferredSchedule}
                        onChange={(e) => setDispatchForm((p) => ({ ...p, preferredSchedule: e.target.value }))}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="희망 프로그램" required>
                      <input
                        required
                        value={dispatchForm.preferredProgram}
                        onChange={(e) => setDispatchForm((p) => ({ ...p, preferredProgram: e.target.value }))}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="제안서 필요 여부" required>
                      <select
                        required
                        value={dispatchForm.proposalNeeded}
                        onChange={(e) => setDispatchForm((p) => ({ ...p, proposalNeeded: e.target.value }))}
                        className={`${inputClass} bg-white`}
                      >
                        <option value="필요">필요</option>
                        <option value="불필요">불필요</option>
                        <option value="검토 중">검토 중</option>
                      </select>
                    </Field>
                  </div>
                </div>
              ) : null}

              {inquiryType === 'curriculum' ? (
                <div className="space-y-4 border-t border-slate-100 pt-4">
                  <p className="text-sm font-medium text-slate-800">커리큘럼·콘텐츠 정보</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Field label="기관명 또는 소속" required>
                        <input
                          required
                          value={curriculumForm.nameOrOrg}
                          onChange={(e) => setCurriculumForm((p) => ({ ...p, nameOrOrg: e.target.value }))}
                          className={inputClass}
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="필요한 콘텐츠 유형" required>
                        <input
                          required
                          value={curriculumForm.contentType}
                          onChange={(e) => setCurriculumForm((p) => ({ ...p, contentType: e.target.value }))}
                          className={inputClass}
                        />
                      </Field>
                    </div>
                    <Field label="대상 연령" required>
                      <input
                        required
                        value={curriculumForm.targetAge}
                        onChange={(e) => setCurriculumForm((p) => ({ ...p, targetAge: e.target.value }))}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="활용 목적" required>
                      <input
                        required
                        value={curriculumForm.purpose}
                        onChange={(e) => setCurriculumForm((p) => ({ ...p, purpose: e.target.value }))}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="강사 교육 필요 여부" required>
                      <select
                        required
                        value={curriculumForm.trainingNeeded}
                        onChange={(e) => setCurriculumForm((p) => ({ ...p, trainingNeeded: e.target.value }))}
                        className={`${inputClass} bg-white`}
                      >
                        <option value="필요">필요</option>
                        <option value="불필요">불필요</option>
                        <option value="검토 중">검토 중</option>
                      </select>
                    </Field>
                    <Field label="제휴 또는 구매 형태" required>
                      <input
                        required
                        value={curriculumForm.partnershipType}
                        onChange={(e) => setCurriculumForm((p) => ({ ...p, partnershipType: e.target.value }))}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </div>
              ) : null}

              {notice ? (
                <div
                  className={`rounded-xl px-4 py-3.5 text-sm ${
                    notice.kind === 'ok'
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
                      : 'border border-red-200 bg-red-50 text-red-900'
                  }`}
                >
                  <p className="whitespace-pre-line leading-6">{notice.text}</p>
                  {notice.kind === 'ok' ? (
                    <button
                      type="button"
                      onClick={resetType}
                      className="mt-3 text-sm font-semibold text-emerald-800 underline underline-offset-2"
                    >
                      다른 문의 유형 접수하기
                    </button>
                  ) : null}
                </div>
              ) : null}

              {notice?.kind !== 'ok' ? (
                <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
                  <button
                    type="submit"
                    disabled={submitting}
                    data-track={`contact-submit-${inquiryType}`}
                    data-track-label={activeOption.submitTrackLabel}
                    className={`flex min-h-12 w-full items-center justify-center rounded-full bg-slate-950 px-4 py-3 text-base font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${fineHover}hover:bg-slate-800`}
                  >
                    {submitting ? '접수 중...' : '문의 접수하기'}
                  </button>
                </div>
              ) : null}
            </form>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm leading-6 text-slate-600">
              위에서 문의 유형을 선택하면 해당 항목만 입력할 수 있습니다.
            </p>
          )}
        </div>

        <div className="lg:hidden">
          <ContactSidebar />
        </div>
      </div>

      <div className="mt-6 hidden lg:mt-0 lg:block">
        <ContactSidebar />
      </div>
    </div>
  );
}
