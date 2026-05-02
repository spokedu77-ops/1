'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { copyTextToClipboard } from '../../lib/shareCard';
import { trackMoveReportEvent } from '../../lib/events';
import { EDUCATOR_ROLE_OPTIONS, EDUCATOR_TARGET_AGE_OPTIONS } from '../../components/EducatorBetaForm';
import { isCoachSlugBlocklisted, isValidCoachSlugFormat, normalizeCoachSlugInput } from '../../lib/coachSlug';

/** 학부모에게 그대로 보낼 수 있는 안내문(링크는 아래에 붙여 넣기) */
const PARENT_MESSAGE =
  '안녕하세요. 아이들의 움직임 성향을 수업에 더 잘 반영하기 위해 SPOKEDU MOVE REPORT를 활용하고 있습니다. 아래 링크에서 약 3분간 테스트를 진행해주시면, 결과를 바탕으로 수업 방향을 참고하겠습니다.';

const COACH_FEATURES = [
  { title: '학부모에게 전용 링크 공유', body: '수업 전에 우리 반·센터 전용 주소 한 줄을 보내 참여를 받을 수 있어요.' },
  { title: '아이들의 움직임 성향 결과 수집', body: '응답은 유형 결과만 모이며, 이름 등 개인 식별 정보는 저장하지 않아요.' },
  { title: '유형 분포로 수업 방향 참고', body: '반 전체 성향 분포를 보며 활동 구성·안내 톤을 가볍게 맞춰 볼 수 있어요.' },
] as const;

