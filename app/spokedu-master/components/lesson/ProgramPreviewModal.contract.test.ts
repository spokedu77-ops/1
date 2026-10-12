import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'app/spokedu-master/components/lesson/ProgramPreviewModal.tsx'), 'utf8');

describe('ProgramPreviewModal responsive preview shell', () => {
  it('uses the detached mobile footer without duplicating the desktop CTA', () => {
    expect(source).toContain('footerVariant="preview-mobile"');
    expect(source).toContain('footer={<div className="hidden lg:block">{footer}</div>}');
  });

  it('splits english subtitles and allows the primary title to wrap to two lines', () => {
    expect(source).toContain('splitLessonCardTitle(model.title)');
    expect(source).toContain('className="line-clamp-2');
    expect(source).toContain('hidden truncate text-[12px]');
  });
});
