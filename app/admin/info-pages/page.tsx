'use client';

import { useState } from 'react';

const PAGES = [
  { id: 'gym', label: '체육관 수업', url: '/info/gym', title: 'SPOKEDU 체육관 수업 안내' },
  { id: 'private', label: '과외 수업', url: '/info/private', title: 'SPOKEDU 과외 수업 안내' },
];

export default function InfoPagesAdmin() {
  const [active, setActive] = useState('gym');
  const current = PAGES.find((p) => p.id === active)!;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', gap: 16 }}>
      {/* 상단 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>안내 페이지 확인</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>
            학부모 안내 페이지 미리보기 · 수정은 코드에서 직접 진행
          </p>
        </div>
        <a
          href={current.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '10px 16px',
            borderRadius: 12,
            background: '#C8F34A',
            color: '#0B0F1A',
            fontWeight: 700,
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          새 탭에서 열기 ↗
        </a>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 8 }}>
        {PAGES.map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(p.id)}
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              border: '1px solid',
              borderColor: active === p.id ? '#C8F34A' : 'rgba(255,255,255,.14)',
              background: active === p.id ? 'rgba(200,243,74,.12)' : 'rgba(255,255,255,.03)',
              color: active === p.id ? '#C8F34A' : '#888',
              fontWeight: active === p.id ? 700 : 400,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* iframe 미리보기 */}
      <div
        style={{
          flex: 1,
          height: 'calc(100vh - 220px)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,.12)',
          overflow: 'hidden',
          minHeight: 600,
        }}
      >
        {PAGES.map((p) => (
          <iframe
            key={p.id}
            src={p.url}
            title={p.title}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: active === p.id ? 'block' : 'none',
              minHeight: 600,
            }}
          />
        ))}
      </div>
    </div>
  );
}
