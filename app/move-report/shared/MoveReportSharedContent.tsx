'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { parseMoveReportSharePayload } from '../lib/shareLink';
import { P } from '../data/profiles';
import Radar from '../components/Radar';
import type { BreakdownResult } from '../types';

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

export default function MoveReportSharedContent() {
  const searchParams = useSearchParams();
  const raw = searchParams.get('d');
  const parsed = useMemo(() => parseMoveReportSharePayload(raw), [raw]);
  const profileCode = parsed?.v === 3 ? parsed.profileKey : null;
  const payload = useMemo(() => {
    if (!parsed) return null;
    if (parsed.v !== 3) return parsed;
    const profile = P[parsed.profileKey];
    if (!profile) return null;
    return {
      v: 1 as const,
      name: parsed.name,
      profileName: profile.char,
      catchcopy: profile.catchcopy,
      strengths: profile.str.slice(0, 1),
      activity: profile.env[0] || profile.shortTip,
      color: profile.col,
      emoji: profile.em,
      graphCode: parsed.graphCode,
    };
  }, [parsed]);

  if (!payload) {
    return (
      <main style={{ minHeight: '100vh', background: '#0D0D0D', color: '#fff', padding: '24px', display: 'grid', placeItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 420, borderRadius: 18, border: '1px solid #2A2A2A', background: '#171717', padding: 20 }}>
          <h1 style={{ fontSize: 22, marginBottom: 10, fontWeight: 800 }}>공유 결과를 불러올 수 없어요</h1>
          <p style={{ color: '#B9B9B9', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
            링크가 만료되었거나 형식이 올바르지 않습니다.
          </p>
          <Link
            href="/move-report"
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
            나도 결과 해보기
          </Link>
        </div>
      </main>
    );
  }

  const accentColor = normalizeHexColor(payload.color) ?? '#FEE500';
  const profileEmoji = payload.emoji?.trim();
  const radarBreakdown = useMemo<BreakdownResult | null>(() => {
    if (!profileCode || profileCode.length !== 4) return null;
    const g = 'graphCode' in payload && typeof payload.graphCode === 'string' && /^[0-3]{8}$/.test(payload.graphCode) ? payload.graphCode : null;
    if (g) {
      const [cl, ir, rl, er, pl, gr, dl, sr] = g.split('').map((v) => Number(v));
      return {
        social: { l: cl, r: ir, ll: '협동', rl: '독립', sel: cl >= ir ? 'C' : 'I' },
        structure: { l: rl, r: er, ll: '규칙', rl: '탐색', sel: rl >= er ? 'R' : 'E' },
        motivation: { l: pl, r: gr, ll: '과정', rl: '목표', sel: pl >= gr ? 'P' : 'G' },
        energy: { l: dl, r: sr, ll: '동적', rl: '정적', sel: dl >= sr ? 'D' : 'S' },
      };
    }
    const [social, structure, motivation, energy] = profileCode.split('');
    return {
      social: { l: social === 'C' ? 3 : 0, r: social === 'I' ? 3 : 0, ll: '협동', rl: '독립', sel: social },
      structure: { l: structure === 'R' ? 3 : 0, r: structure === 'E' ? 3 : 0, ll: '규칙', rl: '탐색', sel: structure },
      motivation: { l: motivation === 'P' ? 3 : 0, r: motivation === 'G' ? 3 : 0, ll: '과정', rl: '목표', sel: motivation },
      energy: { l: energy === 'D' ? 3 : 0, r: energy === 'S' ? 3 : 0, ll: '동적', rl: '정적', sel: energy },
    };
  }, [payload, profileCode]);

  return (
    <main style={{ minHeight: '100vh', background: '#0D0D0D', color: '#fff', padding: '16px', display: 'grid', placeItems: 'center' }}>
      <section style={{ width: '100%', maxWidth: 460, borderRadius: 18, border: '1px solid #2A2A2A', background: 'linear-gradient(160deg,#141414,#1B1B1B)', padding: 18 }}>
        <p style={{ fontSize: 11, color: '#A2A2A2', letterSpacing: '.08em', fontWeight: 700, marginBottom: 8 }}>MOVE SHARED RESULT</p>
        <h1 style={{ fontSize: 26, lineHeight: 1.25, fontWeight: 900, marginBottom: 12 }}>
          {payload.name}의 유형은
          <br />
          <span style={{ color: accentColor }}>
            {profileEmoji ? `${profileEmoji} ` : ''}
            {payload.profileName}
          </span>
        </h1>
        {profileCode ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              marginBottom: 10,
              padding: '5px 10px',
              borderRadius: 999,
              border: `1px solid ${accentColor}88`,
              background: `${accentColor}1E`,
              color: accentColor,
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: '.08em',
            }}
          >
            {profileCode}
          </div>
        ) : null}
        <p
          style={{
            fontSize: 14,
            color: '#E4E4E4',
            lineHeight: 1.6,
            borderLeft: `3px solid ${accentColor}`,
            paddingLeft: 12,
            marginBottom: 14,
          }}
        >
          &quot;{payload.catchcopy}&quot;
        </p>

        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 13, color: '#9A9A9A', marginBottom: 8 }}>강점 포인트</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {payload.strengths.slice(0, 1).map((item, idx) => (
              <span
                key={idx}
                style={{
                  padding: '6px 9px',
                  borderRadius: 999,
                  border: `1px solid ${accentColor}66`,
                  background: `${accentColor}22`,
                  fontSize: 12,
                  color: '#EFEFEF',
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div style={{ borderRadius: 12, background: `${accentColor}1F`, border: `1px solid ${accentColor}4D`, padding: '11px 12px', marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: accentColor, marginBottom: 6, fontWeight: 700 }}>추천 활동</p>
          <p style={{ fontSize: 14, color: '#FFFBE7', lineHeight: 1.5, fontWeight: 700 }}>{payload.activity}</p>
        </div>

        {radarBreakdown ? (
          <div style={{ borderRadius: 12, border: '1px solid #2A2A2A', background: '#121212', padding: '10px 12px', marginBottom: 14 }}>
            <p style={{ fontSize: 12, color: '#9A9A9A', marginBottom: 8, fontWeight: 700 }}>움직임 그래프</p>
            <Radar bd={radarBreakdown} col={accentColor} />
          </div>
        ) : null}

        <a
          href="https://www.instagram.com/spokedu_kids?igsh=M2ZmYWZxMzRxenVt&utm_source=qr"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', textDecoration: 'none', background: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)', borderRadius: '16px', padding: '2px', marginBottom: 10 }}
        >
          <div
            style={{
              background: '#111',
              borderRadius: '14px',
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '11px',
                  flexShrink: 0,
                  background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="fa-brands fa-instagram" style={{ fontSize: '20px', color: '#fff' }} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>스포키듀 인스타그램</div>
                <div style={{ fontSize: '12px', color: '#AAAAAA' }}>@spokedu_kids · 수업 현장 영상 보러가기 →</div>
              </div>
            </div>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#F0F0F0' }}>↗</span>
          </div>
        </a>

        <Link
          href="/move-report"
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
      </section>
    </main>
  );
}
