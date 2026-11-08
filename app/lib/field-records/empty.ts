import { FIELD_RECORD_SECTIONS, type RecordContent } from './contract';
export function emptyRecordContent(): RecordContent {
  return { title: '', venue: '', subtitle: '', operationType: '', programLabel: '', summary: '', audience: '', operator: '', period: '', categories: [], keywords: [],
    sections: FIELD_RECORD_SECTIONS.map(section => ({ id: section.id, title: section.label, visible: section.id !== 'observations', blocks: [] })),
    hero: null, gallery: [], imagePublicConfirmed: false, relatedProgram: '/education', ctaTitle: '', programCtaLabel: '관련 교육 알아보기', contactCtaLabel: '수업 상담하기', contactHref: '/contact', seoTitle: '', seoDescription: '', editorialNotes: '', publicationDate: null, requestedFeaturedSlot: null };
}
