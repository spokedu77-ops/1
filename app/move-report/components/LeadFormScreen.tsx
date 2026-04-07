'use client';

import { useState } from 'react';
import { formatMoveReportPhone, normalizeMoveReportPhone } from '../lib/phone';

interface Props {
  onSubmit: (phone: string) => Promise<void>;
  onSkip: () => void;
}

/** 원본 HTML 리드폼 (결과 전) + API 연동 */
export default function LeadFormScreen({ onSubmit, onSkip }: Props) {
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const normalizedPhone = normalizeMoveReportPhone(phone);
  const active = !!normalizedPhone && consent;

  const handleSubmit = async () => {
    if (!active) return;
    setLoading(true);
    try {
      await onSubmit(normalizedPhone ?? phone);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0D0D0D',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: 380, width: '100%' }}>
        <div className="anim-rise" style={{ textAlign: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: '#666', fontWeight: 500 }}>
            전화번호 저장은 선택이며, 저장 없이도 바로 결과를 볼 수 있어요.
          </span>
        </div>

        <div className="anim-rise" style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              marginBottom: '14px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              animation: 'floatY 3s ease-in-out infinite',
            }}
          >
            <span style={{ fontFamily: 'Black Han Sans,sans-serif', fontSize: '22px', color: '#fff', letterSpacing: '-0.02em' }}>스포키듀</span>
            <span style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: '18px', letterSpacing: '0.18em', color: '#FF4B1F' }}>SPOKEDU</span>
          </div>
          <h2
            style={{
              fontFamily: 'Black Han Sans,sans-serif',
              fontSize: '26px',
              color: '#fff',
              marginBottom: '10px',
              lineHeight: 1.25,
              wordBreak: 'keep-all',
            }}
          >
            결과는 바로 볼 수 있어요 -
            <br />
            원하시면 저장해드릴게요
          </h2>
          <p style={{ fontSize: '14px', color: '#CCCCCC', lineHeight: 1.65, wordBreak: 'keep-all' }}>
            지금 나온 우리 아이 결과를 저장하고,
            <br />
            가족·지인에게 공유하고 스포키듀 인사이트를 계속 받아볼 수 있어요.
          </p>
        </div>

        <div
          className="anim-rise d1"
          style={{ background: '#161616', border: '1px solid #222', borderRadius: '14px', padding: '14px', marginBottom: '20px' }}
        >
          {(
            [
              { i: '📋', t: '우리 아이 결과 카드', d: '저장해두고 가족과 공유하기 좋아요' },
              { i: '🎯', t: '유형별 활동 아이디어', d: '결과 페이지에서 바로 확인할 수 있어요' },
              { i: '💡', t: '스포키듀 공식 채널 소식', d: '유형 인사이트와 콘텐츠 업데이트를 확인할 수 있어요' },
            ] as const
          ).map((b, i) => (
            <div
              key={b.t}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '10px 0',
                borderBottom: i < 2 ? '1px solid #222' : 'none',
              }}
            >
              <span style={{ fontSize: '18px', flexShrink: 0, lineHeight: '22px' }}>{b.i}</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#DDDDDD', marginBottom: '2px' }}>{b.t}</div>
                <div style={{ fontSize: '11px', color: '#888', lineHeight: 1.4 }}>{b.d}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="anim-rise d2" style={{ marginBottom: '8px' }}>
          <label
            style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '.04em', color: '#AAAAAA', marginBottom: '8px' }}
          >
            전화번호
          </label>
          <input
            className="sp-input"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatMoveReportPhone(e.target.value))}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              if (!loading) void handleSubmit();
            }}
            placeholder="010-0000-0000"
            autoComplete="tel"
            inputMode="tel"
            maxLength={13}
            aria-label="전화번호 입력"
          />
          <p style={{ fontSize: '11px', color: '#777', marginTop: '8px' }}>11자리 휴대폰 번호(010-0000-0000)만 저장할 수 있어요.</p>
        </div>

        <div className="anim-rise d2" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '20px' }}>
          <button
            type="button"
            aria-pressed={consent}
            onClick={() => setConsent((c) => !c)}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '6px',
              flexShrink: 0,
              marginTop: '1px',
              cursor: 'pointer',
              background: consent ? '#FF4B1F' : '#1E1E1E',
              border: `1.5px solid ${consent ? '#FF4B1F' : '#333'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all .2s',
            }}
          >
            {consent ? <i className="fa-solid fa-check" style={{ fontSize: '10px', color: '#fff' }} /> : null}
          </button>
          <button
            type="button"
            onClick={() => setConsent((c) => !c)}
            style={{
              fontSize: '12px',
              color: '#AAAAAA',
              lineHeight: 1.5,
              cursor: 'pointer',
              fontWeight: 500,
              textAlign: 'left',
              background: 'none',
              border: 'none',
              padding: 0,
            }}
          >
            [필수] 결과 저장 및 스포키듀 체육교육 정보 안내를 위한 개인정보 수집·이용에 동의합니다.
          </button>
        </div>

        <div className="anim-rise d3">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!active || loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              width: '100%',
              padding: '17px',
              borderRadius: '14px',
              background: active && !loading ? '#FEE500' : '#2A2A2A',
              color: active && !loading ? '#3C1E1E' : '#555',
              fontWeight: 800,
              fontSize: '16px',
              border: 'none',
              cursor: active && !loading ? 'pointer' : 'default',
              outline: 'none',
              fontFamily: 'Noto Sans KR,sans-serif',
              boxShadow: active && !loading ? '0 4px 24px rgba(254,229,0,.4)' : 'none',
              transition: 'all .25s',
              marginBottom: '12px',
            }}
          >
            <span style={{ fontSize: '18px' }}>💬</span>
            {loading ? '저장 중…' : '전화번호로 결과 저장하기'}
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={loading}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#777',
              fontWeight: 500,
              padding: '10px',
              fontFamily: 'Noto Sans KR,sans-serif',
              letterSpacing: '-.01em',
            }}
          >
            저장 없이 결과 보기
          </button>
        </div>
      </div>
    </div>
  );
}
