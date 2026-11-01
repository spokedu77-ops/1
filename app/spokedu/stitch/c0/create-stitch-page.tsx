import type { Metadata } from 'next';
import manifest from './manifest.json';
import { readStitchC0Body, readStitchTailwindConfigScript } from './read-stitch-body';
import { StitchC0Shell } from './StitchC0Shell';

type PageId = 'home' | 'education' | 'private' | 'spomove' | 'records' | 'about';

export function createStitchC0Page(pageId: PageId) {
  const entry = manifest.pages.find((p) => p.id === pageId);
  if (!entry) throw new Error(`Missing manifest entry: ${pageId}`);

  const title = entry.title;
  const bodyClass = entry.bodyClass;

  function Page() {
    const bodyHtml = readStitchC0Body(pageId);
    const tailwindConfigScript = readStitchTailwindConfigScript();
    return (
      <StitchC0Shell
        bodyHtml={bodyHtml}
        bodyClass={bodyClass}
        tailwindConfigScript={tailwindConfigScript}
      />
    );
  }

  const metadata: Metadata = {
    title,
    description: title,
  };

  return { Page, metadata };
}
