'use client';

import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { brandContactLinks, brandProfile, type ContactInquiryType } from '../data/site';
import {
  CONTACT_API_FAILURE_MESSAGE,
  CONTACT_SUCCESS_MESSAGE,
  contactPageContent,
  contactTypeOptions,
} from './contact-page-data';
import { ContactFallback } from './contact-fallback';
import {
  clearStoredInquiryDraft,
  loadStoredInquiryDraft,
  migrateLegacyInquiryStorage,
  type StoredInquiryDraft,
} from './inquiry-draft';
import { submitInquiry } from './inquiry-submit';
import { btnPrimary, cardInteractive, fineHover } from '../lib/ui-classes';
import type {
  CurriculumInquiryFields,
  DispatchInquiryFields,
  InquiryCommonFields,
  InquiryPayload,
  InquiryType,
  OtherInquiryFields,
  PrivateInquiryFields,
  SpomoveInquiryFields,
} from './inquiry-types';

type SubmitNotice =
  | { kind: 'ok'; text: string }
  | { kind: 'error'; text: string; showFallback: boolean }
  | null;

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

const SPOMOVE_DEFAULT: SpomoveInquiryFields = { ...DISPATCH_DEFAULT };

const CURRICULUM_DEFAULT: CurriculumInquiryFields = {
  ...COMMON_DEFAULT,
  nameOrOrg: '',
  inquiryPurpose: '',
  utilizationTarget: '',
};

const OTHER_DEFAULT: OtherInquiryFields = {
  ...COMMON_DEFAULT,
  nameOrOrg: '',
  collaborationPurpose: '',
};

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500';

const inputClass =
  'min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-base text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

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
  cyan: {
    badge: 'border border-cyan-200/80 bg-cyan-50/80 text-cyan-800',
    activeBorder: 'border-cyan-300 bg-cyan-50/70 ring-1 ring-cyan-200/90',
    activeTitle: 'text-cyan-950',
    cta: 'text-cyan-700',
  },
  teal: {
    badge: 'border border-teal-200/80 bg-teal-50/80 text-teal-800',
    activeBorder: 'border-teal-300 bg-teal-50/70 ring-1 ring-teal-200/90',
    activeTitle: 'text-teal-950',
    cta: 'text-teal-700',
  },
  slate: {
    badge: 'border border-slate-200/80 bg-slate-50/80 text-slate-800',
    activeBorder: 'border-slate-300 bg-slate-50/70 ring-1 ring-slate-200/90',
    activeTitle: 'text-slate-950',
    cta: 'text-slate-700',
  },
} as const;

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
    <aside className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6 lg:sticky lg:top-24 lg:p-7">
      <p className="text-base font-bold text-slate-950">{sidebar.title}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 [word-break:keep-all]">{sidebar.description}</p>
      <dl className="mt-5 space-y-4 border-t border-slate-100 pt-5 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">대표</dt>
          <dd className="mt-1.5 pl-0.5 text-base font-medium text-slate-900">{brandProfile.representative}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">전화</dt>
          <dd className="mt-1.5 pl-0.5">
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
          <dd className="mt-1.5 break-all pl-0.5">
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
          <dd className="mt-1.5 pl-0.5 text-base leading-relaxed text-slate-800">{brandProfile.serviceArea}</dd>
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
        <Field label="상담 유형">
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

