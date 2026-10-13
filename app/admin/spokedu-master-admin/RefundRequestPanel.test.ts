import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RefundRequestPanel, type RefundRequestRow } from './RefundRequestPanel';

const row: RefundRequestRow = { id:'refund-1', requestedAt:'2026-10-10T00:00:00.000Z', customer:{userId:'user-1',name:'환불 회원',email:'refund@example.test'}, orderId:'order-1', originalAmount:28900, requestedAmount:10000, refundType:'partial', reason:'부분 환불 요청', status:'under_review', requester:'admin-1', reviewer:'admin-2', reviewNote:'PG 확인 필요', providerEvidence:'unverified', entitlementApplied:true, events:[{id:'event-1',at:'2026-10-10T00:00:00.000Z',type:'created',actor:'admin-1',from:null,to:'received',reason:'부분 환불 요청'}] };

describe('RefundRequestPanel', () => {
  it('renders the schema-pending state without financial action controls', () => {
    const markup=renderToStaticMarkup(createElement(RefundRequestPanel,{availability:'schema_pending',rows:[],total:0,page:1,pageSize:20,onSelectMember:()=>undefined}));
    expect(markup).toContain('집계 준비 중');
    expect(markup).not.toMatch(/환불 실행|승인 실행|PG 취소/);
  });
  it('renders mock request evidence and server-pagination controls without secrets', () => {
    const markup=renderToStaticMarkup(createElement(RefundRequestPanel,{availability:'available',rows:[row],total:21,page:1,pageSize:20,onSelectMember:()=>undefined,query:'refund',status:'under_review',onQueryChange:()=>undefined,onStatusChange:()=>undefined,onPageChange:()=>undefined}));
    expect(markup).toContain('refund@example.test');
    expect(markup).toContain('order-1');
    expect(markup).toContain('10,000원');
    expect(markup).toContain('총 21건');
    expect(markup).toContain('다음');
    expect(markup).not.toMatch(/payment_key|billing_key|service_role|secret/i);
  });
  it('distinguishes an actual empty result from a query failure', () => {
    const empty=renderToStaticMarkup(createElement(RefundRequestPanel,{availability:'available',rows:[],total:0,page:1,pageSize:20,onSelectMember:()=>undefined}));
    const error=renderToStaticMarkup(createElement(RefundRequestPanel,{availability:'error',rows:[],total:0,page:1,pageSize:20,onSelectMember:()=>undefined}));
    expect(empty).toContain('0건');
    expect(empty).not.toContain('불러오지 못했습니다');
    expect(error).toContain('불러오지 못했습니다');
  });
});
