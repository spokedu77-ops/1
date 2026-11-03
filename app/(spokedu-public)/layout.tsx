import type { ReactNode } from 'react';
import { WebsiteChrome } from '../spokedu/components/website-chrome';
import { spokeduMarketingMetadata, SpokeduMarketingTracking } from '../spokedu/components/spokedu-marketing-layout';
import '../spokedu/website/styles/website.css';

export const metadata = spokeduMarketingMetadata;

export default function SpokeduPublicLayout({ children }: { children: ReactNode }) {
  return <WebsiteChrome><SpokeduMarketingTracking />{children}</WebsiteChrome>;
}
