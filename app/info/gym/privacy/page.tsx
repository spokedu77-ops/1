import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보처리방침 | SPOKEDU LAB',
  description: 'SPOKEDU LAB 상담 신청 개인정보처리방침',
};

export default function GymPrivacyPage() {
  return (
    <main style={{ maxWidth: 840, margin: '0 auto', padding: '40px 20px 80px', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>개인정보처리방침</h1>
      <p style={{ color: '#64748b', marginBottom: 28 }}>최종 업데이트: 2026-04-03</p>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>1. 수집 항목</h2>
        <p>상담 신청 시 보호자 성함, 연락처, 자녀 연령 정보를 수집합니다.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>2. 수집 목적</h2>
        <p>체험 수업 안내 및 상담 응대, 일정 조율을 위해 사용합니다.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>3. 보유 및 이용 기간</h2>
        <p>상담 종료 후 지체 없이 파기합니다. 법령상 보관 의무가 있는 경우 해당 기간 동안만 보관합니다.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>4. 제3자 제공</h2>
        <p>원칙적으로 외부에 제공하지 않으며, 법령에 따른 경우에만 예외적으로 제공될 수 있습니다.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>5. 문의</h2>
        <p>개인정보 관련 문의는 운영 채널 또는 센터 연락처를 통해 접수할 수 있습니다.</p>
      </section>
    </main>
  );
}
