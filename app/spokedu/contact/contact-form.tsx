'use client';

import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { brandContactLinks, brandProfile, type ContactInquiryType } from '../data/site';
import { contactPageContent, contactTypeOptions } from './contact-page-data';
import { submitInquiry } from './inquiry-submit';
import { btnPrimary, cardInteractive, fineHover } from '../lib/ui-classes';
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
  preferredRegion: '',
  message: '',
};

const PRIVATE_DEFAULT: PrivateInquiryFields = {
  ...COMMON_DEFAULT,
  childAge: '',
  preferredClassType: '',
  preferredLocation: '',
};

const DISPATCH_DEFAULT: DispatchInquiryFields = {
  ...COMMON_DEFAULT,
  organizationName: '',
  targetAge: '',
  expectedParticipants: '',
  preferredOperation: '',
};

const CURRICULUM_DEFAULT: CurriculumInquiryFields = {
  ...COMMON_DEFAULT,
  nameOrOrg: '',
  inquiryPurpose: '',
  utilizationTarget: '',
};

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

const inputClass =
  'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-base text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

const accentStyles = {
  violet: {
    badge: 'border border-violet-200/80 bg-violet-50/80 text-violet-800',
    activeBorder: 'border-violet-300 bg-violet-50/70 ring-1 ring-violet-200/90',
    activeTitle: 'text-violet-950',
    cta: 'text-violet-700',
  },
  sky: {
    badge: 'border border-sky-200/80 bg-sky-50/80 text-sky-800',
    activeBorder: 'border-sky-300 bg-sky-50/70 ring-1 ring-sky-200/90',
    activeTitle: 'text-sky-950',
    cta: 'text-sky-700',
  },
  teal: {
    badge: 'border border-teal-200/80 bg-teal-50/80 text-teal-800',
    activeBorder: 'border-teal-300 bg-teal-50/70 ring-1 ring-teal-200/90',
    activeTitle: 'text-teal-950',
    cta: 'text-teal-700',
  },
} as const;

const SUBMIT_ERROR_MESSAGE =
  '문의 내용을 전송하는 중 일시적인 문제가 발생했습니다.\n잠시 후 다시 시도하시거나, 아래 전화·이메일로 직접 연락 주셔도 빠르게 안내드립니다.';

