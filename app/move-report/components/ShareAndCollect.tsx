'use client';

import { useMemo, useState } from 'react';
import type { Profile } from '../types';
import { copyTextToClipboard } from '../lib/shareCard';
import { trackMoveReportEvent } from '../lib/events';
import { buildMoveReportShareUrl } from '../lib/shareLink';

interface ShareAndCollectProps {
  p: Profile;
  displayName: string;
  profileKey: string;
  graphCode: string;
  flash: (msg: string) => void;
}

export default function ShareAndCollect({ p, displayName, profileKey, graphCode, flash }: ShareAndCollectProps) {
  const [sharing, setSharing] = useState(false);

  const shareUrl =
    typeof window !== 'undefined'
      ? buildMoveReportShareUrl(window.location.origin, {
          v: 5,
          profileKey,
          graphCode,
          displayName: displayName !== '아이' ? displayName : undefined,
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

  const shareResultLink = async () => {
    setSharing(true);
    try {
      const copied = await copyTextToClipboard(shareUrl);
      if (!copied) {
        flash('복사에 실패했어요. 잠시 후 다시 시도해 주세요.');
        return;
      }
      flash('링크가 복사되었습니다');
      void trackMoveReportEvent({ eventName: 'share_clicked', shareKey });
    } finally {
      setSharing(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
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
          <button
            type="button"
            onClick={() => void shareResultLink()}
            disabled={sharing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              minHeight: '46px',
              padding: '14px 18px',
              borderRadius: '12px',
              background: '#1A1A1A',
              color: '#CCCCCC',
              fontWeight: 700,
              fontSize: '14px',
              border: '1px solid #333',
              cursor: sharing ? 'default' : 'pointer',
              outline: 'none',
              fontFamily: 'Noto Sans KR,sans-serif',
              opacity: sharing ? 0.55 : 1,
            }}
          >
            <i className="fa-solid fa-share-nodes" aria-hidden />
            {sharing ? '공유 준비 중…' : '결과 링크 공유'}
          </button>

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
      </div>
    </div>
  );
}
