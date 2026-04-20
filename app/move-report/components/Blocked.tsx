'use client';

interface BlockedProps {
  onHome: () => void;
}

/** 이용 횟수(3회) 초과 시 안내 */
export default function Blocked({ onHome }: BlockedProps) {
  return (
    <div className="page mr-intro-page" style={{ background: '#0D0D0D', minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="anim-rise" style={{ maxWidth: 360, textAlign: 'center' }}>
        <p style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '.12em', color: '#FF4B1F', marginBottom: '12px' }}>이용 안내</p>
        <h1 style={{ fontFamily: 'Black Han Sans,sans-serif', fontSize: 'clamp(22px,6vw,28px)', color: '#fff', lineHeight: 1.35, margin: '0 0 16px', wordBreak: 'keep-all' }}>
          참여 가능 횟수를 모두 사용했어요
        </h1>
        <p style={{ fontSize: '14px', color: '#999', lineHeight: 1.6, margin: '0 0 28px', wordBreak: 'keep-all' }}>
          동일 기기·네트워크 기준으로 MOVE 리포트는 최대 3회까지 이용할 수 있어요. 체육관·단체 행사에서는 안내 받은 링크를 이용해 주세요.
        </p>
        <button
          type="button"
          className="btn-fire"
          onClick={onHome}
          style={{
            width: '100%',
            minHeight: '48px',
            borderRadius: '12px',
            border: '1px solid #333',
            background: '#1A1A1A',
            color: '#E5E5E5',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          처음으로
        </button>
      </div>
    </div>
  );
}
