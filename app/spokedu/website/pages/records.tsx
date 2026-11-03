'use client';

import { useState } from 'react';
import { recordsPage, recordFilters, type RecordFilterId } from '../../data/records-page';
import { Section, CTASection, CaseCard } from '../components/shared';

export default function RecordsPage() {
  const [filter, setFilter] = useState<RecordFilterId>('all');
  const records = recordsPage.fieldRecords.filter(record => filter === 'all' || record.filters.includes(filter));
  return <main id="main-content" className="website-page">
    <Section tone="web-records-hero"><p className="web-pill">SPOKEDU · 수업 사례</p><h1>{recordsPage.hero.lines[0]}</h1><p className="web-lead">{recordsPage.hero.subtitle}</p><div className="web-filter-list" role="group" aria-label="사례 분류">{recordFilters.map(item => <button type="button" key={item.id} className={`web-filter${filter === item.id ? ' is-active' : ''}`} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div></Section>
    <Section tone="web-blue-wash"><div className="web-heading-row"><h2>현장 기록 아카이브</h2><p role="status" aria-live="polite">{recordFilters.find(item => item.id === filter)?.label} · {records.length}건</p></div>{records.length ? <div className="web-card-grid">{records.map(record => <CaseCard key={record.slug} record={record} />)}</div> : <div className="web-empty"><h3>공개된 {recordFilters.find(item => item.id === filter)?.label} 사례가 아직 없습니다.</h3><p>다른 분류에서 실제 운영 기록을 확인해 주세요.</p><button className="web-button" type="button" onClick={() => setFilter('all')}>전체 사례 보기</button></div>}</Section>
    <CTASection title={recordsPage.cta.title} description={recordsPage.cta.description} href={recordsPage.cta.href} label={recordsPage.cta.label} />
  </main>;
}
