/** Isolated fixture QA: no Next auth override, no Supabase connection, no production mutations. */
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const baseSha = process.env.CENTER_QA_BASE_SHA ?? 'a8a93158375d8e664cda1dddd60bc547e749ba71';
const dir = path.join(root, '.tmp/center-optimization-qa');
await mkdir(dir, { recursive: true });
const first = {
  id: '11111111-1111-4111-8111-111111111111', name: '테스트 센터', status: 'active', region_tag: '서울',
  address: '서울시 테스트 주소', access_note: '정문으로 출입', contact_name: '테스트 담당자', contact_phone: '000-0000-0000',
  contact_email: 'test@example.test', contact_role: '운영', contract_start: '2026-01-01', contract_end: '2026-12-31', session_fee: 100000,
  main_teacher_id: 'teacher-1', main_teacher_2_id: null, main_teacher_3_id: null,
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
const beforeSource = execFileSync('git', ['show', `${baseSha}:app/admin/centers/[id]/CenterDetailClient.tsx`], { cwd: root, encoding: 'utf8' });
await writeFile(path.join(dir, 'BeforeDetail.tsx'), beforeSource);
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
createRoot(document.getElementById('root')!).render(<><div style={{padding:8,background:'#fff7cc'}}>모의 데이터 통합·시각 QA / 실제 관리자 E2E 아님</div>{params.has('sheet')?<SettlementSheet/>:Screen?<Screen id={id!}/>:<CentersClient initialCenters={${JSON.stringify([list(first), list(second)])}}/>}</>);`);

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
let savedPolicy = { ...policy };
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
    else if (name === 'getActiveTeachers') body = [{id:'teacher-1',name:'테스트 강사'}];
    else if (name === 'getCenterHistory') body = [{id:'history-1',center_id:args[0],created_at:first.updated_at,body:'운영 기록',created_by:null}];
    else if (name === 'updateCenter') { centers = centers.map((item) => item.id === args[0] ? {...item,...args[1]} : item); body={data:centers.find((item)=>item.id===args[0])}; }
    else if (name === 'getCenterCriminalCheckPassword') body = {data:'fixture-secret'};
    else body = {};
    return route.fulfill({json:body});
  }
  if (url.pathname === '/api/admin/settlement-sheet') {
    if (route.request().method() === 'PUT') { const body=route.request().postDataJSON(); if(body.kind==='month') { if(!delayedPolicies)throw new Error('Unexpected confirmed monthly mutation'); savedMonth=body.value;return route.fulfill({json:{revision:'month-r2',lockedAt:null}}); } savedPolicy={...body.value,rev:'r2'}; return route.fulfill({json:{revision:'r2'}}); }
    results.requests['sheet:'+url.searchParams.get('scope')] = (results.requests['sheet:'+url.searchParams.get('scope')]??0)+1;
    if(delayedPolicies&&url.searchParams.get('scope')==='centers')await new Promise(resolve=>setTimeout(resolve,900));
    const shownMonth=delayedPolicies?{...month,locked:false,lockedAt:null,rows:[legacyRow]}:month;
    return route.fulfill({json:url.searchParams.get('scope')==='centers'?{centers:{[savedPolicy.id]:savedPolicy}}:{months:{[month.key]:shownMonth},centers:{},settings:{vatMethod:'sheet',year:2026}}});
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
  // Compare actual old and new detail components against the same fixture server.
  for (const before of [true, false]) {
    const initial = {...results.requests};
    await page.goto(`${base}/?detail=${first.id}${before?'&before=1':''}`);
    await page.getByRole('heading', {name:first.name,exact:true}).waitFor();
    await page.getByText('운영 기록',{exact:true}).waitFor();
    await page.waitForTimeout(200);
    results[before?'beforeDetailRequests':'afterDetailRequests'] = Object.fromEntries(Object.entries(results.requests).map(([key,value])=>[key,value-(initial[key]??0)]).filter(([,value])=>value));
  }
  results.fixtureResponseBodyBytes = await page.evaluate(async () => {
    const bytes = async (fixtureBefore) => {
      const response = await fetch('/__fixture/actions/getCenters', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify([{fixtureBefore}])});
      return new TextEncoder().encode(await response.text()).byteLength;
    };
    return { before: await bytes(true), after: await bytes(false), scope: 'uncompressed fixture JSON response bodies, not production RSC or total network bytes' };
  });
  for (const width of [375,768,1024,1280,1440]) {
    await page.setViewportSize({width,height:900});
    await page.goto(base);
    await page.getByPlaceholder('센터명, 주소, 담당자 검색').waitFor();
    await page.screenshot({path:path.join(dir,`list-${width}.png`),fullPage:true});
    results.screenshots.push(`list-${width}.png`);
    const beforeOpen = {...results.requests};
    await page.getByRole('link',{name:first.name,exact:true}).filter({visible:true}).click();
    await page.getByRole('dialog',{name:'센터 상세정보'}).waitFor();
    await page.getByRole('heading',{name:first.name,exact:true}).waitFor();
    check((results.requests.getCenterById??0)===(beforeOpen.getCenterById??0)+1,`width ${width}: selected center only`);
    check((results.requests.getActiveTeachers??0)===(beforeOpen.getActiveTeachers??0),`width ${width}: teachers deferred`);
    await page.screenshot({path:path.join(dir,`modal-${width}.png`),fullPage:true});
    results.screenshots.push(`modal-${width}.png`);
    if (width===375) {const box=await page.getByRole('dialog').boundingBox();check(box.width===375&&box.height===900,'mobile full screen');}
    if(width===1280) {
      await page.getByRole('button',{name:'수정',exact:true}).click();
      const form=page.locator('dialog form'); await form.locator('input').first().fill('수정 센터');
      await page.screenshot({path:path.join(dir,'edit-1280.png'),fullPage:true}); results.screenshots.push('edit-1280.png');
      page.once('dialog',dialog=>dialog.dismiss()); await page.keyboard.press('Escape');
      check(await form.isVisible(),'dirty close cancelled');
      await form.locator('button[type=submit]').click();
      await page.getByRole('heading',{name:'수정 센터',exact:true}).waitFor();
      check((results.requests.getActiveTeachers??0)===(beforeOpen.getActiveTeachers??0)+1,'teachers load on edit');
    }
    const listCount=results.requests.getCenters??0;
    await page.getByRole('button',{name:'센터 상세 닫기'}).click();
    check(await page.getByRole('dialog').count()===0,`width ${width}: unmount on close`);
    check((results.requests.getCenters??0)===listCount,`width ${width}: no close list requery`);
    centers=[structuredClone(first),structuredClone(second)];
  }
  await page.goto(base+'/?sheet=1'); await page.getByRole('heading',{name:'수업료 정산'}).waitFor();
  check(!results.requests['sheet:centers'],'no initial policy preload');
  await page.getByRole('button',{name:'센터 · 개인수업 DB',exact:true}).click();
  await page.getByRole('cell',{name:'105,000원',exact:true}).waitFor();
  check(await page.getByLabel('강사료',{exact:true}).inputValue()==='90,000','policy inputs use thousands separators');
  check(await page.getByRole('cell',{name:'105,000원',exact:true}).count()===1,'fee total displays a computed amount rather than its expression');
  await page.getByRole('button',{name:'센터관리 연결',exact:true}).click();
  await page.getByRole('textbox',{name:'센터관리 기관 검색'}).fill('테스트');
  await page.getByRole('button',{name:new RegExp(first.name+' · active')}).click();
  await page.getByRole('button',{name:'최신 정보 확인'}).waitFor();
  check(savedPolicy.center_id===first.id&&savedPolicy.id===policy.id,'operating UUID linked; policy ID retained');
  for(const key of ['instr','assist','rental','fee','cost','sessions']) check(savedPolicy[key]===policy[key],`settlement ${key} preserved`);
  check(month.locked===true&&month.rows.length===0,'confirmed month unchanged');
  const instructorFee = page.getByLabel('강사료', {exact:true});
  await instructorFee.fill('150000'); await instructorFee.blur();
  await page.getByRole('cell',{name:'165,000원',exact:true}).waitFor();
  check(await instructorFee.inputValue()==='150,000','amount edit formats on blur and refreshes total immediately');
  await instructorFee.fill('90000'); await instructorFee.blur();
  for (const width of [375,768,1024,1280,1440]) {
    await page.setViewportSize({width,height:900});
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      document.querySelectorAll('div').forEach((node) => { if (node.scrollWidth > node.clientWidth) node.scrollLeft = 0; });
    });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({path:path.join(dir,`settlement-link-${width}.png`),fullPage:true});results.screenshots.push(`settlement-link-${width}.png`);
    check(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),`width ${width}: sheet overflow contained`);
  }
  delayedPolicies=true;
  await page.goto(base+'/?sheet=1');
  const name=page.locator('input[aria-label="기관명"]');
  await name.fill(policy.name);await name.blur();
  await page.waitForFunction(()=>document.querySelector('input[aria-label$=" 수업료"]')?.value.replace(/,/g,'')==='90000+10000+5000');
  await page.waitForTimeout(900);
  check(Boolean(savedMonth),'delayed policy autofill persists after early blur');
  for(const key of ['total','inv','rcpt','rcptAmt','invDate','rcptDate','adj','note'])check(savedMonth.rows[0][key]===legacyRow[key],`legacy monthly ${key} preserved`);
  check(errors.length===0,'no browser runtime errors');
  results.status='PASS_FIXTURE_ONLY';
} catch(error) { results.status='FAIL';results.error=error.stack;await page.screenshot({path:path.join(dir,'failure.png'),fullPage:true}).catch(()=>{}); }
finally { await writeFile(path.join(dir,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser.close();await server.close(); }
if(results.status==='FAIL')process.exitCode=1;
