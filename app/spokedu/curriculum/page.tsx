import type { Metadata } from 'next';
import CurriculumLanding from '../components/curriculum-landing';
import { seoKeywords, seoMeta } from '../data/content';

export const metadata: Metadata = {
  title: seoMeta.curriculum.title,
  description: seoMeta.curriculum.description,
  keywords: [...seoKeywords.curriculum],
  alternates: {
    canonical: '/spokedu/curriculum',
  },
};

export default function SpokeduCurriculumPage() {
  return <CurriculumLanding />;
}
