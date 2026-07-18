'use client';

import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import type { Question } from '../types';
import { getMoveReportUi } from '../i18n/ui';
import { AXIS_COL, AXIS_ICON } from '../lib/constants';
import type { MoveReportLocale } from '../lib/locale';
import { personalizeMoveReportQuestion } from '../lib/personalizeQuestion';

interface SurveyProps {
  q: Question;
  qi: number;
  total: number;
  resps: string[];
  name: string;
  onAnswer: (v: string) => void;
  onBack: () => void;
  answering?: boolean;
  locale?: MoveReportLocale;
}

/** 원본 HTML 설문 (진행률·중간 메시지·닷 네비) */
export default function Survey({
  q,
  qi,
  total,
  resps,
  name,
  onAnswer,
  onBack,
  answering = false,
  locale = 'ko',
}: SurveyProps) {
  const ui = useMemo(() => getMoveReportUi(locale), [locale]);
  if (!q) return null;
  const safeTotal = Math.max(total, 1);
  const prog = ((qi + 1) / safeTotal) * 100;
  const acol = AXIS_COL[q.axis] ?? '#FF4B1F';
  const aicon = AXIS_ICON[q.axis] ?? 'fa-circle';
  const qText = personalizeMoveReportQuestion(q.q, name, locale);
  const lines = qText.split('\n');

  const midMsg =
    qi === 3
      ? { em: '⚡', text: ui.survey.midHalf }
      : qi === 7
        ? { em: '🎯', text: ui.survey.midAlmost }
        : null;

  return (
    <div className="page mr-survey-page" style={{ background: '#0D0D0D', display: 'flex', flexDirection: 'column', minHeight: '100dvh', padding: '0 max(16px, env(safe-area-inset-left))' }}>
      <div
        className="mr-content-max"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', margin: '0 auto', paddingTop: '24px', paddingBottom: '24px' }}
      >
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <button
              type="button"
              onClick={onBack}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#1A1A1A',
                border: '1px solid #2A2A2A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <i className="fa-solid fa-arrow-left" style={{ fontSize: '13px', color: '#A8A8A8' }} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: '22px', color: '#fff', lineHeight: 1 }}>
                {qi + 1}
                <span style={{ fontSize: '14px', color: '#A8A8A8' }}>/ {safeTotal}</span>
              </div>
              <div
                style={{
                  padding: '3px 10px',
                  background: '#1A1A1A',
                  border: '1px solid #2A2A2A',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: acol,
                  letterSpacing: '.04em',
                }}
              >
                {q.label}
              </div>
            </div>
          </div>
          <div className="prog">
            <div className="prog-fill" style={{ width: `${prog}%` }} />
          </div>
          {midMsg ? (
            <div
              className="anim-rise"
              style={{
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: '#1A1A1A',
                borderRadius: '10px',
                border: '1px solid #2A2A2A',
              }}
            >
              <span style={{ fontSize: '18px' }}>{midMsg.em}</span>
              <span className="mr-mid-msg-text" style={{ fontWeight: 600, color: '#CCCCCC' }}>
                {midMsg.text}
              </span>
            </div>
          ) : null}
        </div>

        <div className="anim-rise" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
          <div
            style={{
              background: '#161616',
              borderRadius: '20px',
              padding: '22px 22px 20px',
              border: '1px solid #222',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg,${acol},transparent)` }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '7px',
                  flexShrink: 0,
                  background: `${acol}18`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className={`fa-solid ${aicon}`} style={{ fontSize: '11px', color: acol }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: acol, letterSpacing: '.05em' }}>{q.label}</span>
              <span
                style={{
                  color: '#3A3A3A',
                  marginLeft: 'auto',
                  fontWeight: 700,
                  fontFamily: 'Bebas Neue,sans-serif',
                  fontSize: '15px',
                  letterSpacing: '.04em',
                }}
              >
                Q{qi + 1}
              </span>
            </div>
            <h2 className="mr-survey-q">
              {lines.map((l, i) => (
                <span key={i}>
                  {l}
                  {i < lines.length - 1 ? <br /> : null}
                </span>
              ))}
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {q.opts.map((opt, i) => {
              const sel = resps[qi] === opt.v;
              const optTitle = personalizeMoveReportQuestion(opt.t, name, locale);
              const optDesc = personalizeMoveReportQuestion(opt.d, name, locale);
              return (
                <button
                  key={i}
                  type="button"
                  className={`survey-html-opt${sel ? ' sel' : ''}`}
                  disabled={answering}
                  onClick={() => onAnswer(opt.v)}
                  style={
                    sel
                      ? ({
                          ['--p']: acol,
                          ['--p-dim']: `${acol}20`,
                        } as CSSProperties)
                      : undefined
                  }
                >
                  <div className="survey-html-opt-num" style={sel ? { background: acol, color: '#fff' } : undefined}>
                    {sel ? <i className="fa-solid fa-check" style={{ fontSize: '12px' }} /> : String.fromCharCode(65 + i)}
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div className="mr-survey-opt-title">{optTitle}</div>
                    <div className="mr-survey-opt-desc">{optDesc}</div>
                  </div>
                  {sel ? <div style={{ fontSize: '18px' }}>{opt.e}</div> : null}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', paddingTop: '4px' }}>
            {Array.from({ length: safeTotal }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === qi ? 18 : 6,
                  height: 6,
                  borderRadius: '99px',
                  background: i < qi ? '#FF4B1F' : i === qi ? '#FF4B1F' : '#2A2A2A',
                  opacity: i === qi ? 1 : i < qi ? 0.7 : 0.35,
                  transition: 'all .3s cubic-bezier(.16,1,.3,1)',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
