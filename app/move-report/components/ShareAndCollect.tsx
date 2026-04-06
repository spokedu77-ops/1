'use client';

import { useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Profile } from '../types';
import ShareResultCard from './ShareResultCard';
import { copyTextToClipboard, downloadPng, makeShareCardBlob, sharePng, shareTextAndUrl } from '../lib/shareCard';
import { normalizeMoveReportPhone } from '../lib/phone';
import { buildMoveReportShareUrl } from '../lib/shareLink';

interface ShareAndCollectProps {
  p: Profile;
  displayName: string;
  profileKey: string;
  graphCode: string;
  graph: {
    social: number;
    structure: number;
    motivation: number;
    energy: number;
  };
  flash: (msg: string) => void;
  onLeadSubmit: (phone: string) => Promise<boolean>;
  savedPhone: string;
}

const BTN_ROW: CSSProperties = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
  justifyContent: 'stretch',
};

const primaryBtn = (col: string, disabled: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  flex: '1 1 140px',
  minHeight: '46px',
  padding: '14px 18px',
  borderRadius: '12px',
  background: col,
  color: '#fff',
  fontWeight: 700,
  fontSize: '14px',
  border: 'none',
  cursor: disabled ? 'default' : 'pointer',
  outline: 'none',
  boxShadow: disabled ? 'none' : `0 4px 20px ${col}50`,
  fontFamily: 'Noto Sans KR,sans-serif',
  opacity: disabled ? 0.55 : 1,
});

const secondaryBtn = (disabled: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  flex: '1 1 140px',
  minHeight: '46px',
  padding: '14px 18px',
  borderRadius: '12px',
  background: '#1A1A1A',
  color: '#CCCCCC',
  fontWeight: 700,
  fontSize: '14px',
  border: '1px solid #333',
  cursor: disabled ? 'default' : 'pointer',
  outline: 'none',
  fontFamily: 'Noto Sans KR,sans-serif',
  opacity: disabled ? 0.55 : 1,
});

