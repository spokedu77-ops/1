import React from 'react';
import { ImageResponse } from 'next/og';
import { parseMoveReportSharePayload } from '@/app/move-report/lib/shareLink';
import { P } from '@/app/move-report/data/profiles';

export const runtime = 'edge';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = parseMoveReportSharePayload(searchParams.get('d'));

  if (!parsed) {
    return new ImageResponse(
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
            color: '#FFF',
            fontFamily: 'sans-serif',
          },
        },
        React.createElement('div', { style: { fontSize: 52, fontWeight: 800 } }, 'MOVE 리포트'),
        React.createElement('div', { style: { marginTop: 16, color: '#C6C6C6', fontSize: 30 } }, '공유 결과')
      ),
      { width: 1200, height: 630 }
    );
  }

  const profile = P[parsed.profileKey];
  if (!profile) {
    return new ImageResponse(
      React.createElement('div', {
        style: { width: '100%', height: '100%', background: '#0A0A0A', display: 'flex' },
      }),
      { width: 1200, height: 630 }
    );
  }

  const key = parsed.profileKey;
  const col = profile.col;

  const codeLabels = [
    { code: key[0], label: key[0] === 'C' ? '협동형' : '독립형' },
    { code: key[1], label: key[1] === 'R' ? '규칙 친화' : '탐구 지향' },
    { code: key[2], label: key[2] === 'P' ? '과정 중시' : '목표 지향' },
    { code: key[3], label: key[3] === 'D' ? '동적 에너지' : '정적 에너지' },
  ];

  return new ImageResponse(
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
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        },
      },
      /* 배경 장식 */
      React.createElement('div', {
        style: {
          position: 'absolute',
          top: '-20%',
          right: '-5%',
          width: '55%',
          height: '140%',
          background: `radial-gradient(circle,${col}45 0%,transparent 65%)`,
        },
      }),
      React.createElement('div', {
        style: {
          position: 'absolute',
          bottom: '-20%',
          left: '-5%',
          width: '35%',
          height: '80%',
          background: 'radial-gradient(circle,rgba(255,176,32,.14) 0%,transparent 65%)',
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
            padding: '52px 48px',
            width: '48%',
            position: 'relative',
            zIndex: 1,
          },
        },
        /* IRGD 뱃지 */
        React.createElement(
          'div',
          { style: { display: 'flex', gap: 10, marginBottom: 20 } },
          ...key.split('').map((c) =>
            React.createElement(
              'div',
              {
                key: c,
                style: {
                  fontSize: 30,
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${col}22`,
                  border: `2px solid ${col}60`,
                  color: col,
                  fontWeight: 900,
                },
              },
              c
            )
          )
        ),
        /* 이모지 */
        React.createElement('div', { style: { fontSize: 120, lineHeight: 1, marginBottom: 16 } }, profile.em),
        /* 유형명 레이블 */
        React.createElement(
          'div',
          { style: { fontSize: 18, fontWeight: 700, color: col, letterSpacing: '0.06em', marginBottom: 10 } },
          '우리 아이의 MOVE 유형'
        ),
        /* 유형 이름 */
        React.createElement(
          'div',
          { style: { fontSize: 62, fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.01em' } },
          profile.char
        ),
        /* 타이틀 */
        React.createElement(
          'div',
          { style: { fontSize: 26, fontWeight: 700, color: col, marginTop: 10, letterSpacing: '0.05em' } },
          profile.title
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
            padding: '52px 52px 52px 32px',
            width: '52%',
            position: 'relative',
            zIndex: 1,
            borderLeft: `1px solid rgba(255,255,255,.08)`,
          },
        },
        /* SPOKEDU 브랜딩 */
        React.createElement(
          'div',
          {
            style: {
              fontSize: 22,
              fontWeight: 900,
              color: '#FF4B1F',
              letterSpacing: '0.1em',
              marginBottom: 22,
            },
          },
          'SPOKEDU'
        ),
        /* 코드 라벨 뱃지 */
        React.createElement(
          'div',
          { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 } },
          ...codeLabels.map((item) =>
            React.createElement(
              'div',
              {
                key: item.code,
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 10,
                  background: `${col}18`,
                  border: `1.5px solid ${col}35`,
                },
              },
              React.createElement('span', { style: { fontSize: 18, color: col, fontWeight: 900 } }, item.code),
              React.createElement('span', { style: { fontSize: 15, color: 'rgba(255,255,255,.7)', fontWeight: 600 } }, item.label)
            )
          )
        ),
        /* 캐치카피 */
        React.createElement(
          'div',
          {
            style: {
              padding: '18px 22px',
              background: `${col}18`,
              border: `1.5px solid ${col}40`,
              borderRadius: 14,
              marginBottom: 20,
            },
          },
          React.createElement(
            'div',
            { style: { fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.4 } },
            `"${profile.catchcopy}"`
          )
        ),
        /* 키워드 태그 */
        React.createElement(
          'div',
          { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
          ...profile.kw.map((k) =>
            React.createElement(
              'span',
              {
                key: k,
                style: {
                  fontSize: 16,
                  fontWeight: 700,
                  padding: '7px 14px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,.07)',
                  color: 'rgba(255,255,255,.75)',
                  border: '1px solid rgba(255,255,255,.12)',
                },
              },
              k
            )
          )
        )
      )
    ),
    { width: 1200, height: 630 }
  );
}
