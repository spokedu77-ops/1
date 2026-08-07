import type { ReactNode } from 'react';
import {
  SpokeduMarketingLayout,
  spokeduMarketingMetadata,
} from './components/spokedu-marketing-layout';

export const metadata = spokeduMarketingMetadata;

export default function SpokeduSiteLayout({ children }: { children: ReactNode }) {
  return <SpokeduMarketingLayout>{children}</SpokeduMarketingLayout>;
}
