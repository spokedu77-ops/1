#!/usr/bin/env node
/**
 * SPOKEDU photo-first Naver Smart Editor ONE probe.
 * Fresh document ONLY: no existing rich body, no Enter, no Range/caret relocation.
 * Writes no drafts, never publishes, and never closes the browser or existing tabs.
 * The image IS uploaded to Naver if the filechooser succeeds.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { probeChromeProtocol, formatCdpError } from './cdp-health.mjs';
import { deriveSegments, verifyEditorialInput } from './sequential-plan.mjs';
import { loadStyleBlockPlan } from '../naver-new-style-runner.mjs';
import { FINAL_EXPECTED_SHA256, finalMarkdownPath, finalNaverInputJsonPath,
  parseArticleForNaver, sha256Text } from '../naver-article-pipeline.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = resolve(DIR,'../../../reports/naver-new/rich-paste/photo-first-v10');
const ARTICLE_ID = process.argv.find(x => x.startsWith('--article-id='))?.split('=')[1] || '9fad3d9e6f847f36';
const MODE = process.argv.includes('--probe-one-photo') ? 'probe-one-photo' : 'offline';
const URL = 'https://blog.naver.com/PostWriteForm.naver?blogId=spokedu77';
const CDP_URL = process.env.NAVER_CDP_URL || 'http://127.0.0.1:9222';
const PHOTO = {name:'01-cover-paps.jpg', sha256:'4a346f4329b0861aae0fab2a605c1699c693cd18f4ec13396efca86518acbcc1'};
const time0 = performance.now();
const norm = s => String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const token = new Date().toISOString().replace(/[:.]/g,'-');
const report = { schema:'spokedu.photo-first.v10', mode: MODE, articleId:ARTICLE_ID,
  saveDraftExecuted:false, publishExecuted:false, existingTabModified:false,
  photoUploadAttempted:false, outcome:'INIT', stages:[], sourceValidated:false };
let stage='INIT', page, browser;
function fail(code,detail=''){const e = new Error(detail||code);e.code=code;throw e;}
function step(name, details={}) {stage=name;report.stages.push({name,ms:Math.round(performance.now()-time0),...details});}
function blank(s){return !norm(s) || norm(s)==='제목' || /글감과 함께 나의 일상을 기록해보세요/.test(norm(s));}

async function canvasSnapshot(p) {
  return p.evaluate(()=>{
    const c=document.querySelector('.se-canvas');
    if(!c)return {canvas:false,body:[],images:[],componentOrder:[]};
    const norm=s=>String(s||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
    const visible=e=>!!e.getClientRects().length;
    const body=[...c.querySelectorAll('.se-section-text .se-text-paragraph, .se-sectionTitle .se-text-paragraph')]
      .filter(visible).map(p=>norm(p.innerText));
    const components=[...c.querySelectorAll('.se-component')].filter(el=>visible(el)&&!el.parentElement?.closest('.se-component'));
    const componentOrder=components.map(el=> {
      if (el.classList.contains('se-component-image')||el.querySelector('.se-section-image')) return {kind:'image',text:'',imgCount:el.querySelectorAll('img').length};
      if(el.querySelector('.se-section-text, .se-sectionTitle'))return {kind:'text',text:norm(el.innerText).slice(0,120)};
      return {kind:'other',className:String(el.className).slice(0,90)};
    });
    const images=components.filter(x=>x.classList.contains('se-component-image')||x.querySelector('.se-section-image'))
      .map(el=>({imgs:[...el.querySelectorAll('img')].map(im=>({complete:im.complete,naturalWidth:im.naturalWidth,
        currentSrcScheme:(im.currentSrc||im.src||'').split(':')[0],alt:(im.alt||'').slice(0,60)})),
        classes:String(el.className).slice(0,140)}));
    const title=norm(document.querySelector('.se-section-documentTitle .se-text-paragraph')?.innerText);
    return {canvas:true,body,images,componentOrder,title};
  });
}

async function cancelOnlyRecognizedRestorePopup(p) {
  const popup=p.locator('.se-popup-alert-confirm:visible').first();
  if(!await popup.isVisible().catch(()=>false))return false;
  const text=await popup.innerText();
  report.restorePopupText=text.slice(0,350);
  if(!/작성 중|작성하던|작성했던|임시저장|불러오|복원|이어쓰기|이어서 작성|이전.{0,15}글/.test(text))
    fail('UNKNOWN_MODAL_NO_ACTION','Unexpected modal; no click performed');
  const cancel=popup.getByRole('button',{name:'취소',exact:true});
  if(await cancel.count()!==1)fail('RESTORE_CANCEL_AMBIGUOUS');
  await cancel.click({timeout:3000});
  await popup.waitFor({state:'hidden',timeout:3000});
  return true;
}

async function uploadImageFromEmptyEditor(p,imagePath) {
  const button=p.locator('button.se-image-toolbar-button, button[data-name="image"]').first();
  if(!await button.isVisible().catch(()=>false))fail('IMAGE_BUTTON_NOT_VISIBLE');
  // The initial blank paragraph can be clicked safely. Do not press Enter,
  // set a Range, type body text, or attempt to split an existing paragraph.
  const paragraph=p.locator('.se-canvas .se-section-text .se-text-paragraph').first();
  await paragraph.click({timeout:4000});
  const checked=await canvasSnapshot(p);
  if(checked.images.length!==0 || checked.body.filter(v=>!blank(v)).length!==0)
    fail('EMPTY_EDITOR_CHANGED_BEFORE_UPLOAD',JSON.stringify(checked).slice(0,800));
  let fileChooserError=null;
  const waitChooser=p.waitForEvent('filechooser',{timeout:6000}).catch(e=>{fileChooserError=e.message;return null;});
  await button.click({timeout:4000});
  const chooser=await waitChooser;
  report.photoUploadAttempted=true;
  if(chooser){await chooser.setFiles(imagePath);return {method:'filechooser'};}
  // Hidden input fallback only after a user-facing photo-button click.
  const inputs=p.locator('input[type="file"]');
  const n=await inputs.count();
  const acceptable=[];
  for(let i=0;i<n;i++){
    const meta=await inputs.nth(i).evaluate(el=>({accept:el.accept,multiple:el.multiple}));
    if(/image|\.jpg|\.jpeg|\.png/i.test(meta.accept||''))acceptable.push({i,meta});
  }
  if(acceptable.length!==1)fail('PHOTO_FILE_CHOOSER_NOT_RESOLVED',
    `chooser=${String(fileChooserError||'').slice(0,180)}; fileInputs=${n}; imageInputs=${JSON.stringify(acceptable)}`);
  await inputs.nth(acceptable[0].i).setInputFiles(imagePath,{timeout:5000});
  return {method:'image-input',fileIndex:acceptable[0].i};
}

async function enterTitleSafely(p,expected) {
  const title=p.locator('.se-section-documentTitle .se-text-paragraph').first();
  const wrapper=p.locator('.se-title-text').first();
  if(!blank(await title.innerText()))fail('TITLE_NOT_BLANK');
  const attempts=[];
  const variants=[
    {name:'wrapper-insert',target:wrapper,action:()=>p.keyboard.insertText(expected)},
    {name:'wrapper-paste',target:wrapper,action:async()=>{await p.evaluate(t=>navigator.clipboard.writeText(t),expected);await p.keyboard.press('Control+V');}},
    {name:'paragraph-paste',target:title,action:async()=>{await p.evaluate(t=>navigator.clipboard.writeText(t),expected);await p.keyboard.press('Control+V');}}
  ];
  for(const v of variants){
    const attempt={method:v.name};attempts.push(attempt);
    try{await v.target.click({timeout:2500});await v.action();}
    catch(e){attempt.error=String(e.message||e).slice(0,280)}
    const current=norm(await title.innerText().catch(()=>''));
    attempt.after=current.slice(0,120);
    if(current===norm(expected))return attempts;
    const state=await canvasSnapshot(p);
    if(state.body.some(t=>!blank(t)))fail('TITLE_WRITTEN_IN_BODY');
    if(!blank(current))fail('TITLE_PARTIAL',current.slice(0,120));
  }
  fail('TITLE_INPUT_FAILED',JSON.stringify(attempts));
}

try {
  step('SOURCE_VALIDATION');
  if(!/^[0-9a-f]{16}$/i.test(ARTICLE_ID))fail('ARTICLE_ID_INVALID');
  const plan=await loadStyleBlockPlan(ARTICLE_ID);
  const pkg=JSON.parse(await readFile(finalNaverInputJsonPath(ARTICLE_ID),'utf8'));
  const source=(await readFile(pkg.source||finalMarkdownPath(ARTICLE_ID),'utf8')).replace(/\r\n/g,'\n');
  const sha=sha256Text(source);
  if(sha!==FINAL_EXPECTED_SHA256 || pkg.source_sha256!==sha)fail('FINAL_SHA_MISMATCH');
  const parsed=parseArticleForNaver(source);
  verifyEditorialInput(parsed,plan);
  report.segments=deriveSegments(parsed.blocks).map(s=>({after:s.after,photo:s.photo,blocks:s.blocks.length,headings:s.blocks.filter(b=>b.type==='heading').length}));
  report.sourceValidated=true;report.sha256=sha;
  const photoPath=resolve(DIR,'editorial-assets',PHOTO.name);
  const bin=await readFile(photoPath);
  const fileSHA=createHash('sha256').update(bin).digest('hex');
  if(fileSHA!==PHOTO.sha256 || bin[0]!==0xff || bin[1]!==0xd8)fail('COVER_SHA_INVALID');
  report.photo={file:PHOTO.name,bytes:bin.length,sha256:fileSHA};
  if(MODE==='offline'){report.outcome='PHOTO_FIRST_OFFLINE_READY';}
  else {
    step('CDP_PREFLIGHT');
    const state=await probeChromeProtocol(CDP_URL,{httpTimeoutMs:3000,commandTimeoutMs:5000});
    report.cdpPreflight={...state,wsEndpoint:state.wsEndpoint?'present':null};
    if(!state.ok)fail(state.code,formatCdpError(state));
    step('CDP_CONNECT');
    browser=await chromium.connectOverCDP(state.wsEndpoint,{timeout:16000});
    const context=browser.contexts()[0]; if(!context)fail('NO_CDP_BROWSER_CONTEXT');
    step('NEW_TAB');
    page=await context.newPage();
    await page.goto(URL,{waitUntil:'domcontentloaded',timeout:20000});
    if(!page.url().startsWith('https://blog.naver.com/PostWriteForm.naver'))fail('NAVER_LOGIN_REQUIRED');
    await cancelOnlyRecognizedRestorePopup(page);
    await page.locator('.se-canvas .se-section-text .se-text-paragraph').first().waitFor({state:'visible',timeout:8000});
    await cancelOnlyRecognizedRestorePopup(page);
    const initial=await canvasSnapshot(page);
    report.initial={body:initial.body,images:initial.images.length,title:initial.title};
    if(!initial.canvas || initial.images.length || initial.body.some(t=>!blank(t)) || !blank(initial.title))fail('EDITOR_NOT_EMPTY');
    step('TITLE');
    await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:'https://blog.naver.com'});
    report.titleAttempts=await enterTitleSafely(page,plan.title);
    step('BLANK_EDITOR_BEFORE_PHOTO');
    const clean=await canvasSnapshot(page);
    if(clean.images.length!==0 || clean.body.some(t=>!blank(t)))fail('BODY_CHANGED_DURING_TITLE');
    step('PHOTO_UPLOAD');
    report.uploadMethod=await uploadImageFromEmptyEditor(page,photoPath);
    step('PHOTO_VERIFY');
    await page.waitForFunction(()=>{
      const root=document.querySelector('.se-canvas');if(!root)return false;
      const images=[...root.querySelectorAll('.se-component')].filter(el=>!el.parentElement?.closest('.se-component')&&el.getClientRects().length&&
        (el.classList.contains('se-component-image')||el.querySelector('.se-section-image')));
      return images.length===1 && [...images[0].querySelectorAll('img')].some(im=>im.complete && im.naturalWidth>0);
    },null,{timeout:15000,polling:250});
    const post=await canvasSnapshot(page);
    report.afterPhoto={body:post.body,images:post.images,components:post.componentOrder,title:post.title};
    if(post.images.length!==1)fail('PHOTO_COMPONENT_COUNT_INVALID',String(post.images.length));
    if(post.body.some(t=>!blank(t)))fail('PHOTO_CHANGED_BODY',JSON.stringify(post.body).slice(0,400));
    if(norm(post.title)!==norm(plan.title))fail('PHOTO_CHANGED_TITLE');
    // A photo can appear but still be uploading. Record actual image loading state.
    const loaded=post.images[0].imgs.some(im=>im.complete && im.naturalWidth>0);
    if(!loaded)fail('PHOTO_PRESENT_BUT_NOT_LOADED','Image DOM present, but no loaded pixels confirmed.');
    step('COMPLETE');
    report.outcome='PAPS_PHOTO_FIRST_PROBE_PASS';
  }
} catch(e) {
  report.outcome='PAPS_PHOTO_FIRST_ERROR'; report.failedStage=stage;
  report.code=e.code||'UNEXPECTED';report.error=String(e.message||e).slice(0,1700);report.errorStack=String(e.stack||'').slice(0,2800);
} finally {
  if(page&&!page.isClosed()){
    try{const shot=join(REPORT_DIR,`photo-first-${token}.png`);await mkdir(REPORT_DIR,{recursive:true});
      await page.screenshot({path:shot,timeout:4000});report.screenshot=shot;}catch{}
  }
  report.elapsedMs=Math.round(performance.now()-time0);
  const path=join(REPORT_DIR,`photo-first-${token}.json`);
  await mkdir(REPORT_DIR,{recursive:true});
  await writeFile(path,JSON.stringify(report,null,2)+'\n','utf8');
  console.log(JSON.stringify({outcome:report.outcome,reportPath:path,failedStage:report.failedStage??null,
    code:report.code??null,error:report.error??null,sourceValidated:report.sourceValidated,
    photoUploadAttempted:report.photoUploadAttempted,imageCount:report.afterPhoto?.images?.length??null,
    bodyMeaningful:report.afterPhoto?.body?.filter(t=>!blank(t)).length??null,
    elapsedMs:report.elapsedMs,saveDraftExecuted:false,publishExecuted:false},null,2));
  // Do not call browser.close(): this is a shared user's Chrome process.
  process.exit(['PHOTO_FIRST_OFFLINE_READY','PAPS_PHOTO_FIRST_PROBE_PASS'].includes(report.outcome)?0:2);
}