/** 연락처 저장 후 앨범 저장(공유 시트) · 결과 링크 공유 */
export default function ShareAndCollect({ p, displayName, profileKey, graphCode, graph, flash, onLeadSubmit, savedPhone }: ShareAndCollectProps) {
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
  const strengths = useMemo(() => p.str.slice(0, 1), [p.str]);
  const recommendedActivity = p.env[0] || p.shortTip;
  const fileName = `${displayName || '아이'}_MOVE_요약카드.png`;
  const shareUrl =
    typeof window !== 'undefined'
      ? buildMoveReportShareUrl(window.location.origin, {
          v: 3,
          name: displayName || '우리 아이',
          profileKey,
          graphCode,
        })
      : '';
  const shareTitle = '스포키듀 MOVE 리포트';
  const shareText = `${displayName || '우리 아이'} 결과를 공유했어요. 확인하고 나도 해보세요!`;

  const saveToAlbum = async () => {
    if (!ready) {
      flash('전화번호 저장 후 앨범 저장/링크 공유가 가능해요.');
      return;
    }
    if (!cardRef.current) {
      flash('요약 카드 준비 중이에요. 잠시 후 다시 시도해 주세요.');
      return;
    }
    setBusy('download');
    try {
      const blob = await makeShareCardBlob(cardRef.current);
      const openedShareSheet = await sharePng(blob, shareTitle, `${shareText} 사진으로 저장해 보세요.`, fileName);
      if (openedShareSheet) {
        flash('공유 창이 열렸어요. 사진 앱에 저장해 주세요.');
        return;
      }
      downloadPng(blob, fileName);
      flash('이 기기에서는 공유가 제한되어 파일 다운로드로 저장했어요.');
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

  const ctaBusy = busy !== null;

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
        {!ready ? (
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: p.col,
                marginBottom: '8px',
              }}
            >
              1단계 · 연락처 저장
            </div>
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 800,
                color: '#EEEEEE',
                margin: '0 0 8px',
                lineHeight: 1.45,
                wordBreak: 'keep-all',
              }}
            >
              전화번호와 동의를 완료하면
              <br />
              <span style={{ color: p.col }}>앨범 저장·링크 공유</span>를 쓸 수 있어요
            </h3>
            <p style={{ fontSize: '12px', color: '#8B8B8B', lineHeight: 1.55, margin: '0 0 16px', wordBreak: 'keep-all' }}>
              아래에서 저장을 마치면 다음 단계 버튼이 열립니다.
            </p>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
              <button
                type="button"
                aria-pressed={consent}
                onClick={() => setConsent((c) => !c)}
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '6px',
                  flexShrink: 0,
                  marginTop: '2px',
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
                  lineHeight: 1.55,
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
            <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
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
                  minWidth: 0,
                  minHeight: '46px',
                  padding: '12px 14px',
                  background: '#111',
                  border: '1px solid #333',
                  borderRadius: '12px',
                  fontSize: '15px',
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
                  minHeight: '46px',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  background: active ? '#FEE500' : '#2A2A2A',
                  color: active ? '#3C1E1E' : '#555',
                  fontWeight: 800,
                  fontSize: '14px',
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
            <p style={{ fontSize: '10px', color: '#555', marginTop: '10px', lineHeight: 1.45 }}>
              11자리 휴대폰 번호(010-0000-0000)만 저장 가능 · 언제든 수신 거부 가능
            </p>
          </div>
        ) : (
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: '#A8A8A8',
                marginBottom: '6px',
              }}
            >
              저장 완료
            </div>
            <p style={{ fontSize: '15px', fontWeight: 800, color: '#F0F0F0', margin: '0 0 6px', lineHeight: 1.45, wordBreak: 'keep-all' }}>
              앨범에 저장하거나 링크를 공유해 보세요
            </p>
            <p style={{ fontSize: '12px', color: '#8B8B8B', margin: '0 0 14px', lineHeight: 1.5 }}>
              미리보기는 저장되는 이미지와 같아요.
            </p>

            <div
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid #2A2A2A',
                background: '#0A0A0A',
                marginBottom: '16px',
                height: '220px',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '10px',
                  transform: 'translateX(-50%) scale(0.185)',
                  transformOrigin: 'top center',
                  width: '1080px',
                }}
              >
                <ShareResultCard
                  displayName={displayName}
                  profileCode={profileKey}
                  profileName={p.char}
                  catchcopy={p.catchcopy}
                  strengths={strengths}
                  recommendedActivity={recommendedActivity}
                  graph={graph}
                  color={p.col}
                />
              </div>
            </div>

            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: p.col,
                marginBottom: '10px',
              }}
            >
              2단계 · 저장 및 공유
            </div>
            <div style={BTN_ROW}>
              <button
                type="button"
                onClick={() => void saveToAlbum()}
                disabled={ctaBusy}
                aria-busy={busy === 'download'}
                style={primaryBtn(p.col, ctaBusy)}
              >
                <i className="fa-solid fa-image" aria-hidden />
                {busy === 'download' ? '이미지 준비 중…' : '앨범에 저장'}
              </button>
              <button
                type="button"
                onClick={() => void shareResultLink()}
                disabled={ctaBusy}
                aria-busy={busy === 'share'}
                style={secondaryBtn(ctaBusy)}
              >
                <i className="fa-solid fa-share-nodes" aria-hidden />
                {busy === 'share' ? '링크 준비 중…' : '결과 링크 공유'}
              </button>
            </div>
            <div
              style={{
                marginTop: 10,
                borderRadius: 12,
                border: `1px solid ${p.col}55`,
                background: `linear-gradient(135deg,${p.col}20,${p.col}10)`,
                padding: '10px 12px',
              }}
            >
              <p style={{ margin: 0, fontSize: '11px', color: '#D3D3D3', lineHeight: 1.5 }}>
                공유 링크로 주변 부모님도 바로 테스트할 수 있어요.
              </p>
              <a
                href="https://www.instagram.com/spokedu_kids?igsh=M2ZmYWZxMzRxenVt&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  marginTop: 6,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: 13,
                  textDecoration: 'none',
                }}
              >
                <span>Instagram @spokedu_kids</span>
                <span style={{ color: p.col }}>↗</span>
              </a>
            </div>
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
            profileCode={profileKey}
            profileName={p.char}
            catchcopy={p.catchcopy}
            strengths={strengths}
            recommendedActivity={recommendedActivity}
            graph={graph}
            color={p.col}
          />
        </div>
      </div>
    </div>
  );
}
