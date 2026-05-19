'use client';

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { brandContactLinks, brandProfile } from '../data/brand';
import { contactTypeOptions } from '../data/contact';
import { submitInquiry } from './inquiry-submit';
import type {
  CurriculumInquiryFields,
  DispatchInquiryFields,
  InquiryPayload,
  InquiryType,
  PrivateInquiryFields,
} from './inquiry-types';

type SubmitNotice = { kind: 'ok' | 'error'; text: string } | null;

const PRIVATE_DEFAULT: PrivateInquiryFields = {
  guardianName: '',
  phone: '',
  childAge: '',
  exerciseExperience: '',
  concern: '',
  preferredClassType: '',
  preferredLocation: '',
  preferredTime: '',
};

const DISPATCH_DEFAULT: DispatchInquiryFields = {
  organizationName: '',
  managerName: '',
  phone: '',
  organizationType: '',
  targetAge: '',
  expectedParticipants: '',
  availableSpace: '',
  preferredSchedule: '',
  preferredProgram: '',
  proposalNeeded: '필요',
};

const CURRICULUM_DEFAULT: CurriculumInquiryFields = {
  nameOrOrg: '',
  phone: '',
  contentType: '',
  targetAge: '',
  purpose: '',
  trainingNeeded: '필요',
  partnershipType: '',
};

const SUCCESS_MESSAGES: Record<InquiryType, string> = {
  private: `개인·소그룹 수업 문의가 접수되었습니다.\n아이 연령·운동 경험·희망 일정을 확인한 뒤\n맞춤 수업 방향을 안내드리겠습니다.`,
  dispatch: `기관 파견 수업 문의가 접수되었습니다.\n기관 유형·인원·공간·희망 일정을 확인한 뒤\n프로그램 제안 방향을 안내드리겠습니다.`,
  curriculum: `커리큘럼·콘텐츠 문의가 접수되었습니다.\n필요한 콘텐츠 유형과 활용 목적을 확인한 뒤\n제휴·구매 가능 범위를 안내드리겠습니다.`,
};

const SUBMIT_TRACK: Record<InquiryType, 'contact-private' | 'contact-dispatch' | 'contact-curriculum'> = {
  private: 'contact-private',
  dispatch: 'contact-dispatch',
  curriculum: 'contact-curriculum',
};

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

const inputClass =
  'min-h-12 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

