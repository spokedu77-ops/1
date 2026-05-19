import type { Metadata } from 'next';
import PrivateLanding from '../components/private-landing';
import { seoKeywords, seoMeta } from '../data/content';

export const metadata: Metadata = {
  title: seoMeta.private.title,
  description: seoMeta.private.description,
  keywords: [...seoKeywords.private],
  alternates: {
    canonical: '/spokedu/private',
  },
};

export default function SpokeduPrivatePage() {
  return <PrivateLanding />;
}
