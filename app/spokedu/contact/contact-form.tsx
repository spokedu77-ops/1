'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
type CommonForm = {
  name: string;
  phone: string;
  email: string;
  message: string;
};

const COMMON_DEFAULT: CommonForm = {
  name: '',
  phone: '',
  email: '',
  message: '',
};

const PRIVATE_DEFAULT: PrivateInquiryFields = {
  childAge: '',
  exerciseExperience: '',
  concern: '',
  preferredClassType: '',
  preferredLocation: '',
  preferredTime: '',
};

const DISPATCH_DEFAULT: DispatchInquiryFields = {
  organizationName: '',
  organizationType: '',
  targetAge: '',
  expectedParticipants: '',
  availableSpace: '',
  preferredProgram: '',
  proposalNeeded: '필요',
};

const CURRICULUM_DEFAULT: CurriculumInquiryFields = {
  contentType: '',
  targetAge: '',
  purpose: '',
  trainingNeeded: '필요',
  partnershipType: '',
};

function isInquiryType(value: string | null): value is InquiryType {
  return contactTypeOptions.some((option) => option.id === value);
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d-]/g, '');
}

export default function SpokeduContactForm() {
  const searchParams = useSearchParams();
  const [inquiryType, setInquiryType] = useState<InquiryType>('private');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<SubmitNotice>(null);
  const [commonForm, setCommonForm] = useState<CommonForm>(COMMON_DEFAULT);
  const [privateForm, setPrivateForm] = useState<PrivateInquiryFields>(PRIVATE_DEFAULT);
  const [dispatchForm, setDispatchForm] = useState<DispatchInquiryFields>(DISPATCH_DEFAULT);
  const [curriculumForm, setCurriculumForm] = useState<CurriculumInquiryFields>(CURRICULUM_DEFAULT);

  useEffect(() => {
    const requestedType = searchParams.get('type');
    if (isInquiryType(requestedType)) {
      setInquiryType(requestedType);
    }
  }, [searchParams]);

  const submitLabel = useMemo(() => {
    if (inquiryType === 'dispatch') return '기관 수업 제안 문의 접수';
    if (inquiryType === 'curriculum') return '커리큘럼·콘텐츠 문의 접수';
    return '우리 아이 수업 상담 접수';
  }, [inquiryType]);

  const successMessage = useMemo(() => {
    if (inquiryType === 'dispatch') {
      return `기관 수업 문의가 접수되었습니다.
대상 연령, 참여 인원, 공간, 운영 목적을 확인한 뒤
프로그램 제안 방향을 안내드리겠습니다.`;
    }
    if (inquiryType === 'curriculum') {
      return `커리큘럼·콘텐츠 문의가 접수되었습니다.
필요한 콘텐츠 유형과 활용 목적을 확인한 뒤
제휴 또는 제공 가능 범위를 안내드리겠습니다.`;
    }
    return `문의가 접수되었습니다.
아이의 연령, 운동 경험, 희망 장소를 확인한 뒤
아이에게 맞는 수업 방향을 안내드리겠습니다.`;
  }, [inquiryType]);

  const submitTrackValue = useMemo(() => {
    if (inquiryType === 'dispatch') return 'cta-dispatch-contact';
    if (inquiryType === 'curriculum') return 'cta-curriculum-contact';
    return 'cta-private-contact';
  }, [inquiryType]);

  function buildPayload(): InquiryPayload {
    const base = {
      name: commonForm.name.trim(),
      phone: commonForm.phone.trim(),
      email: commonForm.email.trim(),
      message: commonForm.message.trim(),
      createdAt: new Date().toISOString(),
    };

    if (inquiryType === 'private') {
      return {
        ...base,
        type: 'private',
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
        ...base,
        type: 'dispatch',
        organizationName: dispatchForm.organizationName.trim(),
        organizationType: dispatchForm.organizationType.trim(),
        targetAge: dispatchForm.targetAge.trim(),
        expectedParticipants: dispatchForm.expectedParticipants.trim(),
        availableSpace: dispatchForm.availableSpace.trim(),
        preferredProgram: dispatchForm.preferredProgram.trim(),
        proposalNeeded: dispatchForm.proposalNeeded.trim(),
      };
    }

    return {
      ...base,
      type: 'curriculum',
      contentType: curriculumForm.contentType.trim(),
      targetAge: curriculumForm.targetAge.trim(),
      purpose: curriculumForm.purpose.trim(),
      trainingNeeded: curriculumForm.trainingNeeded.trim(),
      partnershipType: curriculumForm.partnershipType.trim(),
    };
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

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
      setCommonForm(COMMON_DEFAULT);

      setNotice({
        kind: 'ok',
        text: result.mode === 'temp' ? `${successMessage}\n\n(네트워크 연결 이슈로 문의가 임시 저장되었습니다.)` : successMessage,
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
    <section className="space-y-7">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {contactTypeOptions.map((option) => {
          const active = inquiryType === option.id;
          return (
            <button
              key={option.id}
              type="button"
              data-track={
                option.id === 'private'
                  ? 'cta-private-contact'
                  : option.id === 'dispatch'
                    ? 'cta-dispatch-contact'
                    : 'cta-curriculum-contact'
              }
              data-track-label={`contact-type-${option.id}`}
              onClick={() => {
                setInquiryType(option.id);
                setNotice(null);
              }}
              className={`rounded-2xl border p-2.5 text-left transition sm:p-4 ${
                active
                  ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-indigo-200'
              }`}
            >
              <p className={`text-[11px] font-semibold leading-tight sm:text-sm ${active ? 'text-indigo-700' : 'text-slate-900'}`}>{option.title}</p>
              <p className="mt-1 hidden text-xs leading-5 text-slate-600 sm:mt-2 sm:block">{option.description}</p>
            </button>
          );
        })}
      </div>

      <form onSubmit={onSubmit} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{submitLabel}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">공통 정보와 유형별 항목을 분리해 운영 가능한 데이터 구조로 접수합니다.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">이름 *</span>
            <input
              required
              autoComplete="name"
              value={commonForm.name}
              onChange={(event) => setCommonForm((prev) => ({ ...prev, name: event.target.value }))}
              className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">연락처 *</span>
            <input
              required
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={commonForm.phone}
              onChange={(event) => setCommonForm((prev) => ({ ...prev, phone: normalizePhone(event.target.value) }))}
              className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">이메일 *</span>
            <input
              required
              type="email"
              autoComplete="email"
              value={commonForm.email}
              onChange={(event) => setCommonForm((prev) => ({ ...prev, email: event.target.value }))}
              className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">문의 메시지 *</span>
            <textarea
              required
              rows={3}
              value={commonForm.message}
              onChange={(event) => setCommonForm((prev) => ({ ...prev, message: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </div>

        {inquiryType === 'private' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">아이 연령 *</span>
              <input
                required
                placeholder="예: 초2, 만 8세"
                value={privateForm.childAge}
                onChange={(event) => setPrivateForm((prev) => ({ ...prev, childAge: event.target.value }))}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">운동 경험 *</span>
              <input
                required
                placeholder="예: 체육학원 6개월, 축구 1년"
                value={privateForm.exerciseExperience}
                onChange={(event) => setPrivateForm((prev) => ({ ...prev, exerciseExperience: event.target.value }))}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">현재 고민 *</span>
              <textarea
                required
                rows={3}
                value={privateForm.concern}
                onChange={(event) => setPrivateForm((prev) => ({ ...prev, concern: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">희망 수업 형태 *</span>
              <input
                required
                placeholder="예: 1:1, 2~3인 소그룹"
                value={privateForm.preferredClassType}
                onChange={(event) => setPrivateForm((prev) => ({ ...prev, preferredClassType: event.target.value }))}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">희망 장소 *</span>
              <input
                required
                value={privateForm.preferredLocation}
                onChange={(event) => setPrivateForm((prev) => ({ ...prev, preferredLocation: event.target.value }))}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">희망 요일/시간 *</span>
              <input
                required
                placeholder="예: 화/목 오후 5시 이후"
                value={privateForm.preferredTime}
                onChange={(event) => setPrivateForm((prev) => ({ ...prev, preferredTime: event.target.value }))}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>
        ) : null}

        {inquiryType === 'dispatch' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">기관명 *</span>
              <input
                required
                value={dispatchForm.organizationName}
                onChange={(event) => setDispatchForm((prev) => ({ ...prev, organizationName: event.target.value }))}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">기관 유형 *</span>
              <input
                required
                placeholder="예: 키움센터, 어린이집, 학교"
                value={dispatchForm.organizationType}
                onChange={(event) => setDispatchForm((prev) => ({ ...prev, organizationType: event.target.value }))}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">대상 연령 *</span>
              <input
                required
                placeholder="예: 7~10세"
                value={dispatchForm.targetAge}
                onChange={(event) => setDispatchForm((prev) => ({ ...prev, targetAge: event.target.value }))}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">예상 참여 인원 *</span>
              <input
                required
                placeholder="예: 20명"
                value={dispatchForm.expectedParticipants}
                onChange={(event) => setDispatchForm((prev) => ({ ...prev, expectedParticipants: event.target.value }))}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">사용 가능한 공간 *</span>
              <input
                required
                placeholder="예: 강당 1개, 교실 2개"
                value={dispatchForm.availableSpace}
                onChange={(event) => setDispatchForm((prev) => ({ ...prev, availableSpace: event.target.value }))}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">희망 프로그램 *</span>
              <input
                required
                placeholder="예: SPOMOVE, PAPS"
                value={dispatchForm.preferredProgram}
                onChange={(event) => setDispatchForm((prev) => ({ ...prev, preferredProgram: event.target.value }))}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">제안서 필요 여부 *</span>
              <select
                required
                value={dispatchForm.proposalNeeded}
                onChange={(event) => setDispatchForm((prev) => ({ ...prev, proposalNeeded: event.target.value }))}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="필요">필요</option>
                <option value="불필요">불필요</option>
                <option value="검토 중">검토 중</option>
              </select>
            </label>
          </div>
        ) : null}

        {inquiryType === 'curriculum' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">필요한 콘텐츠 유형 *</span>
              <input
                required
                placeholder="예: 수업안, 교구 활용법, 강사 교육 자료"
                value={curriculumForm.contentType}
                onChange={(event) => setCurriculumForm((prev) => ({ ...prev, contentType: event.target.value }))}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">대상 연령 *</span>
              <input
                required
                value={curriculumForm.targetAge}
                onChange={(event) => setCurriculumForm((prev) => ({ ...prev, targetAge: event.target.value }))}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">활용 목적 *</span>
              <input
                required
                placeholder="예: 기관 정규수업 운영"
                value={curriculumForm.purpose}
                onChange={(event) => setCurriculumForm((prev) => ({ ...prev, purpose: event.target.value }))}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">강사 교육 필요 여부 *</span>
              <select
                required
                value={curriculumForm.trainingNeeded}
                onChange={(event) => setCurriculumForm((prev) => ({ ...prev, trainingNeeded: event.target.value }))}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="필요">필요</option>
                <option value="불필요">불필요</option>
                <option value="검토 중">검토 중</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">제휴/구매 형태 *</span>
              <input
                required
                placeholder="예: 라이선스 구매, 공동 운영"
                value={curriculumForm.partnershipType}
                onChange={(event) => setCurriculumForm((prev) => ({ ...prev, partnershipType: event.target.value }))}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>
        ) : null}

        {notice ? (
          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              notice.kind === 'ok' ? 'border border-emerald-200 bg-emerald-50 text-emerald-900' : 'border border-red-200 bg-red-50 text-red-900'
            }`}
          >
            <p className="whitespace-pre-line">{notice.text}</p>
          </div>
        ) : null}

        <button
          id={`contact-submit-${inquiryType}`}
          data-track={submitTrackValue}
          data-track-label={`contact-submit-${inquiryType}`}
          type="submit"
          disabled={submitting}
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? '접수 중...' : '문의 접수하기'}
        </button>

        <p className="text-xs leading-5 text-slate-500">
          접수가 원활하지 않으면
          {' '}
          <a id="contact-form-email-link" data-track="cta-email" data-track-label="form-help-email" href={brandContactLinks.email} className="underline underline-offset-2">
            {brandProfile.email}
          </a>
          {' '}
          또는
          {' '}
          <a id="contact-form-phone-link" data-track="cta-phone" data-track-label="form-help-phone" href={brandContactLinks.phone} className="underline underline-offset-2">
            {brandProfile.phone}
          </a>
          로 바로 문의해 주세요.
        </p>

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-sm text-slate-700">
          문의 완료 후에는 입력하신 연락처로 상담 안내가 진행됩니다. 일정/제안서/콘텐츠 범위는 상담 후 맞춤 제안으로 확정됩니다.
          <div className="mt-3">
            <Link href="/spokedu/programs" className="font-semibold text-indigo-700 underline-offset-2 hover:underline">
              프로그램 소개 먼저 보기
            </Link>
          </div>
        </div>
      </form>
    </section>
  );
}
