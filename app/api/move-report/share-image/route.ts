import React from 'react';
import { ImageResponse } from 'next/og';
import { parseMoveReportSharePayload } from '@/app/move-report/lib/shareLink';
import { P } from '@/app/move-report/data/profiles';

export const runtime = 'edge';

function normalizeHexColor(color?: string): string {
  if (!color) return '#FEE500';
  const value = color.trim();
  if (/^#([0-9a-fA-F]{6})$/.test(value)) return value.toUpperCase();
  const shortHex = /^#([0-9a-fA-F]{3})$/.exec(value);
  if (!shortHex) return '#FEE500';
  const [r, g, b] = shortHex[1].split('');
  return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
}

type ImagePayload = {
  name: string;
  profileName: string;
  profileCode: string;
  catchcopy: string;
  strengths: string[];
  activity: string;
  color?: string;
  emoji?: string;
  graph: {
    social: number;
    structure: number;
    motivation: number;
    energy: number;
  };
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = parseMoveReportSharePayload(searchParams.get('d'));
  const payload: ImagePayload | null =
    !parsed
      ? null
      : (() => {
          const profile = P[parsed.profileKey];
          if (!profile) return null;
          const profileCode = parsed.profileKey;
          const graphFromCode =
            parsed.v === 5 && /^[0-3]{8}$/.test(parsed.graphCode)
              ? (() => {
                  const [sl, sr, tl, tr, ml, mr, el, er] = parsed.graphCode.split('').map((v) => Number(v));
                  return {
                    social: Math.max(sl, sr),
                    structure: Math.max(tl, tr),
                    motivation: Math.max(ml, mr),
                    energy: Math.max(el, er),
                  };
                })()
              : {
                  social: profileCode[0] === 'C' ? 3 : 0,
                  structure: profileCode[1] === 'R' ? 3 : 0,
                  motivation: profileCode[2] === 'P' ? 3 : 0,
                  energy: profileCode[3] === 'D' ? 3 : 0,
                };
          return {
            name: '우리 아이',
            profileName: profile.char,
            profileCode,
            catchcopy: profile.catchcopy,
            strengths: profile.str.slice(0, 1),
            activity: profile.env[0] || profile.shortTip,
            color: profile.col,
            emoji: profile.em,
            graph: graphFromCode,
          };
        })();

  if (!payload) {
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
            background: '#101010',
            color: '#FFF',
            fontSize: 46,
            fontWeight: 800,
          },
        },
        React.createElement('div', null, 'MOVE 리포트'),
        React.createElement('div', { style: { marginTop: 12, color: '#C6C6C6', fontSize: 28 } }, '공유 결과')
      ),
      { width: 1200, height: 630 }
    );
  }

  const accent = normalizeHexColor(payload.color);
  const profile = `${payload.emoji ? `${payload.emoji} ` : ''}${payload.profileName}`;

  return new ImageResponse(
    React.createElement(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '56px 62px',
          background: 'linear-gradient(160deg,#101010,#1A1A1A)',
          color: '#FFF',
          position: 'relative',
          fontFamily: 'sans-serif',
        },
      },
      React.createElement('div', {
        style: {
          position: 'absolute',
          top: -80,
          right: -40,
          width: 420,
          height: 420,
          borderRadius: 9999,
          background: `radial-gradient(circle,${accent}66 0%,transparent 70%)`,
        },
      }),
      React.createElement('div', { style: { fontSize: 20, color: '#BEBEBE', marginBottom: 14 } }, 'SPOKEDU MOVE REPORT'),
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            fontSize: 60,
            fontWeight: 900,
            lineHeight: 1.15,
            marginBottom: 20,
          },
        },
        `${payload.name}의 유형은 `,
        React.createElement('span', { style: { color: accent } }, profile)
      ),
      React.createElement(
        'div',
        {
          style: {
            fontSize: 30,
            lineHeight: 1.5,
            color: '#ECECEC',
            borderLeft: `6px solid ${accent}`,
            paddingLeft: 16,
            marginBottom: 22,
            maxWidth: 1000,
          },
        },
        `"${payload.catchcopy}"`
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', gap: 8, marginBottom: 14 } },
        React.createElement(
          'div',
          {
            style: {
              padding: '6px 12px',
              borderRadius: 999,
              border: `1px solid ${accent}77`,
              background: `${accent}22`,
              color: accent,
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: 1,
            },
          },
          payload.profileCode
        )
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' } },
        ...payload.strengths.slice(0, 1).map((item, idx) =>
          React.createElement(
            'div',
            {
              key: `${item}-${idx}`,
              style: {
                padding: '8px 14px',
                borderRadius: 9999,
                border: `1px solid ${accent}77`,
                background: `${accent}22`,
                fontSize: 22,
              },
            },
            item
          )
        )
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', gap: 10, marginBottom: 18 } },
        ...(
          [
            ['사회', payload.graph.social],
            ['탐구', payload.graph.structure],
            ['동기', payload.graph.motivation],
            ['에너지', payload.graph.energy],
          ] as const
        ).map(([label, value]) =>
          React.createElement(
            'div',
            {
              key: label,
              style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                minWidth: 86,
              },
            },
            React.createElement('div', { style: { fontSize: 14, color: '#AFAFAF' } }, label),
            React.createElement('div', {
              style: {
                width: '100%',
                height: 8,
                borderRadius: 999,
                background: '#2A2A2A',
                overflow: 'hidden',
              },
            },
            React.createElement('div', {
              style: {
                width: `${Math.max(0, Math.min(3, value)) * (100 / 3)}%`,
                height: '100%',
                background: accent,
              },
            }))
          )
        )
      ),
      React.createElement('div', { style: { fontSize: 24, color: '#FFEFC2', marginTop: 'auto' } }, `추천 활동: ${payload.activity}`)
    ),
    { width: 1200, height: 630 }
  );
}

