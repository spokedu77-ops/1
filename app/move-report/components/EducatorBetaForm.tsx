'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { getMoveReportAttribution } from '../lib/attribution';
import { trackMoveReportEvent } from '../lib/events';

const INSTAGRAM_HREF =
  'https://www.instagram.com/spokedu_kids?igsh=M2ZmYWZxMzRxenVt&utm_source=qr&utm_medium=move_report_educator_beta';

export const EDUCATOR_ROLE_OPTIONS = [
  { value: 'preschool_pe', label: '유아체육 강사' },
  { value: 'visit_pe', label: '방문체육 강사' },
  { value: 'afterschool_pe', label: '방과후 체육 강사' },
  { value: 'center_owner', label: '센터/도장 운영자' },
  { value: 'institution_staff', label: '기관 담당자' },
  { value: 'student_trainee', label: '체대생/예비 강사' },
  { value: 'other', label: '기타' },
] as const;

export const EDUCATOR_TARGET_AGE_OPTIONS = [
  { value: 'age_4_7', label: '4~7세' },
  { value: 'elem_low', label: '초등 저학년' },
  { value: 'elem_high', label: '초등 고학년' },
  { value: 'teen', label: '청소년' },
  { value: 'mixed', label: '혼합' },
] as const;

export const EDUCATOR_FEATURE_OPTIONS = [
  { value: 'dedicated_link', label: '전용 테스트 링크' },
  { value: 'class_distribution', label: '반/센터 유형 분포 확인' },
  { value: 'lesson_plan', label: '수업안 추천' },
  { value: 'parent_feedback_copy', label: '학부모 피드백 문장 생성' },
  { value: 'institution_report', label: '기관용 리포트' },
  { value: 'curriculum_assets', label: '커리큘럼 자료' },
] as const;

export type EducatorBetaSource = 'move_report_result_cta' | 'move_report_educator_beta_page';

export interface EducatorBetaFormProps {
  source: EducatorBetaSource;
  shareKey?: string | null;
  /** 성공·취소 시 모달 닫기 등 */
  onRequestClose?: () => void;
  /** 페이지 모드에서 상단 뒤로가기 노출 */
  showBackLink?: boolean;
  /** 모달 안에서 상단 제목 중복 방지 */
  embeddedInModal?: boolean;
}

type FormErrors = Partial<Record<'name' | 'contact' | 'role' | 'targetAge' | 'feature' | 'consent', string>>;

