'use client';

import { useEffect, useState } from 'react';

interface LoadingProps {
  name: string;
}

/** 원본 HTML 로딩 (단계 리스트) */
export default function Loading({ name }: LoadingProps) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t1 = window.setTimeout(() => setStep(1), 700);
    const t2 = window.setTimeout(() => setStep(2), 1500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  const steps = ['행동 지표 수집 중…', '성향 패턴 분석 중…', '무브 리포트 생성 중…'];
  const display = name.trim() || '우리 아이';

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0D0D0D',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 300 }}>
        <div style={{ position: 'relative', width: '72px', height: '72px', margin: '0 auto 28px' }}>
          <div style={{ position: 'absolute', inset: 0, border: '2px solid #2A2A2A', borderRadius: '50%' }} />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              border: '2px solid #FF4B1F',
              borderRadius: '50%',
              borderTopColor: 'transparent',
              animation: 'spin 1s linear infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '10px',
              background: '#1A1A1A',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            ✨
          </div>
        </div>
        <h2
          style={{
            fontFamily: 'Black Han Sans,sans-serif',
            fontSize: '22px',
            color: '#fff',
            marginBottom: '6px',
            lineHeight: 1.3,
          }}
        >
          {display}의 리포트
          <br />
          완성 중이에요
        </h2>
        <p style={{ fontSize: '13px', color: '#A8A8A8', marginBottom: '28px', lineHeight: 1.6, wordBreak: 'keep-all' }}>
          1만 시간의 체육 수업 데이터를
          <br />
          분석하고 있어요
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
          {steps.map((s, i) => (
            <div
              key={s}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: step >= i ? '#1A1A1A' : 'transparent',
                border: `1px solid ${step >= i ? '#2A2A2A' : 'transparent'}`,
                transition: 'all .4s',
                opacity: step >= i ? 1 : 0.3,
              }}
            >
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: step > i ? '#FF4B1F' : step === i ? '#2A2A2A' : '#1A1A1A',
                  border: `1.5px solid ${step > i ? '#FF4B1F' : step === i ? '#FF4B1F' : '#333'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all .3s',
                }}
              >
                {step > i ? <i className="fa-solid fa-check" style={{ fontSize: '8px', color: '#fff' }} /> : null}
                {step === i ? (
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#FF4B1F', animation: 'mr-html-pulse 1.2s infinite' }} />
                ) : null}
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: step >= i ? '#ccc' : '#444' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
