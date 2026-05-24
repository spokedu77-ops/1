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
        name: 'SPOKEDU',
        alternateName: '스포키듀',
        url: homeUrl,
        logo: heroImage,
        image: heroImage,
        description: seoMeta.home.description,
      },
      {
        '@type': 'WebSite',
        '@id': `${homeUrl}#website`,
        name: 'SPOKEDU',
        url: homeUrl,
        publisher: { '@id': `${homeUrl}#organization` },
        inLanguage: 'ko-KR',
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
