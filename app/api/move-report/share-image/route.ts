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
  catchcopy: string;
  strengths: string[];
  activity: string;
  color?: string;
  emoji?: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = parseMoveReportSharePayload(searchParams.get('d'));
  const payload: ImagePayload | null =
    !parsed
      ? null
      : parsed.v !== 3
        ? parsed
        : (() => {
            const profile = P[parsed.profileKey];
            if (!profile) return null;
            return {
              name: parsed.name,
              profileName: profile.char,
              catchcopy: profile.catchcopy,
              strengths: profile.str.slice(0, 1),
              activity: profile.env[0] || profile.shortTip,
              color: profile.col,
              emoji: profile.em,
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
      React.createElement('div', { style: { fontSize: 24, color: '#FFEFC2', marginTop: 'auto' } }, `추천 활동: ${payload.activity}`)
    ),
    { width: 1200, height: 630 }
  );
}

