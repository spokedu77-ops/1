'use client';

import { useCallback, useEffect, useState } from 'react';
import { KAKAO_CHANNEL_URL } from '../data/config';

const INPUT_IDS = ['f1', 'f2', 'f3', 'f4', 'f5'] as const;
const REQUIRED_COUNT = 4;

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

type ApplyFormProps = {
  diagnosisSummary: string;
  onCopyResult?: (ok: boolean) => void;
  onKakaoOpen?: (requiredFilled: boolean) => void;
};

export default function ApplyForm({
  diagnosisSummary,
  onCopyResult,
  onKakaoOpen,
}: ApplyFormProps) {
  const [values, setValues] = useState<Record<string, string>>({
    f1: '',
    f2: '',
    f3: '',
    f4: '',
    f5: '',
  });

  const setField = useCallback((id: string, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  }, []);

  const requiredFilled = INPUT_IDS.slice(0, REQUIRED_COUNT).filter(
    (id) => (values[id] || '').trim() !== ''
  ).length;
  const totalFilled = requiredFilled + ((values.f5 || '').trim() !== '' ? 1 : 0);

  const lines = [
    '안녕하세요. SPOKEDU 프리미엄 방문 체육 상담을 의뢰합니다.',
    '',
    `1. 학습자 정보 : ${safeVal(values.f1)}`,
    `2. 희망 수업 종목 : ${safeVal(values.f2)}`,
    `3. 방문 지역/장소 : ${safeVal(values.f3)}`,
    `4. 가능 시간대 : ${safeVal(values.f4)}`,
    `5. 유입 경로 : ${safeVal(values.f5)}`,
  ];
  if (diagnosisSummary) {
    lines.push('', '[SPOKEDU 시스템 사전 진단 내역]', `- ${diagnosisSummary}`);
  }
  lines.push('', '위 내용을 바탕으로 강사 배정 및 세부 비용 안내를 부탁드립니다.');
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

  const handleKakao = useCallback(async () => {
    await copyToClipboard(previewText);
    const isRequiredFilled = INPUT_IDS.slice(0, REQUIRED_COUNT).every(
      (id) => (values[id] || '').trim() !== ''
    );
    onKakaoOpen?.(isRequiredFilled);
    setTimeout(() => {
      window.open(KAKAO_CHANNEL_URL, '_blank', 'noopener,noreferrer');
    }, 800);
  }, [previewText, values, copyToClipboard, onKakaoOpen]);

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
                스포키듀는 <span>1:1 맞춤형 커리큘럼</span> 특성상, 아이의 연령, 희망 종목 수, 방문 지역 등에 따라
                정확한 견적이 산출됩니다. 부담 없이 편하게 남겨주시면 합리적인 최적의 솔루션을 안내해 드립니다.
              </div>
            </div>
          </div>

          <div className="pl-form-body">
            <div className="pl-progress">
              <div className="pl-progress-text">
                <span>입력 진행 상황</span>
                <span className="pl-text-gradient">{totalFilled}/5 단계 완료</span>
              </div>
              <div className="pl-progress-track">
                <div
                  className="pl-progress-bar"
                  style={{ width: `${(requiredFilled / REQUIRED_COUNT) * 100}%` }}
                />
              </div>
            </div>

            <div className="pl-form-grid">
              <div className="pl-input-group">
                <label htmlFor="f1">
                  1. 아이 연령 / 성별 / 이름 <span className="pl-req">필수</span>
                </label>
                <input
                  type="text"
                  className="pl-input-field"
                  id="f1"
                  placeholder="예: 9세 / 여 / 김OO"
                  autoComplete="off"
                  value={values.f1}
                  onChange={(e) => setField('f1', e.target.value)}
                />
              </div>
              <div className="pl-input-group">
                <label htmlFor="f2">
                  2. 희망 수업 종목 <span className="pl-req">필수</span>
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
              <div className="pl-input-group full">
                <label htmlFor="f3">
                  3. 희망 방문 지역 및 장소 <span className="pl-req">필수</span>
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
              <div className="pl-input-group">
                <label htmlFor="f4">
                  4. 가능 시간대 및 요일 <span className="pl-req">필수</span>
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
              <div className="pl-input-group">
                <label htmlFor="f5">
                  5. 유입 경로 <span style={{ fontWeight: 400 }}>(선택)</span>
                </label>
                <input
                  type="text"
                  className="pl-input-field"
                  id="f5"
                  placeholder="예: 인스타그램, 지인 추천"
                  autoComplete="off"
                  value={values.f5}
                  onChange={(e) => setField('f5', e.target.value)}
                />
              </div>
            </div>

            <div className="pl-preview-box">
              <div className="pl-preview-header">
                <span>카카오 상담 전송용 폼 (자동 완성)</span>
                <button type="button" className="pl-btn pl-btn-outline" onClick={handleCopy} style={{ padding: '6px 12px', fontSize: 13 }}>
                  내용 복사
                </button>
              </div>
              <pre className="pl-preview-content">{previewText}</pre>
            </div>

            <div className="pl-submit-area">
              <button
                type="button"
                className="pl-btn pl-btn-kakao"
                onClick={handleKakao}
                style={{ padding: '16px 32px', fontSize: 16 }}
              >
                카카오 채널로 문의 전송하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
