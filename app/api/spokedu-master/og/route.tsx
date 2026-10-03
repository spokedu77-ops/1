import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const fontFile = await readFile(path.join(process.cwd(), 'public/fonts/paperlogy/Paperlogy-7Bold.ttf'));
    const fontData = fontFile.buffer.slice(fontFile.byteOffset, fontFile.byteOffset + fontFile.byteLength);
    const screenshotUrl = new URL('/images/spokedu/home/field-editorial/home-master-ui.png', request.url).toString();
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
        gap: 46,
        padding: '64px 68px',
        overflow: 'hidden',
        background: '#f4f6fb',
        color: '#0f172a',
        fontFamily: 'Paperlogy',
      }}
    >
      <div style={{ width: 486, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 44 }}>
          <span style={{ color: '#64748b', fontSize: 14, fontWeight: 800, letterSpacing: '0.16em' }}>SPOKEDU</span>
          <span style={{ color: '#0f172a', fontSize: 24, fontWeight: 800 }}>MASTER</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 48, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.045em' }}>
          <span>체육수업을 찾고,</span>
          <span>운영하고,</span>
          <span>다음 수업까지 이어갑니다.</span>
        </div>
        <div style={{ marginTop: 28, color: '#64748b', fontSize: 18, fontWeight: 700, lineHeight: 1.55 }}>
          유아·초등 체육 교사·강사를 위한 수업 운영 서비스
        </div>
      </div>
      <div style={{ position: 'relative', width: 600, height: 450, display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', inset: '24px -52px -24px 42px', display: 'flex', borderRadius: 42, background: 'linear-gradient(145deg,#dbeafe,#dcfce7)' }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={screenshotUrl}
          width="600"
          height="450"
          alt=""
          style={{ position: 'relative', width: 600, height: 450, objectFit: 'contain', background: '#fff', borderRadius: 22, border: '1px solid rgba(15,23,42,.15)', boxShadow: '0 30px 70px rgba(15,23,42,.18)' }}
        />
      </div>
    </div>
  );
}

const FALLBACK_OG_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f4f6fb"/>
  <rect x="650" y="82" width="520" height="466" rx="34" fill="#dbeafe"/>
  <text x="68" y="104" fill="#64748b" font-size="18" font-family="system-ui, sans-serif" font-weight="800" letter-spacing="3">SPOKEDU MASTER</text>
  <text x="68" y="260" fill="#0f172a" font-size="52" font-family="system-ui, sans-serif" font-weight="800">체육수업을 찾고,</text>
  <text x="68" y="330" fill="#0f172a" font-size="52" font-family="system-ui, sans-serif" font-weight="800">운영하고,</text>
  <text x="68" y="400" fill="#0f172a" font-size="52" font-family="system-ui, sans-serif" font-weight="800">다음 수업까지 이어갑니다.</text>
  <text x="68" y="510" fill="#64748b" font-size="20" font-family="system-ui, sans-serif">유아·초등 체육 교사·강사를 위한 수업 운영 서비스</text>
</svg>`;
