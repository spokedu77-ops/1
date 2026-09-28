import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = (process.argv[2] || 'http://127.0.0.1:3100').replace(/\/$/, '');
const VIEWPORTS = [
  [360,800],[390,844],[430,932],[768,1024],[834,1194],[942,909],[950,800],
  [1023,800],[1024,800],[1025,800],[1199,800],[1200,800],[1201,800],[1440,900],
].map(([width,height]) => ({ width, height }));
const SHOTS = new Set([360,390,430,768,942,1199,1200,1440]);
const CONTENT_SHOTS = new Set([390,942]);
const ownerId = '11111111-1111-4111-8111-111111111111';
const classId = '33333333-3333-4333-8333-333333333333';
const now = new Date();
const iso = now.toISOString();
const programs = [
  ['68','사계절 러닝 (Four Seasons Running Adventure)'],
  ['201','협동 미션 릴레이'],['204','공간 반응 꼬리잡기'],['61','균형과 민첩성 챌린지'],
].map(([id,title], index) => ({ id,title,category:'놀이체육',grade:'초등',space:'실내',description:'함께 움직이며 규칙을 익히는 수업 활동입니다.',steps:['준비','활동'],equipment:['콘'],tags:['협동'],colors:['#0f172a','#2563eb','#10b981','#f59e0b'],isPro:index>0,isNew:index===1,thumbnailUrl:undefined,hasReferenceVideo:false,hasSpomoveConnection:false }));
const students = Array.from({length:7},(_,i)=>({id:`22222222-2222-4222-8222-${String(i+1).padStart(12,'0')}`,legacyId:null,name:`QA 학생 ${i+1}`,meta:{},guidanceNote:null,createdAt:iso,updatedAt:iso}));
const classItem = { id:classId,name:'사계절 러닝 (Four Seasons Running Adventure)',studentIds:students.map(s=>s.id),createdAt:iso,updatedAt:iso };
const session = { id:'44444444-4444-4444-8444-444444444444',classId,className:classItem.name,startAt:new Date(now.getTime()+86400000).toISOString(),endAt:new Date(now.getTime()+90000000).toISOString(),startedAt:null,status:'scheduled',memo:null,completedAt:null,programs:[],attendance:[],createdAt:iso,updatedAt:iso };
const access = { authenticated:true,allowed:true,userId:ownerId,onboardingDone:true,plan:'premium',subscriptionStatus:'active',isAdmin:false,isCenterOrTeam:false,canBrowseLibrary:true,canUseLibrary:true,canUseClassTools:true,canUseAttendance:true,canUseRecords:true,canUseSpomove:true };
const profile = { id:ownerId,name:'QA Teacher',email:'qa@example.test',school:'QA School',avatarColor:'#312e81',plan:'premium',role:'teacher',centerId:null,centerName:null,ageGroups:[],programTypes:[],onboardingDone:true,trialEndsAt:null,createdAt:iso,subscriptionStatus:'active',previousPaidPlan:null,periodEnd:iso };
const store = JSON.stringify({state:{profile,localWorkspaceOwnerId:`id:${ownerId}`,recentActivityOwnerResolved:true,programs,programsLoaded:true,programsError:null,lessons:[],operational:{online:true,lastSyncAt:null,retryQueue:[]},sessions:[session],recentProgramActivities:[],favorites:[],cart:[],notifications:[],lastClassToolByOwner:{[`id:${ownerId}`]:{id:'teams'}}},version:19});
const assert = (condition,message) => { if (!condition) throw new Error(message); };
const family = width => width <= 767 ? 'mobile' : width <= 1199 ? 'tablet' : 'desktop';