export default function CoachNewClient() {
  const [orgName, setOrgName] = useState('');
  const [role, setRole] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [slugInput, setSlugInput] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [copyFlash, setCopyFlash] = useState('');

  const fullLink =
    typeof window !== 'undefined' && createdSlug ? `${window.location.origin}/move-report?coach=${encodeURIComponent(createdSlug)}` : '';

  const onCreate = useCallback(async () => {
    setError('');
    const slug = normalizeCoachSlugInput(slugInput);
    if (!isValidCoachSlugFormat(slug)) {
      setError('링크 주소는 3~40자, 영문 소문자·숫자·하이픈만 사용할 수 있어요.');
      return;
    }
    if (isCoachSlugBlocklisted(slug)) {
      setError('사용할 수 없는 링크 주소예요. 다른 주소를 입력해 주세요.');
      return;
    }
    if (!orgName.trim() || !role || !targetAudience || !contact.trim() || contact.trim().length < 3) {
      setError('필수 항목을 모두 입력해 주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/move-report/coach-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName: orgName.trim(),
          role,
          targetAudience,
          slug,
          contact: contact.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(typeof data.error === 'string' ? data.error : '생성에 실패했어요.');
        return;
      }
      setCreatedSlug(slug);
      void trackMoveReportEvent({ eventName: 'move_report_coach_link_created', meta: { slug } });
    } catch {
      setError('네트워크 오류가 났어요.');
    } finally {
      setLoading(false);
    }
  }, [contact, orgName, role, slugInput, targetAudience]);

  const onCopyLink = useCallback(async () => {
    if (!fullLink) return;
    const ok = await copyTextToClipboard(fullLink);
    setCopyFlash(ok ? '링크를 복사했어요' : '복사에 실패했어요. 직접 선택해 복사해 주세요.');
    window.setTimeout(() => setCopyFlash(''), 2400);
  }, [fullLink]);

  if (createdSlug) {
    return (
      <main className="mr-page mr-coach-new-page">
        <div className="mr-page-inner mr-content-max mr-coach-new">
          <Link href="/move-report" className="btn-ghost mr-coach-back" style={{ textDecoration: 'none' }}>
            ← MOVE REPORT
          </Link>

          <h1 className="mr-coach-title">전용 링크가 만들어졌어요</h1>
          <p className="mr-coach-lead">아래 순서대로 진행해 보세요. 응답은 유형만 집계되며, 개별 이름은 저장되지 않습니다.</p>

          <ol className="mr-coach-next-steps" aria-label="다음 단계">
            <li className="mr-coach-next-steps-item">
              <span className="mr-coach-next-steps-n">1</span>
              <div>
                <strong className="mr-coach-next-steps-title">학부모에게 링크 보내기</strong>
                <p className="mr-coach-next-steps-body">아래 전용 주소를 카카오톡·문자 등으로 전달하세요. 필요하면 안내문을 함께 복사해 쓰면 됩니다.</p>
              </div>
            </li>
            <li className="mr-coach-next-steps-item">
              <span className="mr-coach-next-steps-n">2</span>
              <div>
                <strong className="mr-coach-next-steps-title">응답이 쌓이면 대시보드에서 확인</strong>
                <p className="mr-coach-next-steps-body">움직임 성향 유형별 응답 수·비율만 볼 수 있어요. (개별 아동 단위의 화면은 제공하지 않습니다.)</p>
              </div>
            </li>
            <li className="mr-coach-next-steps-item mr-coach-next-steps-item--muted">
              <span className="mr-coach-next-steps-n">3</span>
              <div>
                <strong className="mr-coach-next-steps-title">피드백 생성기</strong>
                <p className="mr-coach-next-steps-body">학부모 안내 문장을 자동으로 다듬어 주는 기능은 준비 중이에요.</p>
              </div>
            </li>
          </ol>

          <div className="mr-coach-link-box">
            <span className="mr-coach-link-label">우리 반 전용 링크</span>
            <code className="mr-coach-link-url">{fullLink}</code>
            <button type="button" className="btn-fire mr-coach-copy" onClick={() => void onCopyLink()}>
              링크 복사
            </button>
            {copyFlash ? <p className="mr-coach-copy-flash">{copyFlash}</p> : null}
          </div>

          <div className="mr-coach-parent-msg">
            <h2 className="mr-coach-subtitle">학부모에게 보낼 안내문 (복사해서 사용하세요)</h2>
            <textarea className="mr-coach-textarea" readOnly rows={6} value={`${PARENT_MESSAGE}\n\n${fullLink}`} />
          </div>

          <div className="mr-coach-success-actions">
            <Link
              href={`/move-report/coach/dashboard/${encodeURIComponent(createdSlug)}`}
              className="btn-fire mr-coach-dash-link mr-coach-dash-link--primary"
              style={{ textDecoration: 'none' }}
            >
              집계 대시보드 열기
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mr-page mr-coach-new-page">
      <div className="mr-page-inner mr-content-max mr-coach-new">
        <Link href="/move-report" className="btn-ghost mr-coach-back" style={{ textDecoration: 'none' }}>
          ← MOVE REPORT
        </Link>

        <header className="mr-coach-hero">
          <h1 className="mr-coach-hero-title">체육 선생님을 위한 MOVE REPORT</h1>
          <p className="mr-coach-hero-sub">우리 반, 센터, 기관 전용 링크를 만들고 아이들의 움직임 성향 분포를 확인해보세요.</p>
          <p className="mr-coach-hero-note">개별 평가가 아니라 수업 방향을 잡기 위한 관찰형 데이터입니다.</p>
          <p className="mr-coach-kicker">수업 전 학부모에게 보낼 수 있는 우리 반 전용 MOVE REPORT 링크를 만들어보세요.</p>
        </header>

        <ul className="mr-coach-features" aria-label="이렇게 활용할 수 있어요">
          {COACH_FEATURES.map((f) => (
            <li key={f.title} className="mr-coach-feature">
              <span className="mr-coach-feature-title">{f.title}</span>
              <span className="mr-coach-feature-body">{f.body}</span>
            </li>
          ))}
        </ul>

        <h2 className="mr-coach-form-section-title">링크 만들기</h2>
        <p className="mr-coach-form-section-lead">아래 정보는 링크 관리·문의 대응용이며, 학부모에게 노출되지 않습니다.</p>

        <label className="mr-educator-label">
          선생님/기관명 <span className="mr-educator-req">*</span>
          <input className="mr-educator-input" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="○○ 키즈짐" />
        </label>

        <label className="mr-educator-label">
          역할 <span className="mr-educator-req">*</span>
          <select className="mr-educator-select" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">선택</option>
            {EDUCATOR_ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="mr-educator-label">
          주 수업 대상 <span className="mr-educator-req">*</span>
          <select className="mr-educator-select" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)}>
            <option value="">선택</option>
            {EDUCATOR_TARGET_AGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="mr-educator-label">
          링크 주소 (영문) <span className="mr-educator-req">*</span>
          <input
            className="mr-educator-input"
            value={slugInput}
            onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="rainbow-gym"
            autoCapitalize="off"
            spellCheck={false}
          />
          <span className="mr-coach-slug-hint">주소에 쓰일 짧은 이름이에요. 이미 사용 중이면 다른 이름을 골라 주세요.</span>
        </label>

        <label className="mr-educator-label">
          연락처 또는 이메일 <span className="mr-educator-req">*</span>
          <input className="mr-educator-input" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="연락 가능한 번호 또는 이메일" />
        </label>

        {error ? <p className="mr-educator-form-error">{error}</p> : null}

        <button type="button" className="btn-fire mr-coach-submit" disabled={loading} onClick={() => void onCreate()}>
          {loading ? '만드는 중…' : '선생님 전용 링크 만들기'}
        </button>
      </div>
    </main>
  );
}
