export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="pl-footer">
      <div className="pl-container pl-footer-content">
        <div className="pl-footer-logo">SPOKEDU</div>
        <div className="pl-footer-info">
          연세대학교 체육교육 전문가 그룹 운영 프리미엄 방문 체육
        </div>
        <div className="pl-footer-bottom">&copy; {year} SPOKEDU. All rights reserved.</div>
      </div>
    </footer>
  );
}
