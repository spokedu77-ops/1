/** Isolated fixture QA: no Next auth override, no Supabase connection, no production mutations. */
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const baseSha = process.env.CENTER_QA_BASE_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const dir = path.join(root, '.tmp/center-settlement-stage1');
await mkdir(dir, { recursive: true });
await writeFile(path.join(dir, 'BeforeDetail.tsx'), execFileSync('git', ['show', `${baseSha}:app/admin/centers/[id]/CenterDetailClient.tsx`], { encoding: 'utf8' }));
const first = {
  id: '11111111-1111-4111-8111-111111111111', name: '테스트 센터', status: 'active', region_tag: '서울',
  address: '서울시 테스트 주소', access_note: '정문으로 출입', contact_name: '테스트 담당자', contact_phone: '000-0000-0000',
  contact_email: 'test@example.test', contact_role: '운영', contract_start: '2026-01-01', contract_end: '2026-12-31', session_fee: 100000,
  main_teacher_id: '33333333-3333-4333-8333-333333333333', main_teacher_2_id: null, main_teacher_3_id: null,
  main_teacher_name: '테스트 강사', main_teacher_2_name: null, main_teacher_3_name: null,
  weekly_schedule: [{ day: 'mon', start: '09:00', end: '10:00', place: '체육관', note: '준비물 확인' }],
  instructors_default: { main: '테스트 강사', sub: null, backup: ['백업 강사'] }, highlights: '테스트 운영 메모',
  criminal_check_facility_id: 'fixture-facility', criminal_check_files: [{ name: '안내.pdf', path: 'fixture/file.pdf' }],
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-10-30T00:00:00Z',
};
const second = { ...first, id: '22222222-2222-4222-8222-222222222222', name: '다른 센터' };
const listKeys = ['id','name','status','region_tag','contact_name','contact_phone','contact_email','contact_role','weekly_schedule','highlights','updated_at','main_teacher_name','main_teacher_2_name','main_teacher_3_name'];
const list = (center) => Object.fromEntries(listKeys.map((key) => [key, center[key]]));
const previousList = (center) => ({ ...center, address: null, access_note: null, contract_start: null, contract_end: null, session_fee: null,
  main_teacher_id: null, main_teacher_2_id: null, main_teacher_3_id: null,
  instructors_default: { main: null, sub: null, backup: [] }, criminal_check_facility_id: null, criminal_check_files: [] });

await writeFile(path.join(dir, 'index.html'), '<html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>');
await writeFile(path.join(dir, 'fixture.css'), `@import "tailwindcss";
@source "../../app/admin/centers";
@source "../../app/admin/master/reports";
html,body{margin:0;font-family:Arial,sans-serif}*{box-sizing:border-box}`);
await writeFile(path.join(dir, 'entry.tsx'), `import React from 'react';
import {createRoot} from 'react-dom/client';
import CentersClient from '/app/admin/centers/CentersClient.tsx';
import {CenterDetailClient} from '/app/admin/centers/[id]/CenterDetailClient.tsx';
import {CenterDetailClient as BeforeDetail} from './BeforeDetail';
import SettlementSheet from '/app/admin/master/reports/SettlementSheet.tsx';
import './fixture.css';
const params=new URLSearchParams(location.search);const id=params.get('detail');
const Screen=id?(params.has('before')?BeforeDetail:CenterDetailClient):null;
function BeforeModal(){const ref=React.useRef(null);React.useEffect(()=>{ref.current.showModal()},[]);return <dialog ref={ref} aria-label="센터 상세정보" className="fixed inset-0 m-0 h-dvh max-h-dvh w-screen max-w-none overflow-hidden border-0 bg-slate-50 p-0 backdrop:bg-slate-900/50 sm:m-auto sm:h-[92dvh] sm:max-h-[92dvh] sm:w-[min(960px,94vw)] sm:rounded-2xl sm:shadow-2xl"><div className="flex h-full flex-col"><div className="flex shrink-0 items-center justify-between border-b bg-white px-4 py-2"><span className="font-semibold text-slate-900">센터 상세정보</span><button className="rounded-full p-3">×</button></div><div className="min-h-0 flex-1 overflow-y-auto"><BeforeDetail id={id}/></div></div></dialog>}
createRoot(document.getElementById('root')!).render(<><div style={{padding:8,background:'#fff7cc'}}>모의 데이터 통합·시각 QA / 실제 관리자 E2E 아님</div>{params.has('sheet')?<SettlementSheet/>:params.has('before')?<><CentersClient initialCenters={${JSON.stringify([list(first), list(second)])}}/><BeforeModal/></>:Screen?<Screen id={id!}/>:<CentersClient initialCenters={${JSON.stringify([list(first), list(second)])}}/>}</>);`);

