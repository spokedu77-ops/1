'use client';

interface ShareResultCardProps {
  displayName: string;
  profileName: string;
  catchcopy: string;
  strengths: string[];
  recommendedActivity: string;
  color: string;
}

export default function ShareResultCard({
  displayName,
  profileName,
  catchcopy,
  strengths,
  recommendedActivity,
  color,
}: ShareResultCardProps) {
  return (
    <div
      data-share-card="move-report"
      style={{
        width: 1080,
        minHeight: 1350,
        background: 'linear-gradient(165deg,#0C0C0C,#151515)',
        color: '#fff',
        borderRadius: 40,
        border: '2px solid #2C2C2C',
        padding: '74px 72px',
        fontFamily: 'Noto Sans KR,sans-serif',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -120,
          right: -80,
          width: 460,
          height: 460,
          background: `radial-gradient(circle,${color}66 0%,transparent 70%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -150,
          left: -100,
          width: 440,
          height: 440,
          background: 'radial-gradient(circle,rgba(255,176,32,.18) 0%,transparent 70%)',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 28, letterSpacing: '.08em', color: '#B6B6B6', fontWeight: 700, marginBottom: 22 }}>
          MOVE RESULT CARD
        </div>
        <div style={{ fontSize: 62, fontWeight: 900, lineHeight: 1.15, marginBottom: 18 }}>
          {displayName} 아이는
          <br />
          <span style={{ color }}>{profileName}</span>
        </div>
        <div
          style={{
            fontSize: 34,
            lineHeight: 1.5,
            color: '#EAEAEA',
            background: 'rgba(255,255,255,.04)',
            border: '1px solid #2B2B2B',
            borderLeft: `8px solid ${color}`,
            borderRadius: 24,
            padding: '28px 30px',
            marginBottom: 34,
            wordBreak: 'keep-all',
          }}
        >
          &quot;{catchcopy}&quot;
        </div>

        <div style={{ fontSize: 30, fontWeight: 800, marginBottom: 16 }}>강점 2가지</div>
        <div style={{ display: 'grid', gap: 12, marginBottom: 28 }}>
          {strengths.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                fontSize: 29,
                lineHeight: 1.45,
                color: '#DDD',
              }}
            >
              <span style={{ color, fontWeight: 900, lineHeight: 1.4 }}>•</span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            borderRadius: 24,
            border: `1px solid ${color}66`,
            background: `${color}1F`,
            padding: '26px 28px',
            marginBottom: 42,
          }}
        >
          <div style={{ fontSize: 26, color, fontWeight: 900, marginBottom: 10 }}>추천 활동 1가지</div>
          <div style={{ fontSize: 31, lineHeight: 1.45, color: '#F4F4F4', fontWeight: 700 }}>{recommendedActivity}</div>
        </div>

        <div style={{ borderTop: '1px solid #2B2B2B', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 24, color: '#8E8E8E', fontWeight: 600 }}>우리 아이 움직임 유형 요약 카드</div>
          <div style={{ fontSize: 34, color: '#FF4B1F', fontWeight: 900, letterSpacing: '.04em' }}>SPOKEDU</div>
        </div>
      </div>
    </div>
  );
}