export default function SpokeduContactForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  }, [searchParams]);

  const activeOption = useMemo(
    () => contactTypeOptions.find((option) => option.id === inquiryType) ?? null,
    [inquiryType],
  );

  function selectType(type: InquiryType) {
    setInquiryType(type);
    setNotice(null);
    router.replace(`/spokedu/contact?type=${type}`, { scroll: false });
  }

  function resetType() {
    setInquiryType(null);
    setNotice(null);
    router.replace('/spokedu/contact', { scroll: false });
  }

  function buildPayload(): InquiryPayload {
    const createdAt = new Date().toISOString();
    if (inquiryType === 'private') {
      return {
        type: 'private',
        createdAt,
        guardianName: privateForm.guardianName.trim(),
        phone: privateForm.phone.trim(),
        childAge: privateForm.childAge.trim(),
        exerciseExperience: privateForm.exerciseExperience.trim(),
        concern: privateForm.concern.trim(),
        preferredClassType: privateForm.preferredClassType.trim(),
        preferredLocation: privateForm.preferredLocation.trim(),
        preferredTime: privateForm.preferredTime.trim(),
      };
    }
    if (inquiryType === 'dispatch') {
      return {
        type: 'dispatch',
        createdAt,
        organizationName: dispatchForm.organizationName.trim(),
        managerName: dispatchForm.managerName.trim(),
        phone: dispatchForm.phone.trim(),
        organizationType: dispatchForm.organizationType.trim(),
        targetAge: dispatchForm.targetAge.trim(),
        expectedParticipants: dispatchForm.expectedParticipants.trim(),
        availableSpace: dispatchForm.availableSpace.trim(),
        preferredSchedule: dispatchForm.preferredSchedule.trim(),
        preferredProgram: dispatchForm.preferredProgram.trim(),
        proposalNeeded: dispatchForm.proposalNeeded.trim(),
      };
    }
    return {
      type: 'curriculum',
      createdAt,
      nameOrOrg: curriculumForm.nameOrOrg.trim(),
      phone: curriculumForm.phone.trim(),
      contentType: curriculumForm.contentType.trim(),
      targetAge: curriculumForm.targetAge.trim(),
      purpose: curriculumForm.purpose.trim(),
      trainingNeeded: curriculumForm.trainingNeeded.trim(),
      partnershipType: curriculumForm.partnershipType.trim(),
    };
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inquiryType || submitting) return;

    setNotice(null);
    setSubmitting(true);

    try {
      const payload = buildPayload();
      const result = await submitInquiry(payload);
      const baseMessage = SUCCESS_MESSAGES[inquiryType];

      if (inquiryType === 'private') {
        setPrivateForm(PRIVATE_DEFAULT);
      } else if (inquiryType === 'dispatch') {
        setDispatchForm(DISPATCH_DEFAULT);
      } else {
        setCurriculumForm(CURRICULUM_DEFAULT);
      }

      setNotice({
        kind: 'ok',
        text:
          result.mode === 'temp'
            ? `${baseMessage}\n\n(네트워크 이슈로 문의가 임시 저장되었습니다. 빠른 시일 내에 확인하겠습니다.)`
            : baseMessage,
      });
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
    <div className="space-y-5">
      {/* 문의 유형 선택 — 항상 상단에 노출 */}
      <section className="space-y-3">
        <p className="text-sm font-medium text-slate-700">문의 유형을 선택해 주세요</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
          {contactTypeOptions.map((option) => {
            const active = inquiryType === option.id;
            return (
              <button
                key={option.id}
                type="button"
                data-track={option.track}
                data-track-label={`contact-select-${option.id}`}
                onClick={() => selectType(option.id)}
                className={`rounded-2xl border p-3.5 text-left transition active:scale-[0.99] sm:p-4 ${
                  active
                    ? 'border-indigo-400 bg-indigo-50 shadow-sm ring-1 ring-indigo-200'
                    : 'border-slate-200 bg-white [@media(hover:hover)_and_(pointer:fine)]:hover:border-indigo-200 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-sm'
                }`}
              >
                <p className={`text-sm font-semibold leading-snug ${active ? 'text-indigo-800' : 'text-slate-900'}`}>
                  {option.title}
                </p>
                <p className="mt-1.5 text-xs leading-5 text-slate-600">{option.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      {inquiryType && activeOption ? (
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:space-y-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">문의 접수</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">{activeOption.title}</h3>
            </div>
            <button
              type="button"
              onClick={resetType}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              유형 다시 선택
            </button>
          </div>

          {inquiryType === 'private' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="보호자 이름" required>
                <input
                  required
                  autoComplete="name"
                  value={privateForm.guardianName}
                  onChange={(e) => setPrivateForm((p) => ({ ...p, guardianName: e.target.value }))}
                  className={inputClass}
                />
              </Field>
              <Field label="연락처" required>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={privateForm.phone}
                  onChange={(e) => setPrivateForm((p) => ({ ...p, phone: normalizePhone(e.target.value) }))}
                  className={inputClass}
                />
              </Field>
              <Field label="아이 연령" required>
                <input
                  required
                  placeholder="예: 초2, 만 8세"
                  value={privateForm.childAge}
                  onChange={(e) => setPrivateForm((p) => ({ ...p, childAge: e.target.value }))}
                  className={inputClass}
                />
              </Field>
              <Field label="운동 경험" required>
                <input
                  required
                  placeholder="예: 체육학원 6개월"
                  value={privateForm.exerciseExperience}
                  onChange={(e) => setPrivateForm((p) => ({ ...p, exerciseExperience: e.target.value }))}
                  className={inputClass}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="현재 고민" required>
                  <textarea
                    required
                    rows={3}
                    value={privateForm.concern}
                    onChange={(e) => setPrivateForm((p) => ({ ...p, concern: e.target.value }))}
                    className={`${inputClass} min-h-[5.5rem]`}
                  />
                </Field>
              </div>
              <Field label="희망 수업 형태" required>
                <input
                  required
                  placeholder="예: 1:1, 2~3인 소그룹"
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
                    placeholder="예: 화/목 오후 5시 이후"
                    value={privateForm.preferredTime}
                    onChange={(e) => setPrivateForm((p) => ({ ...p, preferredTime: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          ) : null}

          {inquiryType === 'dispatch' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="기관명" required>
                <input
                  required
                  value={dispatchForm.organizationName}
                  onChange={(e) => setDispatchForm((p) => ({ ...p, organizationName: e.target.value }))}
                  className={inputClass}
                />
              </Field>
              <Field label="담당자 이름" required>
                <input
                  required
                  autoComplete="name"
                  value={dispatchForm.managerName}
                  onChange={(e) => setDispatchForm((p) => ({ ...p, managerName: e.target.value }))}
                  className={inputClass}
                />
              </Field>
              <Field label="연락처" required>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={dispatchForm.phone}
                  onChange={(e) => setDispatchForm((p) => ({ ...p, phone: normalizePhone(e.target.value) }))}
                  className={inputClass}
                />
              </Field>
              <Field label="기관 유형" required>
                <input
                  required
                  placeholder="예: 키움센터, 지역아동센터"
                  value={dispatchForm.organizationType}
                  onChange={(e) => setDispatchForm((p) => ({ ...p, organizationType: e.target.value }))}
                  className={inputClass}
                />
              </Field>
              <Field label="대상 연령" required>
                <input
                  required
                  placeholder="예: 7~10세"
                  value={dispatchForm.targetAge}
                  onChange={(e) => setDispatchForm((p) => ({ ...p, targetAge: e.target.value }))}
                  className={inputClass}
                />
              </Field>
              <Field label="예상 참여 인원" required>
                <input
                  required
                  placeholder="예: 20명"
                  value={dispatchForm.expectedParticipants}
                  onChange={(e) => setDispatchForm((p) => ({ ...p, expectedParticipants: e.target.value }))}
                  className={inputClass}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="사용 가능한 공간" required>
                  <input
                    required
                    placeholder="예: 강당 1개, 교실 2개"
                    value={dispatchForm.availableSpace}
                    onChange={(e) => setDispatchForm((p) => ({ ...p, availableSpace: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="희망 일정" required>
                <input
                  required
                  placeholder="예: 2026년 6월, 매주 화요일"
                  value={dispatchForm.preferredSchedule}
                  onChange={(e) => setDispatchForm((p) => ({ ...p, preferredSchedule: e.target.value }))}
                  className={inputClass}
                />
              </Field>
              <Field label="희망 프로그램" required>
                <input
                  required
                  placeholder="예: SPOMOVE, PAPS"
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
          ) : null}

          {inquiryType === 'curriculum' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="이름/기관명" required>
                <input
                  required
                  value={curriculumForm.nameOrOrg}
                  onChange={(e) => setCurriculumForm((p) => ({ ...p, nameOrOrg: e.target.value }))}
                  className={inputClass}
                />
              </Field>
              <Field label="연락처" required>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={curriculumForm.phone}
                  onChange={(e) => setCurriculumForm((p) => ({ ...p, phone: normalizePhone(e.target.value) }))}
                  className={inputClass}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="필요한 콘텐츠 유형" required>
                  <input
                    required
                    placeholder="예: 수업안, 교구 활용법, 강사 교육"
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
                  placeholder="예: 기관 정규수업 운영"
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
              <Field label="제휴/구매 형태" required>
                <input
                  required
                  placeholder="예: 라이선스 구매, 공동 운영"
                  value={curriculumForm.partnershipType}
                  onChange={(e) => setCurriculumForm((p) => ({ ...p, partnershipType: e.target.value }))}
                  className={inputClass}
                />
              </Field>
            </div>
          ) : null}

          {notice ? (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
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
            <div className="sticky bottom-0 -mx-3.5 border-t border-slate-200 bg-white/95 px-3.5 py-3 backdrop-blur supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
              <button
                type="submit"
                disabled={submitting}
                data-track={SUBMIT_TRACK[inquiryType]}
                data-track-label={`contact-submit-${inquiryType}`}
                className="flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-base font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-slate-800"
              >
                {submitting ? '접수 중...' : '문의 접수하기'}
              </button>
            </div>
          ) : null}
        </form>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          위에서 문의 유형을 선택하면 필요한 항목만 입력할 수 있습니다.
        </p>
      )}

      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <span className="font-medium text-slate-700">바로 문의</span>
        <a
          href={brandContactLinks.phone}
          data-track="phone-click"
          data-track-label="contact-page-phone"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-900 transition hover:border-indigo-300 hover:text-indigo-700"
        >
          전화 {brandProfile.phone}
        </a>
        <a
          href={brandContactLinks.email}
          data-track="email-click"
          data-track-label="contact-page-email"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-900 transition hover:border-indigo-300 hover:text-indigo-700"
        >
          이메일 {brandProfile.email}
        </a>
        <Link href="/spokedu/programs" className="text-sm font-semibold text-indigo-700 hover:text-indigo-800">
          프로그램 먼저 보기 →
        </Link>
      </section>
    </div>
  );
}