const actions = ['getCenters','getCenterById','getActiveTeachers','createCenter','updateCenter','deleteCenter','getCenterCriminalCheckPassword',
  'getCenterHistory','addCenterHistoryEntry','updateCenterHistoryEntry','deleteCenterHistoryEntry','createCriminalCheckDownloadUrl','createCriminalCheckUpload','deleteCriminalCheckFile','finalizeCriminalCheckUpload'];
const server = await createServer({
  configFile: false, root: dir, server: { host: '127.0.0.1', port: 4178, strictPort: true, fs: { allow: [root] } },
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { '@': root, '/app': path.join(root, 'app') } },
  css: { postcss: path.join(root, 'postcss.config.mjs') },
  plugins: [{
    name: 'center-fixture-only',
    enforce: 'pre',
    resolveId(source) {
      if (/(?:^|\/)actions\/(centers|center-history|criminal-check-files)$/.test(source)) return '\0fixture-actions';
      if (source === 'next/link') return '\0fixture-link';
      if (source === 'next/dynamic') return '\0fixture-dynamic';
      if (source === 'next/navigation') return '\0fixture-navigation';
    },
    load(id) {
      if (id === '\0fixture-actions') return actions.map((name) => `export async function ${name}(...args){const r=await fetch('/__fixture/actions/${name}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(args)});return r.json();}`).join('\n');
      if (id === '\0fixture-link') return `import React from 'react';export default function Link({prefetch,...props}){return React.createElement('a',props);}`;
      if (id === '\0fixture-dynamic') return `import {lazy} from 'react';export default function dynamic(loader){return lazy(loader);}`;
      if (id === '\0fixture-navigation') return `export function useRouter(){return {push:()=>{},replace:()=>{}}}`;
    },
  }],
});
await server.listen();
const browser = await chromium.launch({ headless: true });
const results = { kind: 'ISOLATED_FIXTURE_NOT_ADMIN_E2E', baseSha,
  productionMetrics: 'NOT_MEASURED', screenshots: [], checks: [], requests: {}, fixturePayload: {
    beforeBytes: Buffer.byteLength(JSON.stringify([previousList(first),previousList(second)])),
    afterBytes: Buffer.byteLength(JSON.stringify([list(first),list(second)])),
  } };
const month = { key: '2026-10', label: '10월 수업료', rev: 'month-r1', locked: true, lockedAt: '2026-10-01', rows: [] };
const policy = { id:'legacy-policy',name:'기존 정산 기관',type:'regular',instr:90000,assist:10000,rental:5000,fee:'',cost:40000,sessions:4,
  vat:'auto',whRate:0,status:'active',note:'정산 보존',ord:1,rates:[],termType:'end',termValue:0,rev:'r1' };
let savedPolicy = { ...policy, name: first.name }; const blankPolicies = ['blank1','blank2'].map(id=>({...policy,id,name:''}));
let delayedPolicies = false;
let savedMonth = null;
const legacyRow = { id:'row-1',kind:'row',name:'',fee:'',cost:'',sessions:'',total:120000,inv:true,rcpt:true,rcptAmt:50000,
  vatMode:'auto',vatManual:0,adj:50,note:'기존 비고',invDate:'2026-10-01',rcptDate:'2026-10-02',whRate:0,centerId:'',dueDate:'',type:'regular' };