async function install(context,page,storeValue=store,operationalData={classes:[classItem],sessions:[session]}){
  await context.addCookies([{name:'spm-qa-auth-bypass',value:'1',url:BASE,sameSite:'Lax'}]);
  await context.addInitScript(value=>localStorage.setItem('spokedu-master-store',value),storeValue);
  await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://*.supabase.co/rest/v1/think_asset_packs**',route=>route.fulfill({status:200,contentType:'application/json',headers:{'content-range':'*/0'},body:'[]'}));
  await page.route('**/api/spokedu-master/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:[]})}));
  await page.route('**/api/spokedu-master/access',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(access)}));
  await page.route('**/api/spokedu-master/profile**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:profile})}));
  await page.route('**/api/spokedu-master/programs**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:programs})}));
  await page.route('**/api/spokedu-master/students**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:students})}));
  await page.route('**/api/spokedu-master/sessions**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:operationalData})}));
}

const browser = await chromium.launch({headless:true});
const results=[];
try {
  fs.mkdirSync('.tmp/f2d-evidence',{recursive:true});
  for (const viewport of VIEWPORTS) {
    const context=await browser.newContext({viewport,serviceWorkers:'block'});
    const page=await context.newPage(); await install(context,page);
    const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(`${m.text()} @ ${m.location().url}`)});
    page.on('requestfailed',request=>errors.push(`${request.failure()?.errorText ?? 'request failed'} @ ${request.url()}`));
    await page.goto(`${BASE}/spokedu-master/dashboard`,{waitUntil:'domcontentloaded'});
    await page.waitForSelector('[data-dashboard-chapter="opening"] h1');
    await page.waitForSelector('[data-dashboard-grid="operational"]');
    await page.waitForTimeout(500);
    const measured=await page.evaluate(async()=>{
      await document.fonts.ready;
      const visible=e=>!!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0;
      const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
      const gridInfo=name=>{const grid=document.querySelector(`[data-dashboard-grid="${name}"]`);const cards=grid?[...grid.children].map(rect):[];const r=grid?rect(grid):null;const style=grid?getComputedStyle(grid):null;return {display:style?.display??null,columns:style?.gridTemplateColumns.split(' ').filter(Boolean).length??0,overflowX:style?.overflowX??null,rect:r,cards,inside:r?cards.every(c=>c.left>=r.left-1&&c.right<=r.right+1):true};};
      const hero=document.querySelector('[data-dashboard-chapter="opening"]');
      const actions=document.querySelector('[data-dashboard-hero-actions="true"]');
      const primary=document.querySelector('[data-dashboard-primary-cta="true"]');
      const secondaries=actions?[...actions.children].slice(1).map(rect):[];
      const operationalHeading=document.querySelector('#continuity-heading');
      const firstOperational=document.querySelector('[data-dashboard-operational-card="true"]');
      const operationalTitles=[...document.querySelectorAll('[data-dashboard-operational-card="true"] h3')].map(e=>({text:e.textContent?.trim()??'',...rect(e),lineHeight:parseFloat(getComputedStyle(e).lineHeight),webkitLineClamp:getComputedStyle(e).webkitLineClamp}));
      const operationalMetas=[...document.querySelectorAll('[data-dashboard-operational-meta="true"]')].map(e=>e.textContent?.trim()??'');
      const operationalCtas=[...document.querySelectorAll('[data-dashboard-operational-cta="true"]')].map(e=>({text:e.textContent?.trim()??'',fontWeight:getComputedStyle(e).fontWeight,minHeight:getComputedStyle(e).minHeight}));
      const tab=document.querySelector('[data-spm-tabbar="true"]'),tablet=document.querySelector('[data-spm-tablet-nav="true"]'),desktop=document.querySelector('[data-spm-desktop-nav="true"]');
      const weeklyHeading=document.querySelector('#weekly-heading');const spomoveHeading=document.querySelector('#spomove-heading');
      const weeklyMedia=[...document.querySelectorAll('[data-dashboard-card="weekly"] [data-weekly-editorial] > button > span > :first-child')].map(rect).filter(item=>item.height>100);
      const spomoveMedia=[...document.querySelectorAll('[data-dashboard-card="spomove"] [data-spm-spomove-media="image-thumb"]')].map(rect);
      const spomoveSection=document.querySelector('[data-dashboard-section="spomove-extension"]');
      const spomoveDescription=spomoveSection?.querySelector('p');
      const dashboard=document.querySelector('[data-dashboard-root="true"]');
      const lastCard=[...document.querySelectorAll('[data-dashboard-card="spomove"]')].at(-1);
      return {fonts:[400,500,600,700,800].map(w=>document.fonts.check(`${w} 16px Paperlogy`)),docOverflow:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth,overlay:!!document.querySelector('[data-nextjs-dialog]'),hero:rect(hero),actions:rect(actions),primary:rect(primary),secondaries,operationalHeading:rect(operationalHeading),weeklyHeading:rect(weeklyHeading),spomoveHeading:rect(spomoveHeading),spomoveDescription:spomoveDescription?rect(spomoveDescription):null,firstOperational:rect(firstOperational),operationalTitles,operationalMetas,operationalCtas,operational:gridInfo('operational'),weekly:gridInfo('weekly'),spomove:gridInfo('spomove'),weeklyMedia,spomoveMedia,bottomClearance:dashboard&&lastCard?dashboard.scrollHeight-(lastCard.getBoundingClientRect().bottom-dashboard.getBoundingClientRect().top+dashboard.scrollTop):null,nav:{tab:visible(tab),tablet:visible(tablet),desktop:visible(desktop)}};
    });
    const f=family(viewport.width);
    assert(errors.length===0,`${viewport.width}: console ${errors.join('|')}`);assert(!measured.overlay,`${viewport.width}: overlay`);assert(measured.fonts.every(Boolean),`${viewport.width}: fonts`);assert(measured.docOverflow<=0,`${viewport.width}: document overflow ${measured.docOverflow}`);
    assert(measured.nav.tab===(f==='mobile')&&measured.nav.tablet===(f==='tablet')&&measured.nav.desktop===(f==='desktop'),`${viewport.width}: nav family`);
    for(const [name,value] of Object.entries({operational:measured.operational,weekly:measured.weekly,spomove:measured.spomove})){assert(value.display==='grid',`${viewport.width}: ${name} not grid`);assert(value.overflowX==='visible',`${viewport.width}: ${name} overflow ${value.overflowX}`);assert(value.inside,`${viewport.width}: ${name} clipped`);}
    const expected={operational:3,weekly:f==='desktop'?4:2,spomove:f==='desktop'?4:2};
    assert(measured.operational.columns===(f==='mobile'?1:expected.operational),`${viewport.width}: operational columns ${measured.operational.columns}`);
    assert(measured.weekly.columns===expected.weekly,`${viewport.width}: weekly columns ${measured.weekly.columns}`);assert(measured.spomove.columns===expected.spomove,`${viewport.width}: spomove columns ${measured.spomove.columns}`);
    assert(measured.operational.cards.length===3,`${viewport.width}: operational count`);assert(measured.weekly.cards.length===4,`${viewport.width}: weekly count`);assert(measured.spomove.cards.length===4,`${viewport.width}: spomove count`);
    assert(measured.operationalTitles.every(item=>!/[가-힣][^\n]*\([^)]*[A-Za-z][^)]*\)$/.test(item.text)),`${viewport.width}: English suffix`);
    assert(measured.operationalTitles.every(item=>item.webkitLineClamp==='2'),`${viewport.width}: operational title clamp`);
    assert(measured.operationalMetas.length===1,`${viewport.width}: operational meta count ${measured.operationalMetas.length}`);
    assert(measured.operationalCtas.length===3&&measured.operationalCtas.every(item=>item.fontWeight==='700'&&parseFloat(item.minHeight)>=44),`${viewport.width}: operational CTA system`);
    assert(!measured.operationalTitles.some(item=>/Four Seasons/.test(item.text)),`${viewport.width}: English title remains`);
    for(const [heading,grid] of [[measured.operationalHeading,measured.operational],[measured.weeklyHeading,measured.weekly],[measured.spomoveHeading,measured.spomove]])assert(Math.abs(heading.left-grid.rect.left)<1.5,`${viewport.width}: heading/grid gutter`);
    assert(measured.spomoveDescription&&measured.spomoveDescription.top>=measured.spomoveHeading.bottom,`${viewport.width}: SPOMOVE description is not below heading row`);
    if(f==='tablet'){
      assert(measured.weeklyMedia.length===4&&measured.weeklyMedia.every(item=>item.height>=175&&item.height<=221),`${viewport.width}: weekly compact media ${measured.weeklyMedia.map(item=>item.height).join(',')}`);
      assert(measured.spomoveMedia.length===4&&measured.spomoveMedia.every(item=>item.height>=175&&item.height<=221),`${viewport.width}: SPOMOVE compact media ${measured.spomoveMedia.map(item=>item.height).join(',')}`);
    }
    if(f==='mobile'){
      assert(Math.abs(measured.primary.width-measured.actions.width)<2,`${viewport.width}: primary not full row`);assert(measured.secondaries.length===2&&Math.abs(measured.secondaries[0].width-measured.secondaries[1].width)<2,`${viewport.width}: secondary geometry`);
      assert(measured.operationalHeading.top<viewport.height,`${viewport.width}: heading below fold`);assert(measured.firstOperational.top<viewport.height,`${viewport.width}: card below fold`);
    }
    if(SHOTS.has(viewport.width))await page.screenshot({path:`.tmp/f2d-evidence/dashboard-${viewport.width}x${viewport.height}.png`,fullPage:true});
    if(CONTENT_SHOTS.has(viewport.width)){
      await page.evaluate(()=>{const main=document.querySelector('main[data-dashboard-root="true"]')??document.querySelector('main');if(!main)return;main.style.height='auto';main.style.overflow='visible';let node=main.parentElement;while(node&&node!==document.body){node.style.height='auto';node.style.minHeight='0';node.style.overflow='visible';node=node.parentElement}document.documentElement.style.height='auto';document.body.style.height='auto';document.body.style.overflow='visible';const tab=document.querySelector('[data-spm-tabbar="true"]');if(tab)tab.style.display='none';});
      await page.waitForTimeout(150);
      await page.screenshot({path:`.tmp/f2d-evidence/dashboard-full-${viewport.width}x${viewport.height}.png`,fullPage:true});
    }
    results.push({viewport,family:f,...measured,errors}); await context.close();
  }
} finally { await browser.close(); }
const edge = Object.fromEntries(results.filter(r=>[1023,1024,1025,1199,1200,1201].includes(r.viewport.width)).map(r=>[r.viewport.width,{family:r.family,operationalColumns:r.operational.columns,weeklyColumns:r.weekly.columns,spomoveColumns:r.spomove.columns}]));
assert(edge[1023].family===edge[1024].family&&edge[1024].family===edge[1025].family,'1024 content family');
assert(edge[1199].family==='tablet'&&edge[1200].family==='desktop'&&edge[1201].family==='desktop','1200 family switch');
fs.writeFileSync('.tmp/f2d-evidence/results.json',JSON.stringify({pass:true,viewports:VIEWPORTS.length,edge,results},null,2));
console.log(JSON.stringify({pass:true,viewports:VIEWPORTS.length,screenshots:SHOTS.size+CONTENT_SHOTS.size,edge},null,2));