export default function EducatorBetaForm({
  source,
  shareKey,
  onRequestClose,
  showBackLink,
  embeddedInModal,
}: EducatorBetaFormProps) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [role, setRole] = useState('');
  const [organization, setOrganization] = useState('');
  const [targetAge, setTargetAge] = useState('');
  const [feature, setFeature] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    void trackMoveReportEvent({
      eventName: 'move_report_educator_beta_form_opened',
      shareKey,
      meta: { source },
    });
  }, [shareKey, source]);

  const validate = useCallback((): boolean => {
    const next: FormErrors = {};
    if (!name.trim()) next.name = '이름을 입력해 주세요.';
    if (!contact.trim() || contact.trim().length < 3) next.contact = '연락처 또는 이메일을 입력해 주세요.';
    if (!role) next.role = '직업·역할을 선택해 주세요.';
    if (!targetAge) next.targetAge = '주 수업 대상 연령을 선택해 주세요.';
    if (!feature) next.feature = '가장 필요한 기능을 선택해 주세요.';
    if (!consent) next.consent = '개인정보 수집에 동의해 주세요.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [name, contact, role, targetAge, feature, consent]);

  const onSubmit = useCallback(async () => {
    setFormError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/move-report/educator-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim(),
          role,
          organization: organization.trim() || undefined,
          targetAgeGroup: targetAge,
          neededFeature: feature,
          consent: true,
          source,
          createdAt: new Date().toISOString(),
          attribution: getMoveReportAttribution(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        void trackMoveReportEvent({
          eventName: 'move_report_educator_beta_submit_failed',
          shareKey,
          meta: { reason: 'api', status: res.status, source },
        });
        setFormError(typeof data.error === 'string' ? data.error : '접수에 실패했어요. 잠시 후 다시 시도해 주세요.');
        return;
      }
      void trackMoveReportEvent({
        eventName: 'move_report_educator_beta_submitted',
        shareKey,
        meta: { source },
      });
      setSuccess(true);
    } catch {
      void trackMoveReportEvent({
        eventName: 'move_report_educator_beta_submit_failed',
        shareKey,
        meta: { reason: 'network', source },
      });
      setFormError('네트워크 오류가 났어요. 연결을 확인한 뒤 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }, [contact, feature, name, organization, role, shareKey, source, targetAge, validate]);

  if (success) {
    return (
      <div className="mr-educator-success">
        <h2 className="mr-educator-success-title">베타 신청이 접수되었습니다.</h2>
        <p className="mr-educator-success-body">
          전용 링크와 피드백 생성기 베타가 준비되면 가장 먼저 안내드릴게요.
        </p>
        <div className="mr-educator-success-actions">
          {onRequestClose ? (
            <button type="button" className="btn-fire" onClick={onRequestClose}>
              닫기
            </button>
          ) : (
            <Link href="/move-report" className="btn-fire" style={{ textDecoration: 'none', textAlign: 'center' }}>
              MOVE REPORT로 돌아가기
            </Link>
          )}
          <a href={INSTAGRAM_HREF} target="_blank" rel="noopener noreferrer" className="btn-ghost mr-educator-insta-btn">
            <i className="fa-brands fa-instagram" aria-hidden />
            인스타그램에서 스포키듀 보기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mr-educator-form">
      {showBackLink ? (
        <Link href="/move-report" className="btn-ghost mr-educator-back" style={{ textDecoration: 'none', marginBottom: 16 }}>
          ← MOVE REPORT로
        </Link>
      ) : null}

      {!embeddedInModal ? <h2 className="mr-educator-form-title">교육자 베타 신청</h2> : null}
      <p className="mr-educator-form-lead">
        MOVE REPORT 교육자 기능 베타에 관심 가져주셔서 감사해요. 아래 정보만 남겨 주시면 됩니다.
      </p>

      <label className="mr-educator-label">
        이름 <span className="mr-educator-req">*</span>
        <input
          className="mr-educator-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="홍길동"
        />
        {errors.name ? <span className="mr-educator-field-error">{errors.name}</span> : null}
      </label>

      <label className="mr-educator-label">
        연락처 또는 이메일 <span className="mr-educator-req">*</span>
        <input
          className="mr-educator-input"
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          autoComplete="tel"
          placeholder="010-0000-0000 또는 email@example.com"
        />
        {errors.contact ? <span className="mr-educator-field-error">{errors.contact}</span> : null}
      </label>

      <label className="mr-educator-label">
        직업·역할 <span className="mr-educator-req">*</span>
        <select className="mr-educator-select" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">선택해 주세요</option>
          {EDUCATOR_ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {errors.role ? <span className="mr-educator-field-error">{errors.role}</span> : null}
      </label>

      <label className="mr-educator-label">
        소속명 또는 브랜드명 <span className="mr-educator-optional">(선택)</span>
        <input
          className="mr-educator-input"
          type="text"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          placeholder="○○ 키즈짐, ○○초 방과후 등"
        />
      </label>

      <label className="mr-educator-label">
        주 수업 대상 연령 <span className="mr-educator-req">*</span>
        <select className="mr-educator-select" value={targetAge} onChange={(e) => setTargetAge(e.target.value)}>
          <option value="">선택해 주세요</option>
          {EDUCATOR_TARGET_AGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {errors.targetAge ? <span className="mr-educator-field-error">{errors.targetAge}</span> : null}
      </label>

      <fieldset className="mr-educator-fieldset">
        <legend className="mr-educator-label-text">
          가장 필요한 기능 <span className="mr-educator-req">*</span>
        </legend>
        <div className="mr-educator-radio-list">
          {EDUCATOR_FEATURE_OPTIONS.map((o) => (
            <label key={o.value} className="mr-educator-radio-row">
              <input type="radio" name="neededFeature" value={o.value} checked={feature === o.value} onChange={() => setFeature(o.value)} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
        {errors.feature ? <span className="mr-educator-field-error">{errors.feature}</span> : null}
      </fieldset>

      <label className="mr-educator-consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          개인정보 수집·이용에 동의합니다. <span className="mr-educator-req">*</span>
        </span>
      </label>
      {errors.consent ? <span className="mr-educator-field-error">{errors.consent}</span> : null}

      {formError ? <p className="mr-educator-form-error">{formError}</p> : null}

      <button type="button" className="btn-fire mr-educator-submit" disabled={submitting} onClick={() => void onSubmit()}>
        {submitting ? '제출 중…' : '베타 신청하기'}
      </button>
    </div>
  );
}
