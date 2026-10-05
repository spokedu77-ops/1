/* eslint-disable @next/next/no-img-element -- Brand logo dimensions are governed by the shared site CSS. */
import Link from 'next/link';
import { SPOKEDU_IMAGES } from '../../data/images';
import { publicGlobalCta, publicGlobalNav } from '../../data/site';
import { SPOKEDU_PATHS } from '../../data/public-routes';
import styles from './home-web.module.css';
export function SiteHeader() { return <header className={styles.header}><div className={styles.headerInner}><Link href={SPOKEDU_PATHS.home} className={styles.logo} aria-label="SPOKEDU 홈"><img src={SPOKEDU_IMAGES.brand.logo.src} alt="" /></Link><nav className={styles.desktopNav} aria-label="주요 메뉴">{publicGlobalNav.map(({ label, href }) => <Link key={label} href={href}>{label}</Link>)}</nav><Link href={publicGlobalCta.href} className={styles.inquiry}>{publicGlobalCta.label}</Link><details className={styles.mobileMenu}><summary aria-label="메뉴 열기"><span/><span/><span/></summary><nav aria-label="모바일 주요 메뉴">{publicGlobalNav.map(({ label, href })=><Link key={label} href={href}>{label}</Link>)}<Link href={publicGlobalCta.href}>{publicGlobalCta.label}</Link></nav></details></div></header>; }