function InstitutionFields({
  values,
  onChange,
  title,
}: {
  values: DispatchInquiryFields | SpomoveInquiryFields;
  onChange: (patch: Partial<DispatchInquiryFields>) => void;
  title: string;
}) {
  return (
    <div className="space-y-3 border-t border-slate-100 pt-4">
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="기관명" required>
            <input
              required
              value={values.organizationName}
              onChange={(e) => onChange({ organizationName: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="대상 연령" required>
          <input
            required
            value={values.targetAge}
            onChange={(e) => onChange({ targetAge: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="예상 인원" required>
          <input
            required
            value={values.expectedParticipants}
            onChange={(e) => onChange({ expectedParticipants: e.target.value })}
            className={inputClass}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="희망 운영 형태" required>
            <select
              required
              value={values.preferredOperation}
              onChange={(e) => onChange({ preferredOperation: e.target.value })}
              className={`${inputClass} bg-white`}
            >
              <option value="">선택해 주세요</option>
              <option value="정규수업">정규수업</option>
              <option value="원데이">원데이</option>
              <option value="방학캠프">방학캠프</option>
              <option value="SPOMOVE 도입">SPOMOVE 도입</option>
              <option value="제안 요청">제안 요청</option>
            </select>
          </Field>
        </div>
      </div>
    </div>
  );
}

function applyPayloadToForms(payload: InquiryPayload, handlers: {
  setPrivateForm: (v: PrivateInquiryFields) => void;
  setDispatchForm: (v: DispatchInquiryFields) => void;
  setSpomoveForm: (v: SpomoveInquiryFields) => void;
  setCurriculumForm: (v: CurriculumInquiryFields) => void;
  setOtherForm: (v: OtherInquiryFields) => void;
}) {
  if (payload.type === 'private') {
    handlers.setPrivateForm({
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      preferredRegion: payload.preferredRegion,
      message: payload.message,
      childAge: payload.childAge,
      preferredClassType: payload.preferredClassType,
      preferredLocation: payload.preferredLocation,
    });
    return;
  }
  if (payload.type === 'dispatch') {
    handlers.setDispatchForm({
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      preferredRegion: payload.preferredRegion,
      message: payload.message,
      organizationName: payload.organizationName,
      targetAge: payload.targetAge,
      expectedParticipants: payload.expectedParticipants,
      preferredOperation: payload.preferredOperation,
    });
    return;
  }
  if (payload.type === 'spomove') {
    handlers.setSpomoveForm({
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      preferredRegion: payload.preferredRegion,
      message: payload.message,
      organizationName: payload.organizationName,
      targetAge: payload.targetAge,
      expectedParticipants: payload.expectedParticipants,
      preferredOperation: payload.preferredOperation,
    });
    return;
  }
  if (payload.type === 'curriculum') {
    handlers.setCurriculumForm({
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      preferredRegion: payload.preferredRegion,
      message: payload.message,
      nameOrOrg: payload.nameOrOrg,
      inquiryPurpose: payload.inquiryPurpose,
      utilizationTarget: payload.utilizationTarget,
    });
    return;
  }
  handlers.setOtherForm({
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    preferredRegion: payload.preferredRegion,
    message: payload.message,
    nameOrOrg: payload.nameOrOrg,
    collaborationPurpose: payload.collaborationPurpose,
  });
}

export default function SpokeduContactForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);
  const [inquiryType, setInquiryType] = useState<InquiryType>('private');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<SubmitNotice>(null);
  const [storedDraft, setStoredDraft] = useState<StoredInquiryDraft | null>(null);
  const [privateForm, setPrivateForm] = useState<PrivateInquiryFields>(PRIVATE_DEFAULT);
  const [dispatchForm, setDispatchForm] = useState<DispatchInquiryFields>(DISPATCH_DEFAULT);
  const [spomoveForm, setSpomoveForm] = useState<SpomoveInquiryFields>(SPOMOVE_DEFAULT);
  const [curriculumForm, setCurriculumForm] = useState<CurriculumInquiryFields>(CURRICULUM_DEFAULT);
  const [otherForm, setOtherForm] = useState<OtherInquiryFields>(OTHER_DEFAULT);

  useEffect(() => {
    migrateLegacyInquiryStorage();
    const draft = loadStoredInquiryDraft();
    if (draft) setStoredDraft(draft);
  }, []);

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
        const prefix = `[간단 진단 요약]\n${reportSummary}`;
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
    if (inquiryType === 'private') return { type: 'private', createdAt, ...privateForm };
    if (inquiryType === 'dispatch') return { type: 'dispatch', createdAt, ...dispatchForm };
    if (inquiryType === 'spomove') return { type: 'spomove', createdAt, ...spomoveForm };
    if (inquiryType === 'curriculum') return { type: 'curriculum', createdAt, ...curriculumForm };
    return { type: 'other', createdAt, ...otherForm };
  }

  function resetFormForType(type: InquiryType) {
    if (type === 'private') setPrivateForm(PRIVATE_DEFAULT);
    else if (type === 'dispatch') setDispatchForm(DISPATCH_DEFAULT);
    else if (type === 'spomove') setSpomoveForm(SPOMOVE_DEFAULT);
    else if (type === 'curriculum') setCurriculumForm(CURRICULUM_DEFAULT);
    else setOtherForm(OTHER_DEFAULT);
  }

  function restoreDraft() {
    if (!storedDraft) return;
    setInquiryType(storedDraft.payload.type);
    router.replace(`/spokedu/contact?type=${storedDraft.payload.type}`, { scroll: false });
    applyPayloadToForms(storedDraft.payload, {
      setPrivateForm,
      setDispatchForm,
      setSpomoveForm,
      setCurriculumForm,
      setOtherForm,
    });
    setNotice(null);
  }

  function discardDraft() {
    clearStoredInquiryDraft();
    setStoredDraft(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeOption || submitting) return;

    setNotice(null);
    setSubmitting(true);

    try {
      const payload = buildPayload();
      const result = await submitInquiry(payload);

      if (!result.ok) {
        setStoredDraft(loadStoredInquiryDraft());
        setNotice({
          kind: 'error',
          text: CONTACT_API_FAILURE_MESSAGE,
          showFallback: true,
        });
        return;
      }

      clearStoredInquiryDraft();
      setStoredDraft(null);
      resetFormForType(inquiryType);
      setNotice({ kind: 'ok', text: CONTACT_SUCCESS_MESSAGE });
    } catch {
      setNotice({
        kind: 'error',
        text: CONTACT_API_FAILURE_MESSAGE,
        showFallback: true,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const inquiryTypeLabel = activeOption.title;
  const commonValues =
    inquiryType === 'private'
      ? privateForm
      : inquiryType === 'dispatch'
        ? dispatchForm
        : inquiryType === 'spomove'
          ? spomoveForm
          : inquiryType === 'curriculum'
            ? curriculumForm
            : otherForm;

  const onCommonChange = (patch: Partial<InquiryCommonFields>) => {
    if (inquiryType === 'private') setPrivateForm((p) => ({ ...p, ...patch }));
    else if (inquiryType === 'dispatch') setDispatchForm((p) => ({ ...p, ...patch }));
    else if (inquiryType === 'spomove') setSpomoveForm((p) => ({ ...p, ...patch }));
    else if (inquiryType === 'curriculum') setCurriculumForm((p) => ({ ...p, ...patch }));
    else setOtherForm((p) => ({ ...p, ...patch }));
  };

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
      <div className="space-y-6 lg:col-span-8">
        {storedDraft ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-950">
            <p className="font-semibold">임시 보관된 문의 내용이 있습니다.</p>
            <p className="mt-1 leading-relaxed [word-break:keep-all]">
              이전에 작성하신 내용이 브라우저에 보관되어 있습니다. 불러오거나 삭제할 수 있습니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={restoreDraft} className={`${btnPrimary} !w-auto px-4`}>
                작성 내용 불러오기
              </button>
              <button
                type="button"
                onClick={discardDraft}
                className="inline-flex min-h-11 items-center rounded-lg border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-900"
              >
                임시 내용 삭제하기
              </button>
            </div>
          </div>
        ) : null}

        <section id="contact-type-select" className="space-y-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl">목적에 맞는 상담 흐름</h2>
            <p className="mt-1 text-sm text-slate-600 [word-break:keep-all]">
              아래에서 상담 유형을 선택하면 맞춤 입력 항목이 바로 표시됩니다.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {contactTypeOptions.map((option, index) => {
              const active = inquiryType === option.id;
              const accent = accentStyles[option.accent];
              const isLastOdd = index === contactTypeOptions.length - 1 && contactTypeOptions.length % 2 === 1;
              return (
                <button
                  key={option.id}
                  type="button"
                  data-track={`contact-${option.id}`}
                  data-track-label={option.selectTrackLabel}
                  onClick={() => selectType(option.id)}
                  className={`flex h-full min-h-[10.5rem] flex-col rounded-lg border p-5 text-left transition active:scale-[0.99] sm:p-6 ${
                    isLastOdd ? 'sm:col-span-2' : ''
                  } ${cardInteractive} ${focusRing} ${
                    active
                      ? accent.activeBorder
                      : `border-slate-200/90 bg-white ${fineHover}hover:border-slate-300`
                  }`}
                >
                  <span className={`inline-flex w-fit rounded-md px-2.5 py-1 text-xs font-bold tracking-wide ${accent.badge}`}>
                    {option.step}
                  </span>
                  <p className={`mt-3 text-base font-bold leading-snug ${active ? accent.activeTitle : 'text-slate-950'}`}>
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
          <form onSubmit={onSubmit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
            <div className="border-b border-slate-100 pb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">상담 접수</p>
              <h3 className="mt-1 text-lg font-bold text-slate-950 sm:text-xl">{activeOption.title}</h3>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-900">기본 정보</p>
              <CommonFields values={commonValues} inquiryTypeLabel={inquiryTypeLabel} onChange={onCommonChange} />
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
              <InstitutionFields
                values={dispatchForm}
                onChange={(patch) => setDispatchForm((p) => ({ ...p, ...patch }))}
                title="기관 프로그램 정보"
              />
            ) : null}

            {inquiryType === 'spomove' ? (
              <InstitutionFields
                values={spomoveForm}
                onChange={(patch) => setSpomoveForm((p) => ({ ...p, ...patch }))}
                title="SPOMOVE 도입 정보"
              />
            ) : null}

            {inquiryType === 'curriculum' ? (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <p className="text-sm font-bold text-slate-900">커리큘럼·지도자 교육 정보</p>
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
                      <option value="지도자 교육">지도자 교육</option>
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

            {inquiryType === 'other' ? (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <p className="text-sm font-bold text-slate-900">협업 정보</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label="기관명 또는 소속" required>
                      <input
                        required
                        value={otherForm.nameOrOrg}
                        onChange={(e) => setOtherForm((p) => ({ ...p, nameOrOrg: e.target.value }))}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="협업 목적" required>
                      <input
                        required
                        placeholder="예: 행사 협업, 미디어 제휴, 콘텐츠 협력"
                        value={otherForm.collaborationPurpose}
                        onChange={(e) => setOtherForm((p) => ({ ...p, collaborationPurpose: e.target.value }))}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            ) : null}

            {notice ? (
              <div
                className={`rounded-lg px-4 py-3.5 text-sm ${
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
                    다른 상담 유형으로 접수하기
                  </button>
                ) : null}
                {notice.kind === 'error' && notice.showFallback ? (
                  <div className="mt-4 border-t border-red-200/60 pt-4">
                    <ContactFallback
                      title="다른 방법으로 문의하기"
                      description="아래 연락처로 직접 문의하시거나 다시 시도해 주세요."
                      onRetry={() => setNotice(null)}
                    />
                  </div>
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
                  className={`${btnPrimary} w-full`}
                >
                  {submitting ? '접수 중...' : '상담 접수하기'}
                </button>
              </div>
            ) : null}
          </form>
        </div>
      </div>

      <div className="lg:col-span-4">
        <ContactSidebar />
      </div>
    </div>
  );
}
