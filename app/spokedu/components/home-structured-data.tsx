import { seoMeta } from '../data/seo';
import { SPOKEDU_IMAGES } from '../data/images';
import { getSpokeduSiteUrl } from '../lib/site-url';

/** Home OG·검색용 Organization / WebSite */
export function HomeStructuredData() {
  const siteUrl = getSpokeduSiteUrl();
  const homeUrl = `${siteUrl}/spokedu`;
  const heroImage = `${siteUrl}${SPOKEDU_IMAGES.home.hero.src}`;

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${homeUrl}#organization`,
        name: '스포키듀',
        alternateName: ['SPOKEDU', '스포키듀'],
        url: homeUrl,
        logo: heroImage,
        image: heroImage,
        description: seoMeta.home.description,
      },
      {
        '@type': 'WebSite',
        '@id': `${homeUrl}#website`,
        name: '스포키듀 SPOKEDU',
        url: homeUrl,
        publisher: { '@id': `${homeUrl}#organization` },
        inLanguage: 'ko-KR',
      },
      {
        '@type': 'WebPage',
        '@id': `${homeUrl}#webpage`,
        url: homeUrl,
        name: seoMeta.home.title,
        description: seoMeta.home.description,
        isPartOf: { '@id': `${homeUrl}#website` },
        about: { '@id': `${homeUrl}#organization` },
        inLanguage: 'ko-KR',
      },
      {
        '@type': 'Service',
        '@id': `${homeUrl}#service`,
        name: '스포키듀 체육수업 설계',
        provider: { '@id': `${homeUrl}#organization` },
        areaServed: '서울·경기',
        serviceType: ['기관 체육수업', '개인 체육수업', 'SPOMOVE 도입', '체육 커리큘럼'],
        audience: [
          { '@type': 'Audience', audienceType: '기관 담당자' },
          { '@type': 'Audience', audienceType: '학부모' },
        ],
        description: seoMeta.home.description,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
