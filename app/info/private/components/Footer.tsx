export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="pl-footer">
      <div className="pl-container pl-footer-content">
        <div className="pl-footer-logo">SPOKEDU</div>
        <div className="pl-footer-info">
          연세대학교 체육교육 전문가 그룹 운영 프리미엄 방문 체육
          <br />
          구청, 보건소 및 프리미엄 호텔 파견 검증 완료 교육 시스템
          <br />
          운영 시간: 평일 10:00 - 18:00 (수업은 주말 협의 가능)
        </div>
        <div className="pl-footer-bottom">&copy; {year} SPOKEDU. All rights reserved.</div>
      </div>
    </footer>
  );
}
