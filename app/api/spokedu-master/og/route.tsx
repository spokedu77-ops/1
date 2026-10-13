import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const fontFile = await readFile(path.join(process.cwd(), 'public/fonts/paperlogy/Paperlogy-7Bold.ttf'));
    const fontData = fontFile.buffer.slice(fontFile.byteOffset, fontFile.byteOffset + fontFile.byteLength);
    const screenshotUrl = new URL(
      '/images/spokedu/subscription/library-program-cards-20261008-final.png',
      request.url,
    ).toString();
    return new ImageResponse(renderOgMarkup(screenshotUrl), {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Paperlogy', data: fontData, weight: 700, style: 'normal' }],
    });
  } catch {
    return new Response(FALLBACK_OG_SVG, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }
}

function renderOgMarkup(screenshotUrl: string) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 42,
        padding: '54px 60px',
        overflow: 'hidden',
        background: '#f4f6fb',
        color: '#0f172a',
        fontFamily: 'Paperlogy',
      }}
    >
      <div style={{ width: 474, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 38 }}>
          <span style={{ color: '#64748b', fontSize: 22, fontWeight: 800, letterSpacing: '0.08em' }}>SPOKEDU</span>
          <span style={{ color: '#0f172a', fontSize: 34, fontWeight: 800 }}>LAB</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 52, fontWeight: 700, lineHeight: 1.16, letterSpacing: '-0.045em' }}>
          <span>좋은 체육수업을</span>
          <span>찾고, 준비하고,</span>
          <span>기록합니다.</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 26, color: '#475569', fontSize: 21, fontWeight: 700, lineHeight: 1.5 }}>
          <span>놀이체육 · SPOMOVE · 수업 운영을</span>
          <span>하나의 흐름으로</span>
        </div>
      </div>
      <div style={{ position: 'relative', width: 624, height: 500, display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', inset: '20px -44px -20px 34px', display: 'flex', borderRadius: 42, background: 'linear-gradient(145deg,#dbeafe,#dcfce7)' }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={screenshotUrl}
          width="624"
          height="408"
          alt=""
          style={{ position: 'relative', width: 624, height: 408, objectFit: 'cover', objectPosition: 'top', background: '#fff', borderRadius: 22, border: '1px solid rgba(15,23,42,.15)', boxShadow: '0 30px 70px rgba(15,23,42,.18)' }}
        />
      </div>
    </div>
  );
}

const FALLBACK_OG_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f4f6fb"/>
  <rect x="650" y="82" width="520" height="466" rx="34" fill="#dbeafe"/>
  <text x="68" y="104" fill="#475569" font-size="28" font-family="system-ui, sans-serif" font-weight="800" letter-spacing="2">SPOKEDU LAB</text>
  <text x="68" y="260" fill="#0f172a" font-size="52" font-family="system-ui, sans-serif" font-weight="800">좋은 체육수업을</text>
  <text x="68" y="330" fill="#0f172a" font-size="52" font-family="system-ui, sans-serif" font-weight="800">찾고, 준비하고,</text>
  <text x="68" y="400" fill="#0f172a" font-size="52" font-family="system-ui, sans-serif" font-weight="800">기록합니다.</text>
  <text x="68" y="510" fill="#475569" font-size="22" font-family="system-ui, sans-serif">놀이체육 · SPOMOVE · 수업 운영을 하나의 흐름으로</text>
</svg>`;
