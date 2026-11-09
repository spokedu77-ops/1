import Link from 'next/link';
import { BrandLogo } from '../../components/brand-logo';
import { brandProfile, brandContactLinks, brandChannels, getPublicFooterLegalLine, isChannelLive } from '../../data/brand';
import { SPOKEDU_PATHS as paths } from '../../data/public-routes';

/** The approved HOME footer uses official brand data and existing destinations. */
export function HomeFooter() {
  return <footer data-spokedu-global-footer="true" className="home-v2-footer">
    <div className="home-v2-footer-inner">
      <div className="home-v2-footer-grid">
        <div className="home-v2-footer-brand"><BrandLogo onDark /><p>아이와 현장의 조건에 맞춰 움직이고 싶게 만드는 체육수업을 설계합니다. 학교·기관부터 개인·소그룹, 특수체육까지 함께하는 체육교육.</p><div className="home-v2-socials">{brandChannels.filter(isChannelLive).map(channel => <a key={channel.key} href={channel.href} target="_blank" rel="noopener noreferrer" data-track={`external-${channel.key}`} data-track-label={`footer-${channel.key}`}>{channel.label}</a>)}</div></div>
        <div><h2>교육 프로그램</h2><ul><li><Link href={paths.education}>기관·학교 체육교육</Link></li><li><Link href={paths.private}>개인·소그룹 수업</Link></li><li><Link href={paths.spomove}>SPOMOVE 움직임 교육</Link></li></ul></div>
        <div><h2>연구 및 플랫폼</h2><ul><li><Link href={paths.subscription}>SPOKEDU LAB</Link></li><li><Link href={paths.records}>현장 수업 사례</Link></li><li><Link href={paths.about}>SPOKEDU 소개</Link></li></ul></div>
        <div><h2>고객지원</h2><ul><li><Link href={paths.contact}>수업 상담하기</Link></li><li><a id="footer-email-link" href={brandContactLinks.email} data-track="cta-email" data-track-label="footer-email">{brandProfile.email}</a></li><li><a id="footer-phone-link" href={brandContactLinks.phone} data-track="cta-phone" data-track-label="footer-phone">{brandProfile.phone}</a></li></ul></div>
      </div>
      <div className="home-v2-footer-legal"><p>{getPublicFooterLegalLine()}</p><div><p>© {new Date().getFullYear()} {brandProfile.nameEn}. All rights reserved.</p><nav aria-label="법적 정보"><Link href="/spokedu-lab/privacy">개인정보처리방침</Link><Link href="/spokedu-lab/terms">SPOKEDU LAB 이용약관</Link></nav></div></div>
    </div>
  </footer>;
}