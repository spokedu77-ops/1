import { AboutLanding } from '../components/about-landing';
import { LandingPageRoot } from '../components/landing-page-root';
import { ABOUT_V0_HERO } from '../data/about-v0-media';
import { SPOKEDU_PATHS } from '../data/public-routes';
import { buildSpokeduPageMetadata, seoKeywords, seoMeta } from '../data/seo';

const aboutOgImage = {
  url: ABOUT_V0_HERO.src,
  alt: '스포키듀 SPOKEDU — 아동·청소년 체육교육 현장',
  width: 1200,
  height: 630,
};

/** 카카오·메신저 공유용 OG — 구 설명·깨진 썸네일 방지 */
export const metadata = buildSpokeduPageMetadata({
  title: seoMeta.about.title,
  description:
    '연세대 체육교육과 출신 전문가가 만드는 아동·청소년 체육교육 SPOKEDU. 현장 체육교육, SPOMOVE·SPOMAT, SPOKEDU LAB과 스포키듀LAB 본사(서울 강동)를 소개합니다.',
  canonical: SPOKEDU_PATHS.about,
  keywords: [...seoKeywords.about],
  pageKey: 'about',
  ogImage: aboutOgImage,
});

export default function SpokeduAboutPage() {
  return (
    <LandingPageRoot preloadSrc={ABOUT_V0_HERO.src}>
      <AboutLanding />
    </LandingPageRoot>
  );
}