let centers = [structuredClone(first), structuredClone(second)];
const context = await browser.newContext();
// Keep this fixture unable to call external services, regardless of imported component behavior.
await context.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  if (url.hostname !== '127.0.0.1') return route.abort();
  if (url.pathname.startsWith('/__fixture/actions/')) {
    const name = url.pathname.split('/').at(-1); const args = route.request().postDataJSON();
    results.requests[name] = (results.requests[name] ?? 0) + 1;
    let body;
    if (name === 'getCenterById') body = centers.find((item) => item.id === args[0]);
    else if (name === 'getCenters') body = centers.filter((item) => !args[0]?.search || item.name.includes(args[0].search)).map(args[0]?.fixtureBefore ? previousList : list);
    else if (name === 'getActiveTeachers') body = [{id:'33333333-3333-4333-8333-333333333333',name:'테스트 강사'}];
    else if (name === 'getCenterHistory') body = [{id:'history-1',center_id:args[0],created_at:first.updated_at,body:'운영 기록',created_by:null}];
    else if (name === 'updateCenter') { centers = centers.map((item) => item.id === args[0] ? {...item,...args[1]} : item); body={data:centers.find((item)=>item.id===args[0])}; }
    else if (name === 'getCenterCriminalCheckPassword') body = {data:'fixture-secret'};
    else body = {};
    return route.fulfill({json:body});
  }
  if (url.pathname === '/api/admin/class-ops/reference') return route.fulfill({json:{teachers:[{id:first.main_teacher_id,name:'테스트 강사',session_count:100,log_count:6,fee_private:null,fee_group:null,fee_center_main:60000,fee_center_assist:null}]}});
  if (url.pathname === '/api/admin/teacher-tier-fees') return route.fulfill({json:{fees:[{tier_id:'gold',fee_private:32000,fee_group:40000,fee_center_main:45000,fee_center_assist:30000}]}});
  if (url.pathname === '/api/admin/settlement-sheet') {
    if (route.request().method() === 'PUT') { const body=route.request().postDataJSON(); if(body.kind==='center-link'){check(body.value.id===savedPolicy.id,'mapping policy identity retained'); savedPolicy={...savedPolicy,...body.value,rev:'r2'};return route.fulfill({json:{revision:'r2'}});} if(body.kind==='month') { if(!delayedPolicies)throw new Error('Unexpected confirmed monthly mutation'); savedMonth=body.value;return route.fulfill({json:{revision:'month-r2',lockedAt:null}}); } savedPolicy={...body.value,rev:'r2'}; return route.fulfill({json:{revision:'r2'}}); }
    results.requests['sheet:'+url.searchParams.get('scope')] = (results.requests['sheet:'+url.searchParams.get('scope')]??0)+1;
    if(delayedPolicies&&url.searchParams.get('scope')==='centers')await new Promise(resolve=>setTimeout(resolve,900));
    const shownMonth=delayedPolicies?{...month,locked:false,lockedAt:null,rows:[legacyRow]}:month;
    return route.fulfill({json:url.searchParams.get('scope')==='centers'?{centers:{[savedPolicy.id]:savedPolicy,...Object.fromEntries(blankPolicies.map(p=>[p.id,p]))}}:{months:{[month.key]:shownMonth},centers:{},settings:{vatMethod:'sheet',year:2026}}});
  }
  if (url.pathname === '/api/admin/settlement-centers') {
    results.requests['operational:'+ (url.searchParams.has('id')?'detail':'search')] = (results.requests['operational:'+ (url.searchParams.has('id')?'detail':'search')]??0)+1;
    return route.fulfill({json:url.searchParams.has('id')?{center:first}:{centers:[{id:first.id,name:first.name,status:first.status,linked:false}]}});
  }
  return route.continue();
});
const page = await context.newPage();
const errors = []; page.on('pageerror', (error) => errors.push(error.message));
const check = (ok, name) => { if (!ok) throw new Error(name); results.checks.push(name); };
const base = 'http://127.0.0.1:4178';
try {
  for (const width of [390,768,1440]) {
    await page.setViewportSize({width,height:1000});
    await page.goto(base+'/?detail='+first.id+'&before=1');
    await page.getByRole('heading',{name:first.name,exact:true}).waitFor();
    await page.screenshot({path:path.join(dir,`before-${width}.png`),fullPage:true});
    results.screenshots.push(`before-${width}.png`);
    await page.goto(base);
    await page.getByRole('link',{name:first.name,exact:true}).filter({visible:true}).click();
    await page.getByRole('heading',{name:first.name,exact:true}).waitFor();
    for (const tab of ['기본정보','수업·금액','정산','운영기록']) {
      await page.getByRole('button',{name:tab,exact:true}).click();
      if(tab==='수업·금액') {await page.getByText(/60,000원/).waitFor();check(await page.getByText(/teacher_tier_fees.fee_center_assist/).count()===1,'DB tier assist reference displayed');}
      if(tab==='정산') {await page.getByRole('heading',{name:/이름 일치 후보/}).waitFor();check(await page.getByRole('heading',{name:/수동 검토 · 이름 공란/}).textContent().then(t=>t.includes('(2)')),'blank names manual review');}
      await page.screenshot({path:path.join(dir,`after-${width}-${['기본정보','수업·금액','정산','운영기록'].indexOf(tab)}.png`),fullPage:true});
      results.screenshots.push(`after-${width}-${['기본정보','수업·금액','정산','운영기록'].indexOf(tab)}.png`);
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`width ${width} ${tab} page overflow contained`);
    }
    await page.getByRole('button',{name:'정산',exact:true}).click();
    await page.getByRole('heading',{name:/이름 일치 후보/}).waitFor();
    const candidate=page.locator('details').filter({hasText:'legacy-policy'});
    await candidate.locator('summary').click();
    page.once('dialog',d=>d.accept());
    await candidate.getByRole('button',{name:'이 센터에 연결 확인'}).click();
    await page.getByRole('heading',{name:'연결된 정산 항목 (1)',exact:true}).waitFor();
    check(savedPolicy.center_id===first.id,'explicit candidate confirmation saves mapping');
    const linked=page.locator('details').filter({hasText:'legacy-policy'});
    await linked.locator('summary').click();
    await linked.getByRole('button',{name:'연결 센터 확인'}).click();
    page.once('dialog',d=>d.accept());await linked.getByRole('button',{name:'연결 해제',exact:true}).click();
    await page.getByRole('heading',{name:'연결된 정산 항목 (0)',exact:true}).waitFor();
    check(savedPolicy.center_id===null,'unlink preserves policy');
    for(const key of ['fee','instr','assist','rental','cost','rates'])check(JSON.stringify(savedPolicy[key])===JSON.stringify(policy[key]),`mapping preserves ${key}`);
    await page.getByRole('button',{name:'수정',exact:true}).click();
    const form=page.locator('dialog form');await form.locator('input').first().fill('수정 센터');
    await form.locator('button[type=submit]').click();
    await page.getByRole('heading',{name:'수정 센터',exact:true}).waitFor();check(true,`width ${width}: original center save`);
    await page.getByRole('button',{name:'센터 상세 닫기'}).click();
    centers=[structuredClone(first),structuredClone(second)]; savedPolicy={...policy,name:first.name};
  }
  check(month.locked&&month.rows.length===0&&savedMonth===null,'monthly original not written');
  check(errors.length===0,'no browser runtime errors');results.status='PASS_FIXTURE_ONLY';
} catch(error) { results.status='FAIL';results.error=error.stack;await page.screenshot({path:path.join(dir,'failure.png'),fullPage:true}).catch(()=>{}); }
finally { await writeFile(path.join(dir,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser.close();await server.close(); }
if(results.status==='FAIL')process.exitCode=1;
