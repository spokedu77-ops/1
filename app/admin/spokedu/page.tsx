'use client';

export default function AdminSpokeduPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>SPOKEDU 홈페이지 확인 (0번)</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>
            0번 전용 미리보기 · 1~4번 기존 안내 페이지는 /admin/info-pages 에서 확인
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a
            href="/admin/info-pages"
            style={{
              padding: '10px 16px',
              borderRadius: 12,
              border: '1px solid #D1D5DB',
              color: '#111827',
              fontWeight: 700,
              fontSize: 13,
              textDecoration: 'none',
              background: '#FFFFFF',
            }}
          >
            1~4 안내 페이지로 이동
          </a>
          <a
            href="/spokedu"
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
      </div>

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
        <iframe
          src="/spokedu"
          title="SPOKEDU 스포키듀 | 아동·청소년 체육교육 전문 단체"
          style={{ width: '100%', height: '100%', border: 'none', minHeight: 600 }}
        />
      </div>
    </div>
  );
}
