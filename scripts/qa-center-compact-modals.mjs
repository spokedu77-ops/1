/** Local, isolated populated UI QA. No real authentication or database writes. */
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, '.tmp/center-compact-qa');
await mkdir(dir, { recursive: true });
const center = {
  id: '11111111-1111-4111-8111-111111111111', name: '누리봄 키움센터', status: 'active', region_tag: '서울',
  address: '서울시 강남구 교육로 123 누리봄 키움센터 2층', access_note: '2층 안내데스크 방문',
  contact_name: '이담당', contact_phone: '010-1234-5678 / 02-123-4567', contact_email: 'contact@example.test', contact_role: '담당',
  contract_start: '2026-01-01', contract_end: '2026-12-31', session_fee: 100000,
  main_teacher_id: 'teacher-1', main_teacher_2_id: 'teacher-2', main_teacher_3_id: null,
  main_teacher_name: '김선생', main_teacher_2_name: '이선생', main_teacher_3_name: null,
  weekly_schedule: [{ day: 'fri', start: '18:00', end: '19:00', place: '체육관', note: '' }],
  instructors_default: { main: null, sub: '기존 값 보존', backup: ['대체 강사'], fees: [
    { teacher_id: 'teacher-1', role: 'main', amount: 35000 }, { teacher_id: 'teacher-2', role: 'assist', amount: 25000 },
  ] }, highlights: '실내 운동화 지참', criminal_check_facility_id: 'facility', criminal_check_files: [],
  settlement_defaults: { type: 'regular', sessions: 4, vat: 'auto', whRate: 0, termType: 'end', termValue: 0, projectName: '생활체육 A',
    billingBreakdown: { mainCharge: 60000, assistCharge: 30000, rentalCharge: 10000 } },
  created_at: '2026-01-01', updated_at: '2026-11-02',
};
const initialDisplayName = `${center.name} (생활체육 A)`;
const savedDisplayName = `${center.name} (생활체육 B)`;
const teachers = [
  { id: 'teacher-1', name: '김선생', fee_center_main: 30000, fee_center_assist: 20000 },
  { id: 'teacher-2', name: '이선생', fee_center_main: 30000, fee_center_assist: 20000 },
  { id: 'teacher-3', name: '박선생', fee_center_main: 40000, fee_center_assist: 22000 },
].map((teacher) => ({ ...teacher, role: 'teacher', is_active: true, session_count: 0, log_count: 0 }));
let savedCenter = structuredClone(center);
let savedPatch;
let importedRow;
let monthSourceRows = null;
const createdMonths = [];
let allowMonthCreation = false;
await writeFile(path.join(dir, 'index.html'), '<html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>');
await writeFile(path.join(dir, 'fixture.css'), '@import "tailwindcss";\n@source "../../app/admin/centers";\n@source "../../app/admin/master/reports";\nhtml,body{margin:0;font-family:Arial,sans-serif;background:#e2e8f0}*{box-sizing:border-box}');
await writeFile(path.join(dir, 'entry.tsx'), `import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import CenterDetailModal from '/app/admin/centers/components/CenterDetailModal.tsx';
import CentersClient from '/app/admin/centers/CentersClient.tsx';
import {toCenterListItem} from '/app/lib/centers/listItem.ts';
import SettlementCenterImport from '/app/admin/master/reports/SettlementCenterImport.tsx';
import SettlementSheet from '/app/admin/master/reports/SettlementSheet.tsx';
import './fixture.css';
function App(){const [open,setOpen]=useState(true);const [row,setRow]=useState(null);return location.search.includes('sheet')?<SettlementSheet/>:location.search.includes('list')?<CentersClient initialCenters={${JSON.stringify([center,...['누리봄 키움센터','마포장애인종합사회복지관','반얀트리 키즈클럽','제 2호 동작거점형 키움센터'].map((name,index)=>({...center,name,settlement_defaults:{...center.settlement_defaults,projectName:index===0?'생활체육 B':'생활체육 A'},id:`22222222-2222-4222-8222-22222222222${index}`}))])}.map(toCenterListItem)} embedded/>:location.search.includes('settlement')?<main style={{padding:16,maxWidth:800,margin:'auto',background:'white'}}><SettlementCenterImport monthKey="2026-11" disabled={false} existingIds={[]} onAdd={setRow} expanded/><pre data-saved-row>{JSON.stringify(row)}</pre></main>:<><p style={{padding:12}}>로컬 모의 데이터 · 실제 운영 저장 없음</p>{open&&<CenterDetailModal id="${center.id}" onClose={()=>setOpen(false)} onSaved={()=>{}} onDeleted={()=>setOpen(false)}/>}</>};createRoot(document.getElementById('root')).render(<App/>);`);
const actions = ['getCenters','createCenter','getCenterById','getActiveTeachers','updateCenter','deleteCenter','getCenterCriminalCheckPassword',
  'getCenterHistory','addCenterHistoryEntry','updateCenterHistoryEntry','deleteCenterHistoryEntry',
  'createCriminalCheckDownloadUrl','createCriminalCheckUpload','deleteCriminalCheckFile','finalizeCriminalCheckUpload'];
