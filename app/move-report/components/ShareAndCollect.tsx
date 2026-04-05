'use client';

import { useMemo, useRef, useState } from 'react';
import type { Profile } from '../types';
import ShareResultCard from './ShareResultCard';
import { copyTextToClipboard, downloadPng, makeShareCardBlob, shareTextAndUrl } from '../lib/shareCard';
import { normalizeMoveReportPhone } from '../lib/phone';
import { buildMoveReportShareUrl } from '../lib/shareLink';

interface ShareAndCollectProps {
  p: Profile;
  displayName: string;
  flash: (msg: string) => void;
  onLeadSubmit: (phone: string) => Promise<boolean>;
  savedPhone: string;
}

/** 원본 HTML 공유 + 연락처 저장 카드 */
export default function ShareAndCollect({ p, displayName, flash, onLeadSubmit, savedPhone }: ShareAndCollectProps) {
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<'download' | 'share' | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const normalizedSaved = normalizeMoveReportPhone(savedPhone);
  const normalizedInput = normalizeMoveReportPhone(phone);
  const alreadySaved = !!normalizedSaved;
  const active = !!normalizedInput && consent;
  const ready = sent || alreadySaved;
  const strengths = useMemo(() => p.str.slice(0, 2), [p.str]);
  const recommendedActivity = p.env[0] || p.shortTip;

  const fileName = `${displayName || '아이'}_MOVE_요약카드.png`;
  const shareUrl =
    typeof window !== 'undefined'
      ? buildMoveReportShareUrl(window.location.origin, {
          v: 1,
          name: displayName || '우리 아이',
          profileName: p.char,
          catchcopy: p.catchcopy,
          strengths,
          activity: recommendedActivity,
          color: p.col,
          emoji: p.em,
        })
      : '';
  const shareTitle = '스포키듀 MOVE 리포트';
  const shareText = `${displayName || '우리 아이'} 결과를 공유했어요. 확인하고 나도 해보세요!`;

  const withCardBlob = async () => {
    if (!ready) {
      flash('전화번호 저장 후 요약 카드 저장/공유가 가능해요.');
      return;
    }
    if (!cardRef.current) {
      flash('요약 카드 준비 중이에요. 잠시 후 다시 시도해 주세요.');
      return;
    }
    setBusy('download');
    try {
      const blob = await makeShareCardBlob(cardRef.current);
      downloadPng(blob, fileName);
      flash('요약 카드 이미지가 저장됐어요.');
    } catch (e) {
      const message = e instanceof Error ? e.message : '이미지 생성 중 오류가 발생했어요. 다시 시도해 주세요.';
      flash(message);
    } finally {
      setBusy(null);
    }
  };

  const shareResultLink = async () => {
    if (!ready) {
      flash('전화번호 저장 후 결과 링크 공유가 가능해요.');
      return;
    }
    setBusy('share');
    try {
      const shared = await shareTextAndUrl(shareTitle, shareText, shareUrl);
      if (shared) {
        flash('결과 링크 공유 창을 열었어요.');
        return;
      }
      const copied = await copyTextToClipboard(shareUrl);
      if (copied) {
        flash('결과 링크를 복사했어요.');
      } else {
        flash('이 기기에서는 공유가 제한돼요. 주소창 링크를 직접 복사해 주세요.');
      }
    } finally {
      setBusy(null);
    }
  };

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
            우리 아이 결과를
            <br />
            <span style={{ color: p.col }}>요약 카드로 저장/공유해보세요</span>
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '8px' }}>
            <button
              type="button"
              onClick={() => void withCardBlob()}
              disabled={!ready || busy !== null}
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
                cursor: ready && busy === null ? 'pointer' : 'default',
                outline: 'none',
                boxShadow: `0 4px 20px ${p.col}50`,
                fontFamily: 'Noto Sans KR,sans-serif',
                opacity: ready ? 1 : 0.45,
              }}
            >
              <i className="fa-solid fa-image" />
              {busy === 'download' ? '이미지 준비 중…' : '요약 카드 저장'}
            </button>
            <button
              type="button"
              onClick={() => void shareResultLink()}
              disabled={!ready || busy !== null}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderRadius: '10px',
                background: '#1A1A1A',
                color: '#CCCCCC',
                fontWeight: 700,
                fontSize: '13px',
                border: '1px solid #333',
                cursor: ready && busy === null ? 'pointer' : 'default',
                outline: 'none',
                fontFamily: 'Noto Sans KR,sans-serif',
                opacity: ready ? 1 : 0.45,
              }}
            >
              <i className="fa-solid fa-share-nodes" />
              {busy === 'share' ? '링크 준비 중…' : '결과 링크 공유'}
            </button>
          </div>
          {!ready ? (
            <div style={{ fontSize: '11px', color: '#8B8B8B', fontWeight: 500 }}>
              전화번호 저장 후 요약 카드 저장/공유가 열립니다.
            </div>
          ) : null}
        </div>

        <div style={{ height: '1px', background: '#2A2A2A', marginBottom: '16px' }} />

        {ready ? (
          <div style={{ textAlign: 'center', padding: '8px 0', fontSize: '13px', fontWeight: 600, color: '#FEE500', lineHeight: 1.5 }}>
            ✅ 전화번호 저장 완료
            <br />
            <span style={{ color: '#B9B9B9', fontWeight: 500 }}>이제 요약 카드 이미지로 보관하고 공유할 수 있어요.</span>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#BBBBBB', marginBottom: '10px', lineHeight: 1.5, wordBreak: 'keep-all' }}>
              💬 이 결과를 연락처로 저장해두실래요?
              <br />
              <span style={{ color: '#888', fontWeight: 500, fontSize: '11px' }}>저장 후 요약 카드 이미지 저장/공유가 열려요</span>
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
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
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
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
                disabled={!active}
                onClick={async () => {
                  if (!active) return;
                  if (!normalizedInput) {
                    flash('전화번호 11자리(010-0000-0000)를 입력해 주세요.');
                    return;
                  }
                  const ok = await onLeadSubmit(normalizedInput);
                  if (ok) setSent(true);
                }}
                style={{
                  padding: '11px 18px',
                  borderRadius: '10px',
                  background: active ? '#FEE500' : '#2A2A2A',
                  color: active ? '#3C1E1E' : '#555',
                  fontWeight: 800,
                  fontSize: '13px',
                  border: 'none',
                  cursor: active ? 'pointer' : 'default',
                  outline: 'none',
                  fontFamily: 'Noto Sans KR,sans-serif',
                  whiteSpace: 'nowrap',
                }}
              >
                저장하기
              </button>
            </div>
            <p style={{ fontSize: '10px', color: '#444', marginTop: '8px', lineHeight: 1.4 }}>
              11자리 휴대폰 번호(010-0000-0000)만 저장 가능 · 언제든 수신 거부 가능
            </p>
          </div>
        )}
      </div>
      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          opacity: 0,
          zIndex: -1,
          pointerEvents: 'none',
        }}
      >
        <div ref={cardRef}>
          <ShareResultCard
            displayName={displayName}
            profileName={p.char}
            catchcopy={p.catchcopy}
            strengths={strengths}
            recommendedActivity={recommendedActivity}
            color={p.col}
          />
        </div>
      </div>
    </div>
  );
}
