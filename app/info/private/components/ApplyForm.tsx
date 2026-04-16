'use client';

import { useCallback, useMemo, useState } from 'react';

const VALUE_IDS = ['fp', 'f2', 'f3', 'f4', 'f5'] as const;

function InfoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flex: 'none', color: 'var(--pl-primary)' }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function safeVal(v: string): string {
  return (v || '').trim() ? v.trim() : '[정보 미기재]';
}

function formatLearnerBlock(learners: string[]): string {
  const lines = learners.map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return '[정보 미기재]';
  if (lines.length === 1) return lines[0];
  return `\n${lines.map((l) => `   · ${l}`).join('\n')}`;
}

type ApplyFormProps = {
  diagnosisSummary: string;
  onCopyResult?: (ok: boolean) => void;
  onConsultSubmit?: (result: {
    requiredFilled: boolean;
    ok: boolean;
    emailSent: boolean;
    message: string;
  }) => void;
};

export default function ApplyForm({
  diagnosisSummary,
  onCopyResult,
  onConsultSubmit,
}: ApplyFormProps) {
  const [learners, setLearners] = useState<string[]>(['']);
  const [values, setValues] = useState<Record<(typeof VALUE_IDS)[number], string>>({
    fp: '',
    f2: '',
    f3: '',
    f4: '',
    f5: '',
  });

  const setField = useCallback((id: (typeof VALUE_IDS)[number], value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  }, []);

  const learnerBlockFilled = useMemo(() => learners.some((l) => l.trim() !== ''), [learners]);

  const requiredCount = useMemo(() => {
    let n = 0;
    if (learnerBlockFilled) n += 1;
    for (const id of ['fp', 'f2', 'f3', 'f4'] as const) {
      if ((values[id] || '').trim() !== '') n += 1;
    }
    return n;
  }, [learnerBlockFilled, values]);

  const totalFilled = useMemo(() => {
    let n = learnerBlockFilled ? 1 : 0;
    for (const id of VALUE_IDS) {
      if ((values[id] || '').trim() !== '') n += 1;
    }
    return n;
  }, [learnerBlockFilled, values]);

  const addLearner = useCallback(() => {
    setLearners((prev) => [...prev, '']);
  }, []);

  const removeLearner = useCallback((index: number) => {
    setLearners((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }, []);

  const setLearner = useCallback((index: number, value: string) => {
    setLearners((prev) => prev.map((v, i) => (i === index ? value : v)));
  }, []);

  const lines = useMemo(() => {
    const learnerText = formatLearnerBlock(learners);
    const head: string[] = [
      '안녕하세요. SPOKEDU 프리미엄 방문 체육 상담을 의뢰합니다.',
      '',
      learnerText.startsWith('\n')
        ? `1. 학습자 정보 :${learnerText}`
        : `1. 학습자 정보 : ${learnerText}`,
      `2. 연락처(휴대폰) : ${safeVal(values.fp)}`,
      `3. 희망 종목 : ${safeVal(values.f2)}`,
      `4. 방문 지역/장소 : ${safeVal(values.f3)}`,
      `5. 가능 시간대 : ${safeVal(values.f4)}`,
      `6. 전하고 싶은 말 : ${safeVal(values.f5)}`,
    ];
    if (diagnosisSummary) {
      head.push('', '[SPOKEDU 시스템 사전 진단 내역]', `- ${diagnosisSummary}`);
    }
    head.push('', '위 내용을 바탕으로 맞춤 상담 및 일정 그리고 수업료 안내를 도와드리겠습니다.');
    return head;
  }, [learners, values, diagnosisSummary]);

  const previewText = lines.join('\n');

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // ignore
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }, []);

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(previewText);
    onCopyResult?.(ok);
  }, [previewText, copyToClipboard, onCopyResult]);

  const handleSubmitConsult = useCallback(async () => {
    const learnerLines = learners.map((l) => l.trim()).filter(Boolean);
    const isRequiredFilled =
      learnerLines.length > 0 &&
      values.fp.trim() &&
      values.f2.trim() &&
      values.f3.trim() &&
      values.f4.trim();

    if (!isRequiredFilled) {
      onConsultSubmit?.({
        requiredFilled: false,
        ok: false,
        emailSent: false,
        message: '안내: 필수 항목(학습자·연락처·종목·지역·시간)을 모두 기재해 주세요.',
      });
      return;
    }

    const nameForApi = learnerLines.join('\n');

    try {
      const response = await fetch('/api/private/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameForApi,
          phone: values.fp,
          content: previewText,
        }),
      });
      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; emailSent?: boolean; message?: string }
        | null;
      if (!response.ok || !result?.ok) {
        onConsultSubmit?.({
          requiredFilled: true,
          ok: false,
          emailSent: false,
          message: result?.message || '접수 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        });
        return;
      }
      onConsultSubmit?.({
        requiredFilled: true,
        ok: true,
        emailSent: Boolean(result.emailSent),
        message:
          result.message ||
          (result.emailSent
            ? '접수 내용이 운영 메일로 발송되었습니다.'
            : '접수가 저장되었습니다.'),
      });
    } catch {
      onConsultSubmit?.({
        requiredFilled: true,
        ok: false,
        emailSent: false,
        message: '네트워크 오류로 접수에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      });
    }
  }, [previewText, learners, values, onConsultSubmit]);

  return (
    <section id="apply">
      <div className="pl-container pl-apply-container">
        <div className="pl-process-steps">
          <div className="pl-step-box active">
            <div className="pl-step-icon">1</div>
            <div className="pl-step-text">
              <strong>간편 폼 작성</strong>
              <span>하단 양식 입력</span>
            </div>
          </div>
          <div className="pl-step-box">
            <div className="pl-step-icon">2</div>
            <div className="pl-step-text">
              <strong>카카오톡 상담</strong>
              <span>전문가와 내용 확인</span>
            </div>
          </div>
          <div className="pl-step-box">
            <div className="pl-step-icon">3</div>
            <div className="pl-step-text">
              <strong>강사 및 일정 배정</strong>
              <span>맞춤형 수업 시작</span>
            </div>
          </div>
        </div>

        <div className="pl-form-wrapper">
          <div className="pl-form-header">
            <h3>상담 의뢰 및 견적 문의</h3>
            <div className="pl-pricing-notice">
              <InfoIcon />
              <div>
                스포키듀는 <span>1:1 맞춤형 커리큘럼</span> 특성상, 아이의 연령, 희망 종목, 방문 지역 등에 따라
                눈높이에 맞는 수업을 만들어갈 수 있습니다. 상담 신청 시 정확히 작성해 주셔야 원활한 안내가 가능합니다. 정보가 부족한 경우 답변이 지연될 수 있습니다.
              </div>
            </div>
          </div>

          <div className="pl-form-body">
            <div className="pl-progress">
              <div className="pl-progress-text">
                <span>입력 진행 상황</span>
                <span className="pl-text-gradient">{totalFilled}/6 단계 완료</span>
              </div>
              <div className="pl-progress-track">
                <div
                  className="pl-progress-bar"
                  style={{ width: `${(requiredCount / 5) * 100}%` }}
                />
              </div>
            </div>

            <div className="pl-form-grid">
              <div className="pl-input-group pl-input-card full">
                <div className="pl-input-row-head">
                  <label>
                    1. 아이 연령 / 성별 / 이름 <span className="pl-req">필수</span>
                    <span className="pl-input-subhint">
                      복수 인원이시면 아래에서 인원을 추가해 주세요.
                    </span>
                  </label>
                  <button
                    type="button"
                    className="pl-btn pl-btn-outline"
                    onClick={addLearner}
                    style={{ flexShrink: 0 }}
                  >
                    + 인원 추가
                  </button>
                </div>
                <div className="pl-learner-list">
                  {learners.map((row, index) => (
                    <div key={index} className="pl-learner-row">
                      <input
                        type="text"
                        className="pl-input-field"
                        style={{ flex: 1, minHeight: 50 }}
                        aria-label={`학습자 ${index + 1}`}
                        placeholder="예: 9세 / 여 / 김OO"
                        autoComplete="off"
                        value={row}
                        onChange={(e) => setLearner(index, e.target.value)}
                      />
                      {learners.length > 1 && (
                        <button
                          type="button"
                          className="pl-btn pl-btn-outline"
                          onClick={() => removeLearner(index)}
                          style={{ flexShrink: 0 }}
                          aria-label={`인원 ${index + 1} 삭제`}
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="pl-input-group pl-input-card">
                <label htmlFor="fp">
                  2. 연락처(휴대폰) <span className="pl-req">필수</span>
                </label>
                <input
                  type="tel"
                  className="pl-input-field"
                  id="fp"
                  placeholder="예: 010-1234-5678"
                  autoComplete="tel"
                  inputMode="tel"
                  value={values.fp}
                  onChange={(e) => setField('fp', e.target.value)}
                />
              </div>
              <div className="pl-input-group pl-input-card">
                <label htmlFor="f2">
                  3. 희망 종목 <span className="pl-req">필수</span>
                </label>
                <input
                  type="text"
                  className="pl-input-field"
                  id="f2"
                  placeholder="예: 자전거, 기초체력 등 복수 가능"
                  autoComplete="off"
                  value={values.f2}
                  onChange={(e) => setField('f2', e.target.value)}
                />
              </div>
              <div className="pl-input-group pl-input-card full">
                <label htmlFor="f3">
                  4. 희망 방문 지역 및 장소 <span className="pl-req">필수</span>
                </label>
                <input
                  type="text"
                  className="pl-input-field"
                  id="f3"
                  placeholder="예: 서울시 송파구 OO아파트 인근 공터"
                  autoComplete="off"
                  value={values.f3}
                  onChange={(e) => setField('f3', e.target.value)}
                />
              </div>
              <div className="pl-input-group pl-input-card">
                <label htmlFor="f4">
                  5. 가능 시간대 및 요일 <span className="pl-req">필수</span>
                </label>
                <input
                  type="text"
                  className="pl-input-field"
                  id="f4"
                  placeholder="예: 화, 목 오후 4시 이후"
                  autoComplete="off"
                  value={values.f4}
                  onChange={(e) => setField('f4', e.target.value)}
                />
              </div>
              <div className="pl-input-group pl-input-card full">
                <label htmlFor="f5">
                  6. 전하고 싶은 말 <span style={{ fontWeight: 400 }}>(선택)</span>
                </label>
                <p className="pl-input-subhint pl-input-subhint-spacing">
                  원데이 또는 단체 수업을 희망하실 경우에는 여기(6번)에 적어 주세요.
                </p>
                <input
                  type="text"
                  className="pl-input-field"
                  id="f5"
                  placeholder="예: 원데이·단체 일정, 상담 시 전달하고 싶은 말씀 등"
                  autoComplete="off"
                  value={values.f5}
                  onChange={(e) => setField('f5', e.target.value)}
                />
              </div>
            </div>

            <div className="pl-preview-box">
              <div className="pl-preview-header">
                <span>카카오 상담 전송용 폼 (자동 완성)</span>
                <button type="button" className="pl-btn pl-btn-outline pl-btn-compact" onClick={handleCopy}>
                  내용 복사
                </button>
              </div>
              <pre className="pl-preview-content">{previewText}</pre>
            </div>

            <div className="pl-submit-area">
              <button
                type="button"
                className="pl-btn pl-btn-kakao"
                onClick={handleSubmitConsult}
              >
                상담 신청 보내기
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
