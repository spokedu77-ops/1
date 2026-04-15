import React from 'react';
import { ImageResponse } from 'next/og';
import { parseMoveReportSharePayload } from '@/app/move-report/lib/shareLink';
import { P } from '@/app/move-report/data/profiles';

export const runtime = 'edge';

/**
 * Google Fonts text 파라미터로 필요한 한국어 문자만 서브셋 로드.
 * 실패 시 null 반환 → sans-serif fallback.
 */
async function loadKoreanFont(characters: string): Promise<ArrayBuffer | null> {
  const unique = [...new Set(characters.split(''))].join('');
  try {
    const cssRes = await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&text=${encodeURIComponent(unique)}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
    );
    if (!cssRes.ok) throw new Error('css fetch failed');
    const css = await cssRes.text();
    // Google Fonts URL은 .woff2로 끝나지 않는 인코딩 URL이므로 format('woff2') 앞의 url(...) 추출
    const woff2Url = css.match(/url\(([^)]+)\)\s*format\(['"]?woff2['"]?\)/)?.[1];
    if (!woff2Url) throw new Error('woff2 url not found');
    const fontRes = await fetch(woff2Url);
    if (!fontRes.ok) throw new Error('font fetch failed');
    return fontRes.arrayBuffer();
  } catch {
    return null;
  }
}

/** 이모지 → Twemoji CDN URL (ZWJ 시퀀스 포함) */
function toTwemojiUrl(em: string): string {
  const codePoints = [...em]
    .map((c) => c.codePointAt(0)!.toString(16))
    .filter((cp) => cp !== 'fe0f');
  return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${codePoints.join('-')}.png`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = parseMoveReportSharePayload(searchParams.get('d'));

  const cacheHeaders = {
    'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
  };

  if (!parsed) {
    const fontData = await loadKoreanFont('MOVE 리포트 공유 결과');
    const fonts = fontData
      ? [{ name: 'NotoKR', data: fontData, weight: 700 as const, style: 'normal' as const }]
      : [];
    const res = new ImageResponse(
      React.createElement(
        'div',
        {
          style: {
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#0A0A0A',
            color: '#fff',
            fontFamily: fonts.length ? 'NotoKR' : 'sans-serif',
          },
        },
        React.createElement('div', { style: { fontSize: 52, fontWeight: 700 } }, 'MOVE 리포트'),
        React.createElement(
          'div',
          { style: { marginTop: 16, color: '#C6C6C6', fontSize: 30 } },
          '공유 결과',
        ),
      ),
      { width: 1200, height: 630, fonts },
    );
    res.headers.set('Cache-Control', cacheHeaders['Cache-Control']);
    return res;
  }

  const profile = P[parsed.profileKey];
  if (!profile) {
    const empty = new ImageResponse(
      React.createElement('div', {
        style: { width: '100%', height: '100%', background: '#0A0A0A', display: 'flex' },
      }),
      { width: 1200, height: 630 },
    );
    empty.headers.set('Cache-Control', cacheHeaders['Cache-Control']);
    return empty;
  }

  const profileKey = parsed.profileKey;
  const col = profile.col;
  const displayName = parsed.displayName || '우리 아이';
  const moveTypeLabel = `${displayName}의 MOVE 유형`;

  const codeLabels = [
    { code: profileKey[0], label: profileKey[0] === 'C' ? '협동형' : '독립형' },
    { code: profileKey[1], label: profileKey[1] === 'R' ? '규칙 친화' : '탐구 지향' },
    { code: profileKey[2], label: profileKey[2] === 'P' ? '과정 중시' : '목표 지향' },
    { code: profileKey[3], label: profileKey[3] === 'D' ? '동적 에너지' : '정적 에너지' },
  ];

  const textForFont = [
    moveTypeLabel,
    profile.char,
    profile.title,
    profile.catchcopy,
    ...profile.kw,
    ...codeLabels.map((l) => l.label),
  ].join('');

  const fontData = await loadKoreanFont(textForFont);
  const fontFamily = 'NotoKR';
  const fonts = fontData
    ? [{ name: fontFamily, data: fontData, weight: 700 as const, style: 'normal' as const }]
    : [];
  const emojiUrl = toTwemojiUrl(profile.em);

  const main = new ImageResponse(
    React.createElement(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          background: '#0A0A0A',
          color: '#fff',
          fontFamily: fonts.length ? fontFamily : 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        },
      },
      /* 배경 장식 */
      React.createElement('div', {
        style: {
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '50%',
          height: '120%',
          background: `radial-gradient(circle,${col}40 0%,transparent 65%)`,
        },
      }),

      /* 왼쪽: 이모지 + 유형명 */
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '44px 40px',
            width: '46%',
            position: 'relative',
            zIndex: 1,
            gap: 0,
          },
        },
        /* IEPD 뱃지 */
        React.createElement(
          'div',
          { style: { display: 'flex', gap: 8, marginBottom: 18 } },
          ...profileKey.split('').map((letter, i) =>
            React.createElement(
              'div',
              {
                key: i,
                style: {
                  fontSize: 26,
                  width: 46,
                  height: 46,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${col}22`,
                  border: `2px solid ${col}60`,
                  color: col,
                  fontWeight: 900,
                  fontFamily: 'sans-serif',
                },
              },
              letter,
            ),
          ),
        ),
        /* 이모지 이미지 */
        React.createElement('img', {
          src: emojiUrl,
          width: 96,
          height: 96,
          style: { marginBottom: 14, objectFit: 'contain' },
        }),
        /* 유형명 레이블 */
        React.createElement(
          'div',
          {
            style: {
              fontSize: 16,
              fontWeight: 700,
              color: col,
              letterSpacing: '0.06em',
              marginBottom: 8,
            },
          },
          moveTypeLabel,
        ),
        /* 유형 이름 */
        React.createElement(
          'div',
          {
            style: {
              fontSize: 52,
              fontWeight: 900,
              color: '#fff',
              lineHeight: 1.1,
              marginBottom: 8,
            },
          },
          profile.char,
        ),
        /* 타이틀 */
        React.createElement(
          'div',
          {
            style: {
              fontSize: 22,
              fontWeight: 700,
              color: col,
            },
          },
          profile.title,
        ),
      ),

      /* 오른쪽: 코드라벨 + 캐치카피 + 키워드 + SPOKEDU */
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '44px 44px 44px 28px',
            width: '54%',
            position: 'relative',
            zIndex: 1,
            borderLeft: '1px solid rgba(255,255,255,.08)',
            gap: 0,
          },
        },
        /* SPOKEDU 브랜딩 */
        React.createElement(
          'div',
          {
            style: {
              fontSize: 20,
              fontWeight: 900,
              color: '#FF4B1F',
              letterSpacing: '0.1em',
              marginBottom: 18,
              fontFamily: 'sans-serif',
            },
          },
          'SPOKEDU',
        ),
        /* 코드 라벨 뱃지 */
        React.createElement(
          'div',
          { style: { display: 'flex', gap: 7, marginBottom: 18, flexWrap: 'wrap' } },
          ...codeLabels.map((item, i) =>
            React.createElement(
              'div',
              {
                key: i,
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 12px',
                  borderRadius: 8,
                  background: `${col}18`,
                  border: `1.5px solid ${col}35`,
                },
              },
              React.createElement(
                'span',
                {
                  style: {
                    fontSize: 16,
                    color: col,
                    fontWeight: 900,
                    fontFamily: 'sans-serif',
                  },
                },
                item.code,
              ),
              React.createElement(
                'span',
                { style: { fontSize: 14, color: 'rgba(255,255,255,.7)', fontWeight: 700 } },
                item.label,
              ),
            ),
          ),
        ),
        /* 캐치카피 */
        React.createElement(
          'div',
          {
            style: {
              padding: '16px 20px',
              background: `${col}18`,
              border: `1.5px solid ${col}40`,
              borderRadius: 12,
              marginBottom: 18,
            },
          },
          React.createElement(
            'div',
            {
              style: {
                fontSize: 20,
                fontWeight: 700,
                color: '#fff',
                lineHeight: 1.45,
                display: 'flex',
              },
            },
            `"${profile.catchcopy}"`,
          ),
        ),
        /* 키워드 태그 */
        React.createElement(
          'div',
          { style: { display: 'flex', gap: 7, flexWrap: 'wrap' } },
          ...profile.kw.map((k, i) =>
            React.createElement(
              'span',
              {
                key: i,
                style: {
                  fontSize: 15,
                  fontWeight: 700,
                  padding: '6px 13px',
                  borderRadius: 7,
                  background: 'rgba(255,255,255,.07)',
                  color: 'rgba(255,255,255,.75)',
                  border: '1px solid rgba(255,255,255,.12)',
                },
              },
              k,
            ),
          ),
        ),
      ),
    ),
    { width: 1200, height: 630, fonts },
  );
  main.headers.set('Cache-Control', cacheHeaders['Cache-Control']);
  return main;
}
