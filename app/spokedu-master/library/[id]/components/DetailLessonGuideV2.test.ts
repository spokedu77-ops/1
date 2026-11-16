import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { buildLessonDisplayModel } from '../../../lib/lessonDisplayModel';
import type { LessonDisplayModel } from '../../../lib/lessonDisplayModel';
import { DetailLessonGuideV2 } from './DetailLessonGuideV2';

vi.mock('./DetailLessonGuide', () => ({
  LessonVideo: () => React.createElement('div', { 'data-test-video': true }),
  SetupImage: () => React.createElement('div', { 'data-test-setup': true }),
  splitLessonTitle: (title: string) => ({ koreanTitle: title, englishTitle: null }),
  splitCoachScriptParagraphs: (text: string) => text.split(/\n\n/),
}));

const empty: LessonDisplayModel = {
  id: '198', title: '활동', theme: '', target: '', space: '', participantFormat: '',
  tags: [], functions: [], movements: [], equipment: [], coachScript: '', previewCoachScript: '',
  briefingNotes: [], setupNotes: [], safetyNotes: [], fieldTips: [], activityMethod: [], variationMethod: [],
  quality: {} as ReturnType<typeof buildLessonDisplayModel>['quality'], parentNote: '',
  videoUrl: null, thumbnailUrl: null, heroImageUrl: null, setupImageUrl: null, galleryImageUrls: [],
};
const render = (model: LessonDisplayModel) => renderToStaticMarkup(React.createElement(DetailLessonGuideV2, {
  model, actions: null, video: { autoplay: false, onPlaybackStarted: () => {} }, relatedVideos: [], libraryHref: '/spokedu-lab/library',
}));

describe('V2 content integrity', () => {
  it('uses one quotation unit for a continuous script and preserves paragraph text', () => {
    const html = render({ ...empty, coachScript: '첫 발화입니다.\n\n이어지는 발화입니다.', briefingNotes: ['일반 안전 안내'] });
    expect(html.match(/<q(?:\s|>)/g)).toHaveLength(1);
    expect(html).toContain('첫 발화입니다.');
    expect(html).toContain('이어지는 발화입니다.');
    expect(html).not.toContain('<q>일반 안전 안내');
  });
  it('suppresses added quotation marks when the source already contains outer quotes', () => {
    const html = render({ ...empty, coachScript: '“이미 인용된 발화입니다.”' });
    expect(html).toContain('data-existing-quotes="true"');
    expect(html).toContain('“이미 인용된 발화입니다.”');
  });
  it('keeps variation entries without interpreting the last entry as a separate educational effect', () => {
    const html = render({ ...empty, variationMethod: ['첫 변형 원문', '마지막 변형 원문'] });
    expect(html).toContain('첫 변형 원문');
    expect(html).toContain('마지막 변형 원문');
    expect(html).not.toContain('활동 조절 및 교육적 경험');
    expect(html).not.toContain('<details');
    expect(html).not.toContain('<summary');
  });
  it('omits absent content instead of creating sample controls, numbers or empty cards', () => {
    const html = render(empty);
    expect(html).not.toContain('data-v2-card');
    expect(html).not.toContain('data-v2-related');
    expect(html).not.toMatch(/20~30|FHD|PDF|초등 1~4/);
  });
  it('retains every original method and variation in order, including section markers', () => {
    const methods = ['첫 번째 원문', '두 번째 원문', '마지막 원문'];
    const variations = ['[변형 방법]', '첫 번째 변형 원문', '두 번째 변형 원문'];
    const html = render({ ...empty, activityMethod: methods, variationMethod: variations });
    for (const lines of [methods, variations]) {
      for (let i = 0; i < lines.length; i++) {
        expect(html).toContain(lines[i]);
        if (i) expect(html.indexOf(lines[i])).toBeGreaterThan(html.indexOf(lines[i - 1]));
      }
    }
  });
  it('keeps long scripts, safety and field notes without summarizing or reclassifying them', () => {
    const script = '원본 지도 문장입니다. '.repeat(100) + '\n\n마지막 원문 문단입니다.';
    const html = render({ ...empty, coachScript: script, safetyNotes: ['등록된 안전 원문'], fieldTips: ['등록된 지도 원문'] });
    expect(html).toContain(script.split('\n\n')[0]);
    expect(html).toContain('마지막 원문 문단입니다.');
    expect(html).toContain('등록된 안전 원문');
    expect(html).toContain('등록된 지도 원문');
    expect(html).not.toContain('line-clamp');
  });
});
