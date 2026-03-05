'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  Q1_OPTIONS,
  Q2_OPTIONS,
  Q3_OPTIONS,
  Q1_FOCUS_MAP,
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
  return (
    <div className="pl-q-box">
      <div className="pl-q-header">
        <h4 className="pl-q-title">{title}</h4>
        <span className="pl-q-badge multi">{required ? '다중 선택 (필수)' : '다중 선택'}</span>
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
  "좌측의 진단 문항(Q1 필수)을 선택하신 후 '솔루션 확인하기' 버튼을 눌러주세요.";

type DiagnosisProps = {
  onResultChange: (summary: string) => void;
  onAnalyzeResult: (resultText: string) => void;
};

export default function Diagnosis({ onResultChange, onAnalyzeResult }: DiagnosisProps) {
  const [q1, setQ1] = useState<string[]>([]);
  const [q2, setQ2] = useState<string[]>([]);
  const [q3, setQ3] = useState<string[]>([]);
  const [resultText, setResultText] = useState(DEFAULT_RESULT_TEXT);

  const toggle = useCallback(
    (key: 'q1' | 'q2' | 'q3') => (value: string) => {
      const setters = { q1: setQ1, q2: setQ2, q3: setQ3 };
      const state = { q1, q2, q3 };
      const current = state[key];
      setters[key](
        current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
      );
    },
    [q1, q2, q3]
  );

  const handleAnalyze = useCallback(() => {
    if (q1.length === 0) {
      onAnalyzeResult('required'); // parent can show toast
      return;
    }
    const q1Labels = q1.map((v) => Q1_FOCUS_MAP[v] || '').filter(Boolean);
    const q2Labels = q2.map((v) => Q2_OPTIONS.find((o) => o.value === v)?.label ?? '').filter(Boolean);
    const q3Labels = q3.map((v) => Q3_OPTIONS.find((o) => o.value === v)?.label ?? '').filter(Boolean);

    let str = `[전문가 1차 솔루션 분석]\n주요 접근 방향:\n- ${q1Labels.join('\n- ')}`;
    if (q2Labels.length > 0) str += `\n\n희망 발달 영역:\n- ${q2Labels.join(', ')}`;
    if (q3Labels.length > 0) str += `\n\n기대하는 변화:\n- ${q3Labels.join(', ')}`;

    setResultText(str);
    const summary = `진단 결과 요약: ${q1Labels[0]} 외 ${q1.length - 1 + q2Labels.length + q3Labels.length}개 항목 반영 완료`;
    onResultChange(summary);
    onAnalyzeResult('success');
  }, [q1, q2, q3, onResultChange, onAnalyzeResult]);

  const handleReset = useCallback(() => {
    setQ1([]);
    setQ2([]);
    setQ3([]);
    setResultText(DEFAULT_RESULT_TEXT);
    onResultChange('');
    onAnalyzeResult('reset');
  }, [onResultChange, onAnalyzeResult]);

  return (
    <section id="diagnosis">
      <div className="pl-container">
        <h2 className="pl-section-title">우리 아이 성향 진단</h2>
        <p className="pl-lead">
          가장 고민되는 부분을 선택하시면 스포키듀 전문가 그룹의 1차 솔루션을 확인하실 수 있습니다.
        </p>
        <div className="pl-diag-wrapper">
          <div className="pl-q-section">
            <ChipGroup
              questionId="q1"
              title="Q1. 우리 아이의 현재 가장 큰 고민은?"
              required
              options={Q1_OPTIONS}
              selected={q1}
              onToggle={toggle('q1')}
            />
            <ChipGroup
              questionId="q2"
              title="Q2. 어떤 신체 능력을 키워주고 싶으신가요?"
              options={Q2_OPTIONS}
              selected={q2}
              onToggle={toggle('q2')}
            />
            <ChipGroup
              questionId="q3"
              title="Q3. 우리 아이가 어떻게 성장하길 바라시나요?"
              options={Q3_OPTIONS}
              selected={q3}
              onToggle={toggle('q3')}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button type="button" className="pl-btn pl-btn-primary" onClick={handleAnalyze}>
                솔루션 확인하기
              </button>
              <button type="button" className="pl-btn pl-btn-outline" onClick={handleReset}>
                초기화
              </button>
            </div>
          </div>
          <div className="pl-result-panel">
            <div className="pl-result-label">
              <ShieldIcon />
              SPOKEDU 솔루션 분석
            </div>
            <p className="pl-result-text">{resultText}</p>
            <div className="pl-result-info">
              출력된 진단 결과는 하단의 상담 의뢰 폼에 자동으로 연동되어 더욱 깊이 있는 상담이 가능해집니다.
            </div>
            <Link href="#apply" className="pl-btn pl-btn-primary" style={{ width: '100%' }}>
              상담 폼으로 이동
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
