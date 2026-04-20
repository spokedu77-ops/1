'use client';

import { useCallback, useState } from 'react';
import {
  Q1_OPTIONS,
  Q2_OPTIONS,
  Q3_OPTIONS,
  Q4_OPTIONS,
  Q5_OPTIONS,
  getDiagnosisResult,
} from '../data/diagnosis';

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

type ChipGroupProps = {
  questionId: string;
  title: string;
  required?: boolean;
  options: readonly { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
};

function ChipGroup({ questionId, title, required, options, selected, onToggle }: ChipGroupProps) {
  const badge = required ? '다중 선택 (필수 1개 이상)' : '다중 선택';

  return (
    <div className="pl-q-box">
      <div className="pl-q-header">
        <h4 className="pl-q-title">{title}</h4>
        <span className="pl-q-badge multi">{badge}</span>
      </div>
      <div className="pl-chips" data-q={questionId}>
        {options.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className="pl-chip"
            data-value={value}
            aria-pressed={selected.includes(value)}
            onClick={() => onToggle(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

const DEFAULT_RESULT_TEXT =
  "좌측에서 Q1(필수)을 1개 이상 선택하신 후 '분석 결과 보기'를 눌러 주세요. 여러 항목을 함께 고르시면 복합 분석이 반영됩니다.";

const CONSULT_CTA_TEXT = `아이의 정확한 상태에 따라 수업 구성과 강사 배정이 달라지기 때문에, 상담 신청 시 아래 내용을 반드시 함께 기재해 주셔야 합니다.

아동 연령
현재 운동 수준
희망 종목
수업 희망 지역

위 정보 확인 후 수업 가능 여부와 구체적인 진행 방향을 안내드립니다.`;

type DiagnosisProps = {
  onResultChange: (summary: string) => void;
  onAnalyzeResult: (resultText: string) => void;
};

export default function Diagnosis({ onResultChange, onAnalyzeResult }: DiagnosisProps) {
  const [q1, setQ1] = useState<string[]>([]);
  const [q2, setQ2] = useState<string[]>([]);
  const [q3, setQ3] = useState<string[]>([]);
  const [q4, setQ4] = useState<string[]>([]);
  const [q5, setQ5] = useState<string[]>([]);
  const [result, setResult] = useState<ReturnType<typeof getDiagnosisResult>>(null);

  const toggle = useCallback(
    (key: 'q1' | 'q2' | 'q3' | 'q4' | 'q5') => (value: string) => {
      const setters = { q1: setQ1, q2: setQ2, q3: setQ3, q4: setQ4, q5: setQ5 };
      setters[key]((prev) =>
        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
      );
    },
    []
  );

  const handleAnalyze = useCallback(() => {
    if (q1.length === 0) {
      onAnalyzeResult('required');
      return;
    }
    const diagnosisResult = getDiagnosisResult(q1, q2, q3, q4, q5);
    setResult(diagnosisResult);
    if (diagnosisResult) {
      onResultChange(diagnosisResult.summaryForForm);
      onAnalyzeResult('success');
    }
  }, [q1, q2, q3, q4, q5, onResultChange, onAnalyzeResult]);

  const scrollToApply = useCallback(() => {
    const el = document.getElementById('apply');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      document.getElementById('f1')?.focus();
    }, 400);
  }, []);

  const handleReset = useCallback(() => {
    setQ1([]);
    setQ2([]);
    setQ3([]);
    setQ4([]);
    setQ5([]);
    setResult(null);
    onResultChange('');
    onAnalyzeResult('reset');
  }, [onResultChange, onAnalyzeResult]);

  const showDefault = result === null;

  return (
    <section id="diagnosis">
      <div className="pl-container">
        <h2 className="pl-section-title">우리 아이 성향 진단</h2>
        <p className="pl-lead">
          아이에게 해당하는 항목을 선택하시면 스포키듀의 1차 솔루션을 확인하실 수 있습니다.
        </p>
        <div className="pl-diag-wrapper">
          <div className="pl-q-section">
            <ChipGroup
              questionId="q1"
              title="Q1. 우리 아이의 현재 가장 고민되는 부분은 무엇인가요?"
              required
              options={Q1_OPTIONS}
              selected={q1}
              onToggle={toggle('q1')}
            />
            <ChipGroup
              questionId="q2"
              title="Q2. 어떤 방향으로 변화하길 원하시나요?"
              options={Q2_OPTIONS}
              selected={q2}
              onToggle={toggle('q2')}
            />
            <ChipGroup
              questionId="q3"
              title="Q3. 현재 아이의 운동 수준은 어느 정도인가요?"
              options={Q3_OPTIONS}
              selected={q3}
              onToggle={toggle('q3')}
            />
            <ChipGroup
              questionId="q4"
              title="Q4. 어떤 형태의 수업을 고려하고 계신가요?"
              options={Q4_OPTIONS}
              selected={q4}
              onToggle={toggle('q4')}
            />
            <ChipGroup
              questionId="q5"
              title="Q5. 수업에서 가장 중요하게 생각하는 부분은 무엇인가요?"
              options={Q5_OPTIONS}
              selected={q5}
              onToggle={toggle('q5')}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button type="button" className="pl-btn pl-btn-primary" onClick={handleAnalyze}>
                분석 결과 보기
              </button>
              <button type="button" className="pl-btn pl-btn-outline" onClick={handleReset}>
                초기화
              </button>
            </div>
          </div>
          <div className="pl-result-panel">
            <div className="pl-result-label">
              <ShieldIcon />
              SPOKEDU 맞춤 추천
            </div>
            {showDefault ? (
              <p className="pl-result-text">{DEFAULT_RESULT_TEXT}</p>
            ) : (
              <div className="pl-result-funnel">
                <h3 className="pl-result-funnel-title">{result!.resultTitle}</h3>
                <div className="pl-result-type-card pl-result-type-card--compact">
                  <span className="pl-result-type-label">추천 프로그램 유형</span>
                  <strong className="pl-result-type-value">{result!.programTypeName}</strong>
                </div>
                <p className="pl-result-funnel-lead">{result!.introParagraph}</p>

                <div className="pl-result-funnel-section">
                  <h4 className="pl-result-funnel-h3">📊 분석 결과</h4>
                  <div className="pl-result-funnel-sub">
                    <span className="pl-result-funnel-emoji">👉</span>
                    <div>
                      <strong className="pl-result-funnel-strong">현재 상태</strong>
                      <p className="pl-result-funnel-p pl-result-funnel-p--multiline">
                        {result!.currentStateText}
                      </p>
                    </div>
                  </div>
                  <div className="pl-result-funnel-sub">
                    <span className="pl-result-funnel-emoji">👉</span>
                    <div>
                      <strong className="pl-result-funnel-strong">추천 방향</strong>
                      <p className="pl-result-funnel-p">{result!.recommendedDirectionText}</p>
                    </div>
                  </div>
                </div>

                <div className="pl-result-funnel-section">
                  <h4 className="pl-result-funnel-h3">🏃 추천 수업 방식</h4>
                  <p className="pl-result-funnel-p">{result!.classFormatIntro}</p>
                  <ul className="pl-result-list">
                    {result!.classFormatBullets.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>

                <div className="pl-result-funnel-section">
                  <h4 className="pl-result-funnel-h3">💡 기대 변화</h4>
                  <ul className="pl-result-list">
                    {result!.expectedChangeBullets.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>

                <div className="pl-result-cta-box">
                  <p className="pl-result-cta-text">{CONSULT_CTA_TEXT}</p>
                </div>
              </div>
            )}
            <div className="pl-result-info">
              이 진단 결과가 하단 상담 폼에 자동으로 반영되어, 더 깊이 있는 상담이 가능해집니다.
            </div>
            <button type="button" className="pl-btn pl-btn-primary" style={{ width: '100%' }} onClick={scrollToApply}>
              맞춤 수업 상담 신청하기
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