function isInquiryType(value: string | null): value is InquiryType {
  return contactTypeOptions.some((option) => option.id === value);
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d-]/g, '');
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-slate-800">
        {label}
        {required ? <span className="text-indigo-600"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function ContactSidebar() {
  const { sidebar } = contactPageContent;

  return (
    <aside className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/60 p-5 shadow-sm shadow-slate-900/[0.04] sm:p-6 lg:sticky lg:top-24">
      <p className="text-base font-bold text-slate-950">{sidebar.title}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">{sidebar.description}</p>
      <dl className="mt-5 space-y-4 border-t border-slate-100 pt-5 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">대표</dt>
          <dd className="mt-1.5 text-base font-medium text-slate-900">{brandProfile.representative}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">전화</dt>
          <dd className="mt-1.5">
            <a
              href={brandContactLinks.phone}
              data-track="cta-phone"
              data-track-label={contactPageContent.contactTracks.phone}
              className={`text-base font-medium text-slate-900 underline-offset-2 hover:underline ${focusRing}`}
            >
              {brandProfile.phone}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">이메일</dt>
          <dd className="mt-1.5 break-all">
            <a
              href={brandContactLinks.email}
              data-track="cta-email"
              data-track-label={contactPageContent.contactTracks.email}
              className={`text-base font-medium text-slate-900 underline-offset-2 hover:underline ${focusRing}`}
            >
              {brandProfile.email}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">운영지역</dt>
          <dd className="mt-1.5 text-base leading-relaxed text-slate-800">{brandProfile.serviceArea}</dd>
        </div>
      </dl>
    </aside>
  );
}

function CommonFields({
  values,
  inquiryTypeLabel,
  onChange,
}: {
  values: InquiryCommonFields;
  inquiryTypeLabel: string;
  onChange: (patch: Partial<InquiryCommonFields>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
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
      <Field label="이메일">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => onChange({ email: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field label="희망 지역" required>
        <input
          required
          placeholder="예: 서울 강남, 경기 성남"
          value={values.preferredRegion}
          onChange={(e) => onChange({ preferredRegion: e.target.value })}
          className={inputClass}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="문의 유형">
          <input readOnly value={inquiryTypeLabel} className={`${inputClass} bg-slate-50 text-slate-700`} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="문의 내용" required>
          <textarea
            required
            rows={4}
            value={values.message}
            onChange={(e) => onChange({ message: e.target.value })}
            className={`${inputClass} min-h-[6.5rem] resize-y`}
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
  const [inquiryType, setInquiryType] = useState<InquiryType>('private');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<SubmitNotice>(null);
  const [privateForm, setPrivateForm] = useState<PrivateInquiryFields>(PRIVATE_DEFAULT);
  const [dispatchForm, setDispatchForm] = useState<DispatchInquiryFields>(DISPATCH_DEFAULT);
  const [curriculumForm, setCurriculumForm] = useState<CurriculumInquiryFields>(CURRICULUM_DEFAULT);

  useEffect(() => {
    const requestedType = searchParams.get('type');
    const wantsProposal = searchParams.get('proposal') === 'true';
    const resolvedType: InquiryType = isInquiryType(requestedType)
      ? requestedType
      : wantsProposal
        ? 'dispatch'
        : 'private';

    setInquiryType(resolvedType);

    const classType = searchParams.get('classType');
    if (classType === '1to1') {
      setPrivateForm((prev) => ({ ...prev, preferredClassType: '1:1' }));
    } else if (classType === 'small-group') {
      setPrivateForm((prev) => ({ ...prev, preferredClassType: '소그룹' }));
    }

    if (wantsProposal) {
      setDispatchForm((prev) => ({
        ...prev,
        preferredOperation: prev.preferredOperation || '제안 요청',
        message: prev.message.trim() ? prev.message : '기관 프로그램 제안 상담을 요청합니다.',
      }));
    }

    if (resolvedType === 'curriculum' && searchParams.get('intent') === 'partnership') {
      setCurriculumForm((prev) => ({
        ...prev,
        inquiryPurpose: prev.inquiryPurpose || '라이선싱',
        utilizationTarget: prev.utilizationTarget || '협업 검토',
      }));
    }

    if (resolvedType === 'private') {
      const fromQuery = searchParams.get('reportSummary')?.trim() ?? '';
      const fromStorage =
        typeof window !== 'undefined'
          ? (window.localStorage.getItem('private.moveReport.summary')?.trim() ?? '')
          : '';
      const reportSummary = fromQuery || fromStorage;
      if (reportSummary) {
        const prefix = `[Move report 요약]\n${reportSummary}`;
        setPrivateForm((prev) => ({
          ...prev,
          message: prev.message.trim() ? prev.message : prefix,
        }));
      }
    }
  }, [searchParams]);

  const activeOption = useMemo(
    () => contactTypeOptions.find((option) => option.id === inquiryType) ?? contactTypeOptions[0],
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
    if (!activeOption || submitting) return;

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
    } catch {
      setNotice({
        kind: 'error',
        text: SUBMIT_ERROR_MESSAGE,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const inquiryTypeLabel = activeOption.title;

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-8">
      <div className="space-y-6 lg:col-span-8">
        <section id="contact-type-select" className="space-y-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl">목적에 맞는 상담 흐름</h2>
            <p className="mt-1 text-sm text-slate-600 [word-break:keep-all]">
              아래에서 문의 유형을 선택하면 맞춤 입력 항목이 바로 표시됩니다.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-3">
            {contactTypeOptions.map((option) => {
              const active = inquiryType === option.id;
              const accent = accentStyles[option.accent];
              return (
                <button
                  key={option.id}
                  type="button"
                  data-track={`contact-${option.id}`}
                  data-track-label={option.selectTrackLabel}
                  onClick={() => selectType(option.id)}
                  className={`flex h-full min-h-[10.75rem] flex-col rounded-2xl border p-4 text-left transition active:scale-[0.99] sm:min-h-[11.25rem] sm:p-5 ${cardInteractive} ${focusRing} ${
                    active
                      ? accent.activeBorder
                      : `border-slate-200/90 bg-white shadow-sm ${fineHover}hover:border-slate-300 ${fineHover}hover:shadow-md`
                  }`}
                >
                  <span
                    className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-bold tracking-wide ${accent.badge}`}
                  >
                    {option.step}
                  </span>
                  <p
                    className={`mt-3 text-base font-bold leading-snug sm:text-[17px] ${active ? accent.activeTitle : 'text-slate-950'}`}
                  >
                    {option.title}
                  </p>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 line-clamp-3">{option.description}</p>
                  <span className={`mt-4 text-sm font-semibold ${active ? accent.cta : 'text-slate-700'}`}>
                    {active ? '선택됨 · ' : ''}
                    {option.ctaLabel} →
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div ref={formRef}>
          <form
            onSubmit={onSubmit}
            className="space-y-5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/[0.04] sm:p-5"
          >
            <div className="border-b border-slate-100 pb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">상담 접수</p>
              <h3 className="mt-1 text-lg font-bold text-slate-950 sm:text-xl">{activeOption.title}</h3>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-900">기본 정보</p>
              {inquiryType === 'private' ? (
                <CommonFields
                  values={privateForm}
                  inquiryTypeLabel={inquiryTypeLabel}
                  onChange={(patch) => setPrivateForm((p) => ({ ...p, ...patch }))}
                />
              ) : null}
              {inquiryType === 'dispatch' ? (
                <CommonFields
                  values={dispatchForm}
                  inquiryTypeLabel={inquiryTypeLabel}
                  onChange={(patch) => setDispatchForm((p) => ({ ...p, ...patch }))}
                />
              ) : null}
              {inquiryType === 'curriculum' ? (
                <CommonFields
                  values={curriculumForm}
                  inquiryTypeLabel={inquiryTypeLabel}
                  onChange={(patch) => setCurriculumForm((p) => ({ ...p, ...patch }))}
                />
              ) : null}
            </div>

            {inquiryType === 'private' ? (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <p className="text-sm font-bold text-slate-900">개인수업 상담 정보</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="아이 연령" required>
                    <input
                      required
                      placeholder="예: 만 8세, 초등 2학년"
                      value={privateForm.childAge}
                      onChange={(e) => setPrivateForm((p) => ({ ...p, childAge: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="희망 수업 형태" required>
                    <select
                      required
                      value={privateForm.preferredClassType}
                      onChange={(e) => setPrivateForm((p) => ({ ...p, preferredClassType: e.target.value }))}
                      className={`${inputClass} bg-white`}
                    >
                      <option value="">선택해 주세요</option>
                      <option value="1:1">1:1</option>
                      <option value="소그룹">소그룹</option>
                      <option value="상담 후 결정">상담 후 결정</option>
                    </select>
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="희망 장소" required>
                      <select
                        required
                        value={privateForm.preferredLocation}
                        onChange={(e) => setPrivateForm((p) => ({ ...p, preferredLocation: e.target.value }))}
                        className={`${inputClass} bg-white`}
                      >
                        <option value="">선택해 주세요</option>
                        <option value="LAB">LAB</option>
                        <option value="아파트 커뮤니티">아파트 커뮤니티</option>
                        <option value="공원">공원</option>
                        <option value="기타">기타</option>
                      </select>
                    </Field>
                  </div>
                </div>
              </div>
            ) : null}

            {inquiryType === 'dispatch' ? (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <p className="text-sm font-bold text-slate-900">기관 프로그램 정보</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label="기관명" required>
                      <input
                        required
                        value={dispatchForm.organizationName}
                        onChange={(e) => setDispatchForm((p) => ({ ...p, organizationName: e.target.value }))}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  <Field label="대상 연령" required>
                    <input
                      required
                      value={dispatchForm.targetAge}
                      onChange={(e) => setDispatchForm((p) => ({ ...p, targetAge: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="예상 인원" required>
                    <input
                      required
                      value={dispatchForm.expectedParticipants}
                      onChange={(e) => setDispatchForm((p) => ({ ...p, expectedParticipants: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="희망 운영 형태" required>
                      <select
                        required
                        value={dispatchForm.preferredOperation}
                        onChange={(e) => setDispatchForm((p) => ({ ...p, preferredOperation: e.target.value }))}
                        className={`${inputClass} bg-white`}
                      >
                        <option value="">선택해 주세요</option>
                        <option value="정규수업">정규수업</option>
                        <option value="원데이">원데이</option>
                        <option value="방학캠프">방학캠프</option>
                        <option value="제안 요청">제안 요청</option>
                      </select>
                    </Field>
                  </div>
                </div>
              </div>
            ) : null}

            {inquiryType === 'curriculum' ? (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <p className="text-sm font-bold text-slate-900">커리큘럼·콘텐츠 정보</p>
                <div className="grid gap-3 sm:grid-cols-2">
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
                  <Field label="문의 목적" required>
                    <select
                      required
                      value={curriculumForm.inquiryPurpose}
                      onChange={(e) => setCurriculumForm((p) => ({ ...p, inquiryPurpose: e.target.value }))}
                      className={`${inputClass} bg-white`}
                    >
                      <option value="">선택해 주세요</option>
                      <option value="수업안">수업안</option>
                      <option value="매뉴얼">매뉴얼</option>
                      <option value="강사교육">강사교육</option>
                      <option value="라이선싱">라이선싱</option>
                      <option value="기타">기타</option>
                    </select>
                  </Field>
                  <Field label="활용 대상" required>
                    <select
                      required
                      value={curriculumForm.utilizationTarget}
                      onChange={(e) => setCurriculumForm((p) => ({ ...p, utilizationTarget: e.target.value }))}
                      className={`${inputClass} bg-white`}
                    >
                      <option value="">선택해 주세요</option>
                      <option value="내부 운영">내부 운영</option>
                      <option value="외부 강사 교육">외부 강사 교육</option>
                      <option value="기관 도입">기관 도입</option>
                      <option value="협업 검토">협업 검토</option>
                    </select>
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
                <p className="whitespace-pre-line leading-6 [word-break:keep-all]">{notice.text}</p>
                {notice.kind === 'ok' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setNotice(null);
                      selectType('private');
                    }}
                    className="mt-3 min-h-11 text-sm font-semibold text-emerald-800 underline underline-offset-2"
                  >
                    다른 문의 유형으로 접수하기
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
                  className={`${btnPrimary} w-full sm:w-full`}
                >
                  {submitting ? '접수 중...' : '문의 접수하기'}
                </button>
              </div>
            ) : null}
          </form>
        </div>

        <div className="lg:hidden">
          <ContactSidebar />
        </div>
      </div>

      <div className="lg:col-span-4">
        <div className="hidden lg:block">
          <ContactSidebar />
        </div>
      </div>
    </div>
  );
}