const server = await createServer({ configFile: false, root: dir,
  server: { host: '127.0.0.1', port: 4179, strictPort: true, fs: { allow: [root] } },
  esbuild: { jsx: 'automatic' }, resolve: { alias: { '@': root, '/app': path.join(root,'app') } },
  css: { postcss: path.join(root,'postcss.config.mjs') },
  plugins: [{ name: 'isolated-center-actions', enforce: 'pre',
    resolveId(source) {
      if (/(?:^|\/)actions\/(centers|center-history|criminal-check-files)$/.test(source)) return '\0actions';
      if (['next/link','next/navigation','next/dynamic'].includes(source)) return '\0'+source;
    },
    load(id) {
      if (id==='\0actions') return actions.map((name)=>`export async function ${name}(...args){return (await fetch('/fixture/${name}',{method:'POST',body:JSON.stringify(args)})).json()}`).join('\n');
      if (id==='\0next/link') return `import React from 'react';export default function Link({prefetch,...props}){return React.createElement('a',props)}`;
      if (id==='\0next/navigation') return 'export function useRouter(){return {push(){}}}';
      if (id==='\0next/dynamic') return "import {lazy} from 'react';export default function dynamic(loader){return lazy(loader)}";
    },
  }],
});
let browser;
const report = { kind: 'LOCAL_FIXTURE_NOT_PRODUCTION_E2E', checks: [], screenshots: [], errors: [] };
const check = (condition, message) => { if (!condition) throw new Error(message); report.checks.push(message); };
try {
  await server.listen(); browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (url.pathname.startsWith('/fixture/')) {
      const name = url.pathname.split('/').at(-1); const args = route.request().postDataJSON();
      let body = {};
      if (name==='getCenterById') body = savedCenter;
      if (name==='getCenters') body = [savedCenter];
      if (name==='getActiveTeachers') body = teachers;
      if (name==='getCenterHistory') body = [{ id:'history-1',body:'운영 기록',created_at:center.updated_at }];
      if (name==='getCenterCriminalCheckPassword') body = { data:'fixture-secret' };
      if (name==='updateCenter') { savedPatch=args[1]; savedCenter={...savedCenter,...savedPatch}; body={data:savedCenter}; }
      return route.fulfill({json:body});
    }
    if (url.pathname==='/api/admin/class-ops/reference') return route.fulfill({json:{teachers}});
    if (url.pathname==='/api/admin/teacher-tier-fees') return route.fulfill({json:{fees:[{tier_id:'T1',fee_center_main:30000,fee_center_assist:20000}]}});
    if (url.pathname==='/api/admin/settlement-sheet') {
      if (route.request().method()==='PUT' && allowMonthCreation) {
        const payload=route.request().postDataJSON();
        if(payload.kind!=='month') throw new Error('Unexpected fixture mutation');
        createdMonths.push(payload.value);
        return route.fulfill({json:{revision:'fixture-created-'+createdMonths.length,lockedAt:null}});
      }
      if (route.request().method() !== 'GET') throw new Error('Read-only monthly fixture');
      return route.fulfill({json:{months:{'2026-11':{key:'2026-11',label:'11월',rev:'fixture-rev',locked:true,lockedAt:'2026-11-01',rows:monthSourceRows ?? (importedRow?[importedRow]:[])}},centers:{},settings:{vatMethod:'sheet',year:2026}}});
    }
    if (url.pathname==='/api/admin/settlement-centers') return route.fulfill({json:{centers:[{
      id:savedCenter.id,name:savedCenter.name+(savedCenter.settlement_defaults.projectName?' ('+savedCenter.settlement_defaults.projectName+')':''),region:'서울',sessionFee:savedCenter.session_fee,
      mainFee:savedCenter.instructors_default.fees.find((fee)=>fee.role==='main')?.amount,
      assistFee:savedCenter.instructors_default.fees.filter((fee)=>fee.role==='assist').reduce((sum,fee)=>sum+fee.amount,0),
      defaults:savedCenter.settlement_defaults,billingBreakdown:savedCenter.settlement_defaults.billingBreakdown ?? null,
    }]}});
    return route.continue();
  });
  const page = await context.newPage(); page.on('pageerror', (error)=>report.errors.push(error.message));
  page.setDefaultNavigationTimeout(60_000);
  const overflow = async () => page.evaluate(() => [...document.querySelectorAll('dialog,dialog *')].filter((el)=>el.getClientRects().length && el.clientWidth>0 && el.scrollWidth>el.clientWidth+1 && !el.classList.contains('sr-only') && !['INPUT','TEXTAREA','SELECT'].includes(el.tagName)).map((el)=>({tag:el.tagName,class:el.className,client:el.clientWidth,scroll:el.scrollWidth})));
  for (const width of [320,375,768,1440]) {
    await page.setViewportSize({width,height:width >= 1024 ? 800 : 900});
    await page.goto('http://127.0.0.1:4179/?list');
    const nameLink=page.getByRole('link',{name:initialDisplayName,exact:true});
    await nameLink.waitFor();
    check(await page.getByRole('link',{name:savedDisplayName,exact:true}).count()===1,`${width}: same center has a distinct second project label`);
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}: center list has no horizontal overflow`);
    const bounds=await nameLink.boundingBox();
    check(bounds.width>=100 && bounds.height>=44,`${width}: center name has a large clickable area`);
    await page.screenshot({path:path.join(dir,`list-${width}.png`)}); report.screenshots.push(`list-${width}.png`);
    await nameLink.click({position:{x:8,y:8}});
    await page.getByRole('dialog',{name:'센터 상세정보'}).waitFor();
    check(true,`${width}: clicking name-area padding opens detail`);
    await page.goto('http://127.0.0.1:4179');
    await page.getByRole('heading',{name:initialDisplayName,exact:true}).waitFor();
    await page.getByRole('heading',{name:'선생님이 받는 강사료',exact:true}).waitFor();
    await page.getByText('35,000원',{exact:true}).waitFor();
    check(await page.getByText('대체 강사',{exact:true}).count()===0,`${width}: legacy backup is not displayed as a role`);
    check((await overflow()).length===0,`${width}: detail has no horizontal overflow`);
    check(await page.locator('dt').filter({hasText:'수업(프로젝트)명'}).evaluate((el)=>getComputedStyle(el).whiteSpace==='nowrap'),`${width}: project label stays on one line`);
    await page.screenshot({path:path.join(dir,`detail-${width}.png`)}); report.screenshots.push(`detail-${width}.png`);
    await page.getByRole('button',{name:'수정',exact:true}).click();
    await page.getByLabel('메인 선생님 수업료',{exact:true}).waitFor();
    await page.getByLabel('보조 선생님 1 수업료',{exact:true}).waitFor();
    check(await page.getByLabel('연락처 1',{exact:true}).inputValue()==='010-1234-5678' && await page.getByLabel('연락처 2',{exact:true}).inputValue()==='02-123-4567',`${width}: existing two phone numbers load separately`);
    check((await overflow()).length===0,`${width}: edit has no horizontal overflow`);
    await page.screenshot({path:path.join(dir,`edit-${width}.png`)}); report.screenshots.push(`edit-${width}.png`);
    const memo = page.locator('[data-center-edit-body] details').filter({ has: page.getByLabel('출입 안내',{exact:true}) });
    check(await memo.evaluate((el)=>!el.open),`${width}: operation notes start collapsed`);
    check(await page.getByLabel('청구 주강사비',{exact:true}).evaluate((el)=>el.getBoundingClientRect().height)>=40,`${width}: readable input height is preserved`);
    await memo.locator('summary').click();
    for (const title of ['정산 추가설정','회보서 관련 정보']) await page.getByText(title,{exact:true}).click();
    check((await overflow()).length===0,`${width}: expanded settings have no horizontal overflow`);
    await page.getByRole('button',{name:'취소',exact:true}).click();
  }
  await page.getByRole('button',{name:'수정',exact:true}).click();
  await page.getByLabel('메인 선생님 수업료',{exact:true}).fill('42000');
  await page.getByLabel('보조 선생님 1 수업료',{exact:true}).fill('27000');
  await page.getByLabel('강사료 인건비 합계',{exact:true}).getByText('69,000원',{exact:true}).waitFor();
  check(await page.getByLabel('회당 수업료 합계',{exact:true}).textContent()==='100,000원','teacher payouts do not change billing');
  await page.getByLabel('청구 주강사비',{exact:true}).fill('70000');
  await page.getByLabel('청구 보조강사비',{exact:true}).fill('35000');
  await page.getByLabel('청구 대여비',{exact:true}).fill('15000');
  check(await page.getByLabel('회당 수업료 합계',{exact:true}).textContent()==='120,000원','three independent billing inputs sum to tuition');
  check(await page.getByLabel('강사료 인건비 합계',{exact:true}).textContent()==='69,000원','billing edits do not change teacher payouts');
  await page.getByRole('button',{name:'+ 보조 강사 추가',exact:true}).click();
  await page.getByLabel('보조 강사 2',{exact:true}).selectOption('teacher-3');
  await page.getByLabel('강사료 인건비 합계',{exact:true}).getByText('91,000원',{exact:true}).waitFor();
  check(await page.getByLabel('회당 수업료 합계',{exact:true}).textContent()==='120,000원','second assistant changes labor only');
  await page.getByLabel('보조 강사 2',{exact:true}).selectOption('');
  await page.getByLabel('강사료 인건비 합계',{exact:true}).getByText('69,000원',{exact:true}).waitFor();
  await page.getByLabel('연락처 2',{exact:true}).fill('02-987-6543');
  await page.locator('[data-center-edit-body] summary').filter({hasText:'운영 메모'}).click();
  await page.getByLabel('수업(프로젝트)명',{exact:true}).fill('생활체육 B');
  await page.getByLabel('수업 시작일',{exact:true}).fill('2026-11-01');
  await page.getByLabel('수업 종료일',{exact:true}).fill('2026-12-18');
  await page.getByLabel('스케줄 1 요일',{exact:true}).selectOption('tue');
  await page.getByLabel('스케줄 1 시작',{exact:true}).fill('17:00');
  await page.getByLabel('스케줄 1 종료',{exact:true}).fill('18:00');
  await page.getByRole('button',{name:'+ 스케줄 추가',exact:true}).click();
  await page.getByLabel('스케줄 2 요일',{exact:true}).waitFor();
  await page.getByRole('button',{name:'스케줄 2 삭제',exact:true}).click();
  check(await page.getByLabel('스케줄 2 요일',{exact:true}).count()===0,'schedule rows can be added and removed');
  const noteHeight=await page.getByLabel('출입 안내',{exact:true}).evaluate((el)=>el.getBoundingClientRect().height);
  check(noteHeight>=112,'access and highlights fields have twice their former height');
  await page.getByRole('button',{name:'저장',exact:true}).click();
  await page.getByText('120,000원',{exact:true}).waitFor();
  check(savedPatch.session_fee===120000,'billing total is saved independently');
  const billing=savedPatch.settlement_defaults.billingBreakdown;
  check(billing.mainCharge===70000 && billing.assistCharge===35000 && billing.rentalCharge===15000,'three billing components are saved separately from payouts');
  const payouts=savedPatch.instructors_default.fees;
  check(payouts.find((fee)=>fee.teacher_id==='teacher-1').amount===42000 && payouts.find((fee)=>fee.teacher_id==='teacher-2').amount===27000,'teacher payouts retain their separate amounts');
  check(savedPatch.contact_phone==='010-1234-5678 / 02-987-6543','both phone numbers are preserved');
  check(!['region_tag','contact_email','contact_role'].some((key)=>key in savedPatch),'removed fields are omitted from update');
  check(savedPatch.settlement_defaults.projectName==='생활체육 B' && savedPatch.contract_start==='2026-11-01' && savedPatch.contract_end==='2026-12-18','project title and class period are saved');
  check(savedPatch.weekly_schedule.length===1 && savedPatch.weekly_schedule[0].day==='tue' && savedPatch.weekly_schedule[0].start==='17:00' && savedPatch.weekly_schedule[0].end==='18:00','edited weekly schedule is saved');
  check(savedCenter.instructors_default.sub===center.instructors_default.sub,'legacy instructor metadata preserved');
  await page.getByRole('button',{name:'수정',exact:true}).click();
  check(await page.getByLabel('수업(프로젝트)명',{exact:true}).inputValue()==='생활체육 B' && await page.getByLabel('수업 시작일',{exact:true}).inputValue()==='2026-11-01' && await page.getByLabel('스케줄 1 시작',{exact:true}).inputValue()==='17:00','project title, period and schedule survive reopen');
  check(await page.getByLabel('청구 주강사비',{exact:true}).inputValue()==='70000' && await page.getByLabel('메인 선생님 수업료',{exact:true}).inputValue()==='42000','billing and payouts remain distinct after reopen');
  await page.getByRole('button',{name:'취소',exact:true}).click();
  await page.goto('http://127.0.0.1:4179/?settlement');
  await page.getByRole('button',{name:savedDisplayName+' · 서울',exact:true}).click();
  check(await page.getByLabel('회당 수업료 합계',{exact:true}).textContent()==='120,000원','settlement fills billing total');
  check(await page.getByLabel('청구 주강사비 / 회',{exact:true}).inputValue()==='70000' && await page.getByLabel('청구 보조강사비 / 회',{exact:true}).inputValue()==='35000' && await page.getByLabel('청구 대여비 / 회',{exact:true}).inputValue()==='15000','settlement imports all three charge components');
  check(await page.getByLabel('메인 선생님 수업료 / 회',{exact:true}).inputValue()==='42000' && await page.getByLabel('보조 선생님 수업료 합계 / 회',{exact:true}).inputValue()==='27000','settlement imports teacher payouts independently');
  check(await page.getByLabel('강사료 인건비 합계',{exact:true}).textContent()==='69,000원','settlement displays separate per-session labor');
  await page.screenshot({path:path.join(dir,'settlement-import-1440.png')}); report.screenshots.push('settlement-import-1440.png');
  await page.getByRole('button',{name:'이 달에 추가'}).click();
  importedRow=JSON.parse(await page.locator('[data-saved-row]').textContent());
  check(importedRow.fee===120000 && importedRow.cost==='69000*회기' && importedRow.sessions===4,'monthly row keeps 120000 revenue and 69000 labor per session');
  await page.goto('http://127.0.0.1:4179/?sheet');
  await page.getByRole('columnheader',{name:'강사료(인건비)',exact:true}).waitFor();
  const salaryCell=page.locator('td[data-label="강사료(인건비)"]');
  await salaryCell.getByText('합계 276,000원',{exact:true}).waitFor();
  check(await page.getByLabel(`${savedDisplayName} 수업료`,{exact:true}).inputValue()==='120,000','actual monthly sheet shows the independent tuition');
  check(true,'actual monthly sheet displays 69000 times four as 276000 labor');
  await page.screenshot({path:path.join(dir,'settlement-sheet-1440.png')}); report.screenshots.push('settlement-sheet-1440.png');
  monthSourceRows = [
    {...importedRow, inv:true,rcpt:true,rcptAmt:480000,total:480000,note:'전월 비고',adj:100,invDate:'2026-11-01',rcptDate:'2026-11-02'},
    {...importedRow,id:'regular-empty-source',type:'regular',name:'금액 미입력 정규수업',fee:'',cost:''},
    {...importedRow,id:'private-source',type:'private',name:'개인수업'},
    {...importedRow,id:'short-source',type:'short',name:'단기수업'},
    {...importedRow,id:'etc-source',type:'etc',name:'기타수업'},
  ];
  const sourceSnapshot=JSON.stringify(monthSourceRows);
  allowMonthCreation=true;
  await page.goto('http://127.0.0.1:4179/?sheet');
  let questionCount=0;
  page.on('dialog',async (dialog)=>{questionCount++;await dialog.dismiss();});
  await page.getByRole('button',{name:'새 달',exact:true}).evaluate((el)=>{el.click();el.click();});
  await page.getByRole('heading',{name:'12월 수업료',exact:true}).waitFor();
  check(questionCount===0,'new month opens without prompts or confirmations');
  check(createdMonths.length===1 && createdMonths[0].key==='2026-12','one click sequence creates only the next month once');
  const carried=createdMonths[0].rows;
  check(carried.length===2 && carried.every((row)=>row.type==='regular'),'new month copies only regular classes, including those awaiting rates');
  check(carried[0].fee===120000 && carried[0].cost==='69000*회기' && carried[0].operationalCenterId===center.id,'regular class rates and center linkage are retained');
  check(carried[0].sessions==='' && carried[0].total==='' && !carried[0].inv && !carried[0].rcpt && carried[0].rcptAmt===null && carried[0].note==='' && carried[0].adj===0,'new month clears monthly counts, receipt and invoice records');
  check(JSON.stringify(monthSourceRows)===sourceSnapshot,'previous confirmed month remains unchanged');
  await page.getByRole('button',{name:'새 달',exact:true}).click();
  await page.getByRole('heading',{name:'1월 수업료',exact:true}).waitFor();
  check(createdMonths[1].key==='2027-01','new month rolls December into the following January');
  allowMonthCreation=false;
  const savedAgreement = savedCenter.settlement_defaults.billingBreakdown;
  delete savedCenter.settlement_defaults.billingBreakdown;
  await page.goto('http://127.0.0.1:4179');
  await page.getByRole('button',{name:'수정',exact:true}).click();
  check(await page.getByLabel('청구 주강사비',{exact:true}).inputValue()==='' && await page.getByLabel('청구 대여비',{exact:true}).inputValue()==='', 'legacy total and teacher payouts are not silently recategorized as billing');
  await page.getByRole('button',{name:'취소',exact:true}).click();
  savedCenter.settlement_defaults.billingBreakdown=savedAgreement;
  check(report.errors.length===0,'no browser runtime errors');
  console.log(JSON.stringify(report,null,2));
} finally {
  await writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2));
  await browser?.close(); await server.close();
}
