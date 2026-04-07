'use client';

import { useMemo, useRef, useState, type CSSProperties } from 'react';
import type { BreakdownResult, Profile } from '../types';
import ShareResultCard from './ShareResultCard';
import {
  copyTextToClipboard,
  downloadPng,
  makeShareCardBlob,
} from '../lib/shareCard';
import { trackMoveReportEvent } from '../lib/events';
import { formatMoveReportPhone, normalizeMoveReportPhone } from '../lib/phone';
import { buildMoveReportShareUrl } from '../lib/shareLink';

interface ShareAndCollectProps {
  p: Profile;
  displayName: string;
  profileKey: string;
  bd: BreakdownResult;
  graphCode: string;
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

/** 연락처 저장 후 이미지 새 창으로 열기(저장) · 결과 링크 복사 */
export default function ShareAndCollect({ p, displayName, profileKey, bd, graphCode, flash, onLeadSubmit, savedPhone }: ShareAndCollectProps) {
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<'download' | 'share' | null>(null);
  const [savingLead, setSavingLead] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const normalizedSaved = normalizeMoveReportPhone(savedPhone);
  const normalizedInput = normalizeMoveReportPhone(phone);
  const alreadySaved = !!normalizedSaved;
  const active = !!normalizedInput && consent;
  const ready = sent || alreadySaved;
  const strengths = useMemo(() => p.str.slice(0, 1), [p.str]);
  const recommendedActivity = p.env[0] || p.shortTip;
  const fileName = `${displayName || '아이'}_MOVE_요약카드.png`;
  const shareTitle = '스포키듀 MOVE 리포트';
  const shareUrl =
    typeof window !== 'undefined'
      ? buildMoveReportShareUrl(window.location.origin, {
          v: 5,
          profileKey,
          graphCode,
        })
      : '';
  const shareKey = useMemo(() => {
    if (!shareUrl) return null;
    try {
      const u = new URL(shareUrl);
      return u.searchParams.get('d');
    } catch {
      return null;
    }
  }, [shareUrl]);

  const saveToAlbum = async () => {
    if (!ready) {
      flash('전화번호 저장 후 이용할 수 있어요.');
      return;
    }
    if (!cardRef.current) {
      flash('요약 카드 준비 중이에요. 잠시 후 다시 시도해 주세요.');
      return;
    }
    setBusy('download');
    try {
      const blob = await makeShareCardBlob(cardRef.current);
      const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { canShare?: (d?: ShareData) => boolean }) : null;
      if (nav && typeof nav.share === 'function') {
        const file = new File([blob], fileName, { type: 'image/png' });
        // iOS 안정성: files-only가 가장 성공률이 높음
        const primary: ShareData = { files: [file] };
        const secondary: ShareData = { files: [file], title: shareTitle };
        const tryShare = async (data: ShareData): Promise<'shared' | 'cancelled' | 'failed'> => {
          const canShare = typeof nav.canShare === 'function' ? nav.canShare(data) : true;
          if (!canShare) return 'failed';
          try {
            await nav.share(data);
            return 'shared';
          } catch (e) {
            if (e instanceof Error && e.name === 'AbortError') return 'cancelled';
            return 'failed';
          }
        };

        const r1 = await tryShare(primary);
        if (r1 === 'shared') {
          flash('공유 시트에서 "이미지 저장"을 눌러주세요.');
          return;
        }
        if (r1 === 'cancelled') return;

        const r2 = await tryShare(secondary);
        if (r2 === 'shared') {
          flash('공유 시트에서 "이미지 저장"을 눌러주세요.');
          return;
        }
        if (r2 === 'cancelled') return;
      }
      downloadPng(blob, fileName);
      flash('기기 제한으로 파일 다운로드로 저장했어요.');
    } catch (e) {
      const message = e instanceof Error ? e.message : '이미지 생성 중 오류가 발생했어요. 다시 시도해 주세요.';
      flash(message);
    } finally {
      setBusy(null);
    }
  };

  const shareResultLink = async () => {
    if (!ready) {
      flash('전화번호 저장 후 링크를 복사할 수 있어요.');
      return;
    }
    setBusy('share');
    try {
      const copied = await copyTextToClipboard(shareUrl);
      if (!copied) {
        flash('복사에 실패했어요. 잠시 후 다시 시도해 주세요.');
        return;
      }
      flash('링크가 복사되었습니다');
      void trackMoveReportEvent({ eventName: 'share_clicked', shareKey });
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
                onChange={(e) => setPhone(formatMoveReportPhone(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  if (!active || savingLead) return;
                  void (async () => {
                    if (!normalizedInput) {
                      flash('전화번호 11자리(010-0000-0000)를 입력해 주세요.');
                      return;
                    }
                    setSavingLead(true);
                    try {
                      const ok = await onLeadSubmit(normalizedInput);
                      if (ok) setSent(true);
                    } finally {
                      setSavingLead(false);
                    }
                  })();
                }}
                placeholder="010-0000-0000"
                className="sp-input"
                maxLength={13}
                aria-label="전화번호 입력"
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
                disabled={!active || savingLead}
                onClick={async () => {
                  if (!active || savingLead) return;
                  if (!normalizedInput) {
                    flash('전화번호 11자리(010-0000-0000)를 입력해 주세요.');
                    return;
                  }
                  setSavingLead(true);
                  try {
                    const ok = await onLeadSubmit(normalizedInput);
                    if (ok) setSent(true);
                  } finally {
                    setSavingLead(false);
                  }
                }}
                style={{
                  minHeight: '46px',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  background: active && !savingLead ? '#FEE500' : '#2A2A2A',
                  color: active && !savingLead ? '#3C1E1E' : '#555',
                  fontWeight: 800,
                  fontSize: '14px',
                  border: 'none',
                  cursor: active && !savingLead ? 'pointer' : 'default',
                  outline: 'none',
                  fontFamily: 'Noto Sans KR,sans-serif',
                  whiteSpace: 'nowrap',
                }}
              >
                {savingLead ? '저장 중…' : '저장하기'}
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
                {busy === 'share' ? '공유 준비 중…' : '결과 링크 공유'}
              </button>
            </div>

            <a
              href="https://www.instagram.com/spokedu_kids?igsh=M2ZmYWZxMzRxenVt&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                textDecoration: 'none',
                background: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)',
                borderRadius: '16px',
                padding: '2px',
                marginTop: 12,
              }}
            >
              <div
                style={{
                  background: '#111',
                  borderRadius: '14px',
                  padding: '18px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      flexShrink: 0,
                      background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <i className="fa-brands fa-instagram" style={{ fontSize: '22px', color: '#fff' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginBottom: '3px' }}>스포키듀 인스타그램</div>
                    <div style={{ fontSize: '12px', color: '#AAAAAA' }}>@spokedu_kids · 수업 현장 영상 보러가기 →</div>
                  </div>
                </div>
              </div>
            </a>
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
            bd={bd}
            color={p.col}
          />
        </div>
      </div>
    </div>
  );
}
