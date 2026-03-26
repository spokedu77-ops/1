'use client';

import { useState } from 'react';
import type { Profile } from '../types';

interface ShareAndCollectProps {
  p: Profile;
  onShare: () => void | Promise<void>;
  flash: (msg: string) => void;
  onLeadSubmit: (phone: string) => Promise<boolean>;
  savedPhone: string;
}

/** 원본 HTML 공유 + 연락처 저장 카드 */
export default function ShareAndCollect({ p, onShare, flash, onLeadSubmit, savedPhone }: ShareAndCollectProps) {
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);

  const normalizedSaved = savedPhone.replace(/\D/g, '');
  const digits = phone.replace(/\D/g, '');
  const alreadySaved = normalizedSaved.length >= 10;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg,#0D0D0D,#161616)',
        border: '1px solid #2A2A2A',
        borderRadius: '16px',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '120px',
          height: '120px',
          background: `radial-gradient(circle,${p.col}25,transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <p
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#DDDDDD',
              marginBottom: '14px',
              lineHeight: 1.6,
              wordBreak: 'keep-all',
            }}
          >
            친구 아이 유형이랑 비교해보기 —
            <br />
            <span style={{ color: p.col }}>내 아이랑 궁합이 맞을까?</span>
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => void onShare()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '10px',
                flex: 1,
                justifyContent: 'center',
                background: p.col,
                color: '#fff',
                fontWeight: 700,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: `0 4px 20px ${p.col}50`,
                fontFamily: 'Noto Sans KR,sans-serif',
              }}
            >
              <i className="fa-solid fa-share-nodes" />
              친구에게 공유하기
            </button>
            <button
              type="button"
              onClick={() => void onShare()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '12px 14px',
                borderRadius: '10px',
                background: '#1A1A1A',
                color: '#CCCCCC',
                fontWeight: 700,
                fontSize: '13px',
                border: '1px solid #333',
                cursor: 'pointer',
                outline: 'none',
                fontFamily: 'Noto Sans KR,sans-serif',
              }}
            >
              <i className="fa-solid fa-link" />
            </button>
          </div>
        </div>

        <div style={{ height: '1px', background: '#2A2A2A', marginBottom: '16px' }} />

        {sent || alreadySaved ? (
          <div style={{ textAlign: 'center', padding: '8px 0', fontSize: '13px', fontWeight: 600, color: '#FEE500' }}>
            ✅ 저장됐어요!
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#BBBBBB', marginBottom: '10px', lineHeight: 1.5, wordBreak: 'keep-all' }}>
              💬 이 결과를 연락처로 저장해두실래요?
              <br />
              <span style={{ color: '#888', fontWeight: 500, fontSize: '11px' }}>저장 후 관리자가 확인할 수 있어요</span>
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                className="sp-input"
                style={{
                  flex: 1,
                  padding: '11px 14px',
                  background: '#111',
                  border: '1px solid #333',
                  borderRadius: '10px',
                  fontSize: '14px',
                  color: '#fff',
                  outline: 'none',
                  fontFamily: 'Noto Sans KR,sans-serif',
                }}
              />
              <button
                type="button"
                onClick={async () => {
                  if (digits.length < 10) {
                    flash('번호를 입력해 주세요.');
                    return;
                  }
                  const ok = await onLeadSubmit(phone);
                  if (ok) setSent(true);
                }}
                style={{
                  padding: '11px 18px',
                  borderRadius: '10px',
                  background: '#FEE500',
                  color: '#3C1E1E',
                  fontWeight: 800,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  outline: 'none',
                  fontFamily: 'Noto Sans KR,sans-serif',
                  whiteSpace: 'nowrap',
                }}
              >
                저장하기
              </button>
            </div>
            <p style={{ fontSize: '10px', color: '#444', marginTop: '8px', lineHeight: 1.4 }}>
              마케팅 정보 수신 동의 포함 · 언제든 수신 거부 가능
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
