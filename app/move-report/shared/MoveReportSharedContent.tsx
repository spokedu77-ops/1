'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ShareResultCard from '../components/ShareResultCard';
import { parseMoveReportSharePayload } from '../lib/shareLink';
import { P } from '../data/profiles';
import type { BreakdownResult } from '../types';
import { trackMoveReportEvent } from '../lib/events';

function normalizeHexColor(color?: string): string | null {
  if (!color) return null;
  const value = color.trim();
  const shortHex = /^#([0-9a-fA-F]{3})$/.exec(value);
  if (shortHex) {
    const [r, g, b] = shortHex[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (/^#([0-9a-fA-F]{6})$/.test(value)) return value.toUpperCase();
  return null;
}

const CARD_W = 1080;
const CARD_H = 1580;

export default function MoveReportSharedContent() {
  const searchParams = useSearchParams();
  const raw = searchParams.get('d');
  const parsed = useMemo(() => parseMoveReportSharePayload(raw), [raw]);
  const moveReportHref = raw ? `/move-report?d=${encodeURIComponent(raw)}` : '/move-report';
  const profileCode = parsed?.profileKey ?? null;

  const payload = useMemo(() => {
    if (!parsed) return null;
    const profile = P[parsed.profileKey];
    if (!profile) return null;
    return {
      name: '우리 아이',
      profileName: profile.char,
      catchcopy: profile.catchcopy,
      strengths: profile.str.slice(0, 1),
      activity: profile.env[0] || profile.shortTip,
      color: profile.col,
    };
  }, [parsed]);

  const radarBreakdown = useMemo<BreakdownResult | null>(() => {
    if (!profileCode || profileCode.length !== 4) return null;
    if (parsed?.v === 5 && /^[0-3]{8}$/.test(parsed.graphCode)) {
      const [sl, sr, tl, tr, ml, mr, el, er] = parsed.graphCode.split('').map((v) => Number(v));
      const [social, structure, motivation, energy] = profileCode.split('');
      return {
        social: { l: sl, r: sr, ll: '협동', rl: '독립', sel: social },
        structure: { l: tl, r: tr, ll: '규칙', rl: '탐색', sel: structure },
        motivation: { l: ml, r: mr, ll: '과정', rl: '목표', sel: motivation },
        energy: { l: el, r: er, ll: '동적', rl: '정적', sel: energy },
      };
    }
    const [social, structure, motivation, energy] = profileCode.split('');
    return {
      social: { l: social === 'C' ? 3 : 0, r: social === 'I' ? 3 : 0, ll: '협동', rl: '독립', sel: social },
      structure: { l: structure === 'R' ? 3 : 0, r: structure === 'E' ? 3 : 0, ll: '규칙', rl: '탐색', sel: structure },
      motivation: { l: motivation === 'P' ? 3 : 0, r: motivation === 'G' ? 3 : 0, ll: '과정', rl: '목표', sel: motivation },
      energy: { l: energy === 'D' ? 3 : 0, r: energy === 'S' ? 3 : 0, ll: '동적', rl: '정적', sel: energy },
    };
  }, [parsed, profileCode]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.38);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!raw) return;
    void trackMoveReportEvent({ eventName: 'shared_entry_opened', shareKey: raw });
  }, [raw]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !payload) return;
    const apply = () => setScale(Math.min(1, el.clientWidth / CARD_W));
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [payload]);

  if (!payload || !parsed || !radarBreakdown || !profileCode) {
    return (
      <main style={{ minHeight: '100vh', background: '#0D0D0D', color: '#fff', padding: '24px', display: 'grid', placeItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 420, borderRadius: 18, border: '1px solid #2A2A2A', background: '#171717', padding: 20 }}>
          <h1 style={{ fontSize: 22, marginBottom: 10, fontWeight: 800 }}>공유 결과를 불러올 수 없어요</h1>
          <p style={{ color: '#B9B9B9', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
            링크가 만료되었거나 형식이 올바르지 않습니다.
          </p>
          <Link
            href={moveReportHref}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '12px 16px',
              borderRadius: 10,
              background: '#FEE500',
              color: '#3C1E1E',
              textDecoration: 'none',
              fontWeight: 800,
            }}
          >
            나도 MOVE 리포트 해보기
          </Link>
        </div>
      </main>
    );
  }

  const accentColor = normalizeHexColor(payload.color) ?? '#FEE500';

  return (
    <main style={{ minHeight: '100vh', background: '#0D0D0D', color: '#fff', padding: '16px 16px 40px' }}>
      <div ref={wrapRef} style={{ width: '100%', maxWidth: 430, margin: '0 auto' }}>
        <div style={{ height: CARD_H * scale, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: `translateX(-50%) scale(${scale})`,
              transformOrigin: 'top center',
              width: CARD_W,
            }}
          >
            <ShareResultCard
              displayName={payload.name}
              profileCode={profileCode}
              profileName={payload.profileName}
              catchcopy={payload.catchcopy}
              strengths={payload.strengths}
              recommendedActivity={payload.activity}
              bd={radarBreakdown}
              color={accentColor}
            />
          </div>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 430, margin: '20px auto 0' }}>
        <Link
          href={moveReportHref}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '13px 16px',
            borderRadius: 12,
            background: '#FEE500',
            color: '#3C1E1E',
            textDecoration: 'none',
            fontWeight: 900,
            fontSize: 15,
          }}
        >
          나도 MOVE 리포트 해보기
        </Link>
        <p style={{ margin: '12px 4px 0', color: '#8F8F8F', fontSize: 11, lineHeight: 1.45, textAlign: 'center' }}>
          본 결과는 관찰형 유형 리포트이며, 의료적 진단을 대체하지 않습니다.
        </p>
      </div>
    </main>
  );
}
