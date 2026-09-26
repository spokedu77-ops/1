import Link from 'next/link';
import { SPOKEDU_IMAGES } from '../../data/images';
import { SPOKEDU_PATHS } from '../../data/public-routes';
import styles from './home-web.module.css';
const NAV = [['체육수업', SPOKEDU_PATHS.education], ['SPOMOVE', SPOKEDU_PATHS.spomove], ['SPOKEDU MASTER', SPOKEDU_PATHS.subscription], ['수업사례', SPOKEDU_PATHS.records]] as const;
export function SiteHeader() { return <header className={styles.header}><div className={styles.headerInner}><Link href={SPOKEDU_PATHS.home} className={styles.logo} aria-label="SPOKEDU 홈"><img src={SPOKEDU_IMAGES.brand.logo.src} alt="" /></Link><nav className={styles.desktopNav} aria-label="주요 메뉴">{NAV.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}</nav><Link href={SPOKEDU_PATHS.contact} className={styles.inquiry}>문의</Link><details className={styles.mobileMenu}><summary aria-label="메뉴 열기"><span/><span/><span/></summary><nav aria-label="모바일 주요 메뉴">{NAV.map(([label,href])=><Link key={label} href={href}>{label}</Link>)}<Link href={SPOKEDU_PATHS.contact}>문의하기</Link></nav></details></div></header>; }
