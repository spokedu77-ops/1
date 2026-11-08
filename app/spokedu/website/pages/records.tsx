'use client';

import { useState } from 'react';
import { recordsPage } from '../../data/records-page';
import { legacyRecordCards, type RecordCard } from '@/app/lib/field-records/cards';
import { FIELD_RECORD_CATEGORIES } from '@/app/lib/field-records/contract';
import { Section, CTASection, CaseCard } from '../components/shared';

const recordFilters = [{ id: 'all', label: '전체' }, ...FIELD_RECORD_CATEGORIES];
export default function RecordsPage({ initialRecords = legacyRecordCards() }: { initialRecords?: RecordCard[] } = {}) {
  const [filter, setFilter] = useState('all');
  const records = initialRecords.filter(record => filter === 'all' || record.categories.includes(filter));
  return <main id="main-content" className="website-page">
    <Section tone="web-records-hero"><p className="web-pill">SPOKEDU 현장 기록</p><h1>실제 수업으로 확인하는 SPOKEDU의 체육교육</h1><p className="web-lead">학교와 기관에서 운영한 다양한 체육수업을 통해 교육과정과 지도 방식 그리고 현장에서 관찰한 움직임의 변화를 소개합니다.</p><div className="web-filter-list" role="group" aria-label="사례 분류">{recordFilters.map(item => <button type="button" key={item.id} className={`web-filter${filter === item.id ? ' is-active' : ''}`} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div></Section>
    <Section tone="web-blue-wash"><div className="web-heading-row"><h2>현장 기록 아카이브</h2><p role="status" aria-live="polite">{recordFilters.find(item => item.id === filter)?.label} · {records.length}건</p></div>{records.length ? <div className="web-card-grid">{records.map(record => <CaseCard key={record.slug} record={record} />)}</div> : <div className="web-empty"><h3>공개된 {recordFilters.find(item => item.id === filter)?.label} 사례가 아직 없습니다.</h3><p>다른 분류에서 실제 운영 기록을 확인해 주세요.</p><button className="web-button" type="button" onClick={() => setFilter('all')}>전체 사례 보기</button></div>}</Section>
    <CTASection title={recordsPage.cta.title} description={recordsPage.cta.description} href={recordsPage.cta.href} label={recordsPage.cta.label} />
  </main>;
}
