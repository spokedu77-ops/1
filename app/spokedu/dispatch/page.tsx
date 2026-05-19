import type { Metadata } from 'next';
import DispatchLanding from '../components/dispatch-landing';
import { seoKeywords, seoMeta } from '../data/content';

export const metadata: Metadata = {
  title: seoMeta.dispatch.title,
  description: seoMeta.dispatch.description,
  keywords: [...seoKeywords.dispatch],
  alternates: {
    canonical: '/spokedu/dispatch',
  },
};

export default function SpokeduDispatchPage() {
  return <DispatchLanding />;
}
