#!/usr/bin/env node
/**
 * SPOKEDU Cheongdam Editorial: proven photo-first workflow adapted for three verified diary photographs plus a designed consultation banner.
 * Minimal v13 paste workflow plus a layout boundary fix for heading style inheritance.
 * Fresh document ONLY: photo first, then a Naver-owned blank paragraph after it.
 * No Enter, no DOM Range/caret relocation and no existing-text edits.
 * Each subsequent image is inserted at the editor caret left by the validated paste;
 * all preceding text blocks, photo modules, and heading formatting are verified at every stage.
 * Writes no drafts, never publishes, and never closes the browser or existing tabs.
 * The image IS uploaded to Naver if the filechooser succeeds.
 */
import { readFile, mkdir, writeFile, open, stat } from 'node:fs/promises';
import { mkdirSync, appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { probeChromeProtocol, formatCdpError } from './cdp-health.mjs';
import { buildExplicitEditorialHtml, verifyExplicitEditorialHtml } from './editorial-html.mjs';
import {buildNativeEditorialPlan,enhanceNativeHeadings,enhanceNativeCaptions,judgeNativeEditorial,readNativeEditorialSnapshot} from './native-editorial.mjs';
import { enterTitleWithRecovery } from './title-input.mjs';
import { ensureTitleOverlayClear } from './title-overlay-gate.mjs';
import { openEditorInNewTab } from './editor-entry-recovery.mjs';
import {inspectSequentialCanvas,findNativeTailAnchor,gateNextImage} from './photo-sequential-core.mjs';
import { deriveSegments, validateArticle } from './sequential-plan.mjs';
import { parseArticleForNaver, sha256Text } from '../../naver-article-pipeline.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT=resolve(DIR,'../../../..');
const REPORT_DIR = resolve(REPO_ROOT,'reports/naver-new/rich-paste/spokedu-oneclick-editorial-rc5');
const allowed=new Set(['--check','--preview','--smoke','--article','--new-preview','--example']);
const argv=process.argv.slice(2);
for(let i=0;i<argv.length;i++){
 if(!allowed.has(argv[i]))throw new Error(`UNKNOWN_ARGUMENT: ${argv[i]}`);
 if(argv[i]==='--article'&&(!argv[i+1]||argv[i+1].startsWith('--')))throw new Error('ARTICLE_PATH_REQUIRED');
 if(argv[i]==='--article')i++;
}
const modes=argv.filter(x=>['--check','--preview','--smoke'].includes(x));
if(modes.length!==1)throw new Error('ONE_MODE_REQUIRED: --check | --preview | --smoke');
const MODE=modes[0].slice(2);
const RUN_ID=/^[0-9A-Za-z._-]{4,80}$/.test(process.env.SPOKEDU_NAVER_RUN_ID || '')
  ? process.env.SPOKEDU_NAVER_RUN_ID : null;
if(!argv.includes('--article')&&!argv.includes('--example'))throw new Error('ARTICLE_NOT_SELECTED: pass --article DIR or --example');
if(argv.includes('--article')&&argv.includes('--example'))throw new Error('ARTICLE_SELECTION_CONFLICT');
const ARTICLE_DIR=argv.includes('--article')?resolve(argv[argv.indexOf('--article')+1]):resolve(DIR,'example-article');
const URL = 'https://blog.naver.com/PostWriteForm.naver?blogId=spokedu77';
const CDP_URL = process.env.NAVER_CDP_URL || 'http://127.0.0.1:9222';
let articleKey='', PHOTOS=[], PHOTO_AFTER=[],manifest,prepared=[],parsed, sourceSHA='', chromium, getHtmlClipboardScript, applyLeftAlignIfNeeded, applyTextFormat;
const time0 = performance.now();
const norm = s => String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const token = new Date().toISOString().replace(/[:.]/g,'-');
const stageJournal = join(REPORT_DIR, `stage-events-${token}.jsonl`);
const report = { schema:'spokedu.photo-sequential.unified.v1', mode: MODE, runId:RUN_ID, articleKey:null,
  saveDraftExecuted:false, publishExecuted:false, existingTabModified:false,
  photoUploadAttempted:false, outcome:'INIT', stages:[], sourceValidated:false };
let stage='INIT', page, browser;
function fail(code,detail=''){const e = new Error(detail||code);e.code=code;throw e;}
function checkpoint(event, payload={}) {
  // Synchronous, durable checkpoint even while browser automation awaits.
  // The journal is not proof of successful content insertion or publication.
  mkdirSync(REPORT_DIR,{recursive:true});
  appendFileSync(stageJournal, JSON.stringify({at:new Date().toISOString(),mode:MODE,runId:RUN_ID,
    articleKey:report.articleKey,event,stage,ms:Math.round(performance.now()-time0),
    contentStarted:report.contentStarted===true,photoUploadAttempted:report.photoUploadAttempted===true,
    ...payload})+'\n','utf8');
  console.log(`[STAGE] ${stage}: ${event}`);
}
function step(name, details={}) {
  stage=name;
  report.stages.push({name,ms:Math.round(performance.now()-time0),...details});
  checkpoint('ENTER');
}
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

/** Read-only snapshot of ALL visible top-level editor components.
 * bodyLocatorIndex matches the selector used for clicking after verification.
 */
async function detailedCanvasSnapshot(p) {
  return p.evaluate(() => {
    const root=document.querySelector('.se-canvas');
    if(!root)return {canvas:false,components:[],images:[],paragraphs:[],title:''};
    const norm=s=>String(s||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
    const visible=e=>e.getClientRects().length>0;
    const top=[...root.querySelectorAll('.se-component')].filter(e=>
      visible(e) && !e.parentElement?.closest('.se-component'));
    const type=el=>el.classList.contains('se-component-image') || el.querySelector('.se-section-image')?'image':
      el.querySelector('.se-section-text, .se-sectionTitle')?'text':'other';
    const components=top.map(el=>({kind:type(el),className:String(el.className||'').slice(0,160)}));
    const ownTop=node=>{
      let el=node.closest('.se-component');
      while(el?.parentElement?.closest('.se-component'))el=el.parentElement.closest('.se-component');
      return el;
    };
    const bodyLocators=[...root.querySelectorAll('.se-section-text .se-text-paragraph')];
    const paras=[...new Set([...bodyLocators,...root.querySelectorAll('.se-sectionTitle .se-text-paragraph')])].filter(visible);
    const paragraphs=paras.map(node=>{
      const text=norm(node.innerText);
      const leaves=[];
      const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
      let leaf;
      while((leaf=walker.nextNode())){
        if(!norm(leaf.textContent))continue;
        const el=leaf.parentElement;
        const css=getComputedStyle(el);
        leaves.push({text:leaf.textContent.slice(0,80),weight:css.fontWeight,fontSize:css.fontSize,
          boldTag:!!el.closest('b,strong')});
      }
      const ci=top.indexOf(ownTop(node));
      return {kind:ci>=0?type(top[ci]):'unknown',componentIndex:ci,
        bodyLocatorIndex:bodyLocators.indexOf(node),text,
        align:getComputedStyle(node).textAlign,fullBold:leaves.length>0&&leaves.every(x=>x.boldTag||Number.parseFloat(x.weight)>=600),
        fontSizes:[...new Set(leaves.map(x=>x.fontSize))],
        fontWeights:[...new Set(leaves.map(x=>x.boldTag?700:Number.parseFloat(x.weight)||400))],
        className:String(node.className||'').slice(0,160)};
    });
    const images=top.filter(el=>type(el)==='image').map(el=>{
      const imgs=[...el.querySelectorAll('img')];
      return {loaded:imgs.some(im=>im.complete&&im.naturalWidth>0),count:imgs.length};
    });
    return {canvas:true,components,paragraphs,images,
      title:norm(document.querySelector('.se-section-documentTitle .se-text-paragraph')?.innerText)};
  });
}

function forceLeftAlign(html){
  return html.replace(/<(p|h[1-6])(\s[^<>]*?)?>/gi,(whole,tag,attributes='')=>{
    if(/\bstyle\s*=\s*(["'])/i.test(attributes)){
      const next=attributes.replace(/\bstyle\s*=\s*(["'])(.*?)\1/i,(_,quote,css)=>
        `style=${quote}${css.replace(/(?:^|;)\s*text-align\s*:[^;]*/gi,'')};text-align:left !important;${quote}`);
      return `<${tag}${next}>`;
    }
    return `<${tag}${attributes} style="text-align:left !important;">`;
  });
}

async function pasteSegmentAfterLastPhoto(p,previousBlocks,segment,html,expectedTitle,imageCount){
  const pre=await detailedCanvasSnapshot(p);
  const anchor=findNativeTailAnchor(pre,expectedTitle,previousBlocks,imageCount,PHOTO_AFTER);
  report.segmentAnchors.push({photoCount:imageCount,pre:anchor});
  const para=p.locator('.se-canvas .se-section-text .se-text-paragraph').nth(anchor.bodyLocatorIndex);
  try{
    const applied=await applyLeftAlignIfNeeded(p,{paragraphIndex:anchor.bodyLocatorIndex});
    report.alignmentSteps.push({photoCount:imageCount,applied});
  }catch(e){fail('POST_PHOTO_ALIGN_SETUP_FAILED',String(e.message||e).slice(0,350));}
  const afterAlign=await detailedCanvasSnapshot(p);
  const ready=findNativeTailAnchor(afterAlign,expectedTitle,previousBlocks,imageCount,PHOTO_AFTER);
  if(ready.bodyLocatorIndex!==anchor.bodyLocatorIndex||ready.componentIndex!==anchor.componentIndex)
    fail('POST_PHOTO_ANCHOR_CHANGED_ON_ALIGN');
  // Proven v13 flow: prepare clipboard, click the Naver-owned empty tail,
  // paste once. No font toolbar mutations that can disturb selection.
  // Layout puts one NORMAL paragraph after each chapter heading and BEFORE
  // the next image, so Smart Editor should inherit body rather than heading.
  await p.evaluate(getHtmlClipboardScript(html));
  await para.click({timeout:4000});
  const clicked=await detailedCanvasSnapshot(p);
  const anchorAtClick=findNativeTailAnchor(clicked,expectedTitle,previousBlocks,imageCount,PHOTO_AFTER);
  if(anchorAtClick.bodyLocatorIndex!==anchor.bodyLocatorIndex)
    fail('BODY_ANCHOR_CHANGED_ON_CLICK');
  await p.keyboard.press('Control+V');
  await p.waitForTimeout(600);
  const after=await detailedCanvasSnapshot(p);
  report.lastFullCanvas=after;
  const total=[...previousBlocks,...segment];
  return inspectSequentialCanvas(after,expectedTitle,total,imageCount,PHOTO_AFTER);
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


/**
 * Insert the second image at the EXISTING editor selection that remains
 * after the first Rich HTML paste. We never click a text paragraph, press
 * Enter, move the caret, or select/range existing text.
 */
async function uploadNextImageAtPasteTail(p,imagePath,expectedTitle,blocks,imageCount){
  const pre=await detailedCanvasSnapshot(p);
  const gate=gateNextImage(pre,expectedTitle,blocks,imageCount,PHOTO_AFTER);
  report.photoGates.push(gate);
  // Diagnostic only: do not attempt cursor repair. V12 confirmed this workflow.
  report.caretDiagnostics.push(await p.evaluate(()=>{
    const active=document.activeElement;
    const detail={topActiveTag:active?.tagName||null,topActiveClass:String(active?.className||'').slice(0,80)};
    try {if(active?.tagName==='IFRAME'&&active.contentDocument){const selection=active.contentDocument.getSelection();
      detail.selectionCollapsed=selection?.isCollapsed??null;detail.selectionTextLength=selection?.toString().length??null;}}
    catch {detail.unavailable=true;}
    return detail;
  }));
  const button=p.locator('button.se-image-toolbar-button, button[data-name="image"]').first();
  if(!await button.isVisible().catch(()=>false))fail('NEXT_PHOTO_BUTTON_NOT_VISIBLE');
  let chooserError='';
  const chooserPromise=p.waitForEvent('filechooser',{timeout:6000}).catch(e=>{chooserError=String(e.message||e).slice(0,200);return null;});
  await button.click({timeout:4000});
  const chooser=await chooserPromise;
  report.photoUploadAttempted=true;
  report.photoUploadAttempts.push({index:imageCount+1,file:imagePath,chooserFound:!!chooser});
  if(chooser){await chooser.setFiles(imagePath);return {method:'filechooser'};}
  const inputs=p.locator('input[type="file"]');
  const acceptable=[];
  for(let i=0;i<await inputs.count();i++){
    const accept=await inputs.nth(i).evaluate(el=>el.accept||'');
    if(/image|\.jpg|\.jpeg|\.png/i.test(accept))acceptable.push(i);
  }
  if(acceptable.length!==1)fail('NEXT_PHOTO_CHOOSER_AMBIGUOUS',
    `chooser=${chooserError}, candidates=${JSON.stringify(acceptable)}`);
  await inputs.nth(acceptable[0]).setInputFiles(imagePath,{timeout:5000});
  return {method:'image-input',index:acceptable[0]};
}

function lastOverlaySummary(r){
  const gates=r.titleOverlayGates||[];
  const last=gates.at(-1);
  if(!last)return null;
  const observations=last.records||last.diagnostics?.records||[];
  const latest=observations.at(-1)||{};
  return {phase:last.phase,ready:last.ok===true,cancelCount:last.cancelCount??last.diagnostics?.cancelCount??0,
    lastVerdict:latest.verdict??null,dimCount:latest.dimCount??null,
    dialogs:(latest.dialogs||[]).map(d=>({kind:d.kind,text:d.text?.slice(0,160),buttons:d.buttons}))};
}

async function enterTitleSafely(p,expected){
  return enterTitleWithRecovery(p,expected,{snapshot:canvasSnapshot,abort:fail,
    beforeTitleClick:phase=>ensureTitleOverlayClear(p,{report,phase})});
}

try {
  step('SOURCE_VALIDATION');
  manifest=JSON.parse(await readFile(resolve(ARTICLE_DIR,'manifest.json'),'utf8'));
  articleKey=manifest.articleKey;
  report.articleKey=articleKey;
  if(manifest.publicationAllowed!==false||manifest.draftSaveAllowed!==false)fail('MANIFEST_SAFETY_CHECK_FAILED');
  const source=(await readFile(resolve(ARTICLE_DIR,'ARTICLE_FOR_NAVER.md'),'utf8')).replace(/\r\n/g,'\n');
  if(manifest.localLlmSourceUsed===true && !String(manifest.contentOrigin||'').includes('local'))fail('LOCAL_LLM_PROVENANCE_MISSING');
  sourceSHA=sha256Text(source);
  if(sourceSHA!==manifest.source_sha256)fail('SOURCE_SHA_MISMATCH');
  parsed=parseArticleForNaver(source);
  const validation=validateArticle(parsed,manifest);
  const plan={title:parsed.title,paragraphs:parsed.paragraphsForEditor};
  PHOTO_AFTER=manifest.photoAfter;
  PHOTOS=manifest.photos;
  const segments=validation.segments;
  if(manifest.editorialHighlights!==undefined){
    if(!Array.isArray(manifest.editorialHighlights)||manifest.editorialHighlights.some(t=>typeof t!=='string'||t.length<6||t.length>160)||manifest.editorialHighlights.length>8)
      fail('EDITORIAL_HIGHLIGHT_DECLARATION_INVALID');
    for(const fragment of manifest.editorialHighlights){
      if(parsed.blocks.filter(b=>b.type==='paragraph'&&b.text.includes(fragment)).length!==1)
        fail('EDITORIAL_HIGHLIGHT_SOURCE_MISMATCH',fragment.slice(0,60));
    }
  }
  const nativePlan=buildNativeEditorialPlan(parsed,manifest);
  report.nativeEditorialPlan={version:nativePlan.version,headings:nativePlan.headings.length,captions:nativePlan.captions.filter(x=>!x.isGraphic).length,photoComposite:'UNCHANGED_ORIGINALS'};
  report.segments=segments.map(s=>({after:s.after,photo:s.photo,from:s.from,to:s.to,blocks:s.blocks.length,
    headings:s.blocks.filter(b=>b.type==='heading').length}));
  report.sourceValidated=true;report.fileIntegrityPass=true;report.factualReviewApproved=manifest.factualReviewApproved===true;report.localLlmSourceUsed=manifest.localLlmSourceUsed===true;report.visualReviewRequired=true;report.sha256=sourceSHA;report.title=plan.title;
  // Never finish a segment on a heading; that is the observed Bold leakage source.
  for(let i=0;i<segments.length-1;i++){
    if(segments[i].blocks.at(-1).type!=='paragraph')fail('HEADING_AT_PHOTO_BOUNDARY',String(i));
  }
  prepared=[];
  for(let i=0;i<segments.length;i++){
    const photo=PHOTOS[i];
    if(segments[i].photo!==photo.name)fail('PHOTO_SEQUENCE_PLAN_CHANGED');
    const path=resolve(ARTICLE_DIR,'editorial-assets',photo.name);
    const bytes=await readFile(path);
    const digest=createHash('sha256').update(bytes).digest('hex');
    if(digest!==photo.sha256||!(bytes[0]===0xff&&bytes[1]===0xd8||bytes[0]===0x89&&bytes[1]===0x50))
      fail('IMAGE_FILE_CHANGED',photo.name);
    // Explicit plain styling AND a native normal paragraph before next photo.
    // A photo is never inserted immediately after a bold heading.
    const segmentHtml=buildExplicitEditorialHtml(segments[i].blocks,{highlightFragments:manifest.editorialHighlights||[]});
    const clipboardGate=verifyExplicitEditorialHtml(segmentHtml,segments[i].blocks);
    prepared.push({photoPath:path,blocks:segments[i].blocks,html:segmentHtml});
    report.clipboardPreflight??=[];
    report.clipboardPreflight.push({segment:i+1,...clipboardGate});
    report.photoAssets??=[];
    report.photoAssets.push({file:photo.name,sha256:digest,bytes:bytes.length,
      textBlocks:segments[i].blocks.length,htmlBytes:Buffer.byteLength(prepared[i].html,'utf8')});
  }
  report.photoUploadAttempts=[];report.photoGates=[];report.caretDiagnostics=[];
  report.segmentAnchors=[];report.alignmentSteps=[];report.stageVerifications=[];
  if(MODE==='check'){report.outcome='SOURCE_CHECK_PASS';}
  else{
    ({chromium}=await import('playwright-core'));
    ({getHtmlClipboardScript}=await import('@jjlabsio/md-to-naver-blog'));
    ({applyLeftAlignIfNeeded,applyTextFormat}=await import('../../naver-new-style-runner.mjs'));
    step('CDP_PREFLIGHT');
    const state=await probeChromeProtocol(CDP_URL,{httpTimeoutMs:3000,commandTimeoutMs:5000});
    report.cdpPreflight={...state,wsEndpoint:state.wsEndpoint?'present':null};
    if(!state.ok)fail(state.code,formatCdpError(state));
    step('CDP_CONNECT');
    browser=await chromium.connectOverCDP(state.wsEndpoint,{timeout:90000});
    const context=browser.contexts()[0]; if(!context)fail('NO_CDP_BROWSER_CONTEXT');
    step('PREVIEW_DUPLICATE_GATE');
    // Never create a second copy silently after a previous preview or a partial run.
    await mkdir(REPORT_DIR,{recursive:true});
    if(MODE==='preview'){
    const fingerprint=createHash('sha256').update(articleKey+'\n'+sourceSHA+'\n'+PHOTOS.map(p=>p.sha256).join('\n')).digest('hex');
    const statePath=join(REPORT_DIR,`run-state-${fingerprint}.json`);
    const old=await readFile(statePath,'utf8').then(JSON.parse).catch(()=>null);
    if(old && (old.contentStarted === true || old.outcome === 'DOM_PREVIEW_PASS_VISUAL_REVIEW_REQUIRED') && !argv.includes('--new-preview'))fail('PREVIEW_ALREADY_ATTEMPTED',`Previous run ${old.outcome} at ${old.when}. To create a new separate preview pass --new-preview explicitly.`);
    const lockPath=join(REPORT_DIR,`run-lock-${fingerprint}.json`);
    const lock=await open(lockPath,'wx').catch(e=>{if(e.code==='EEXIST')fail('PREVIEW_LOCK_EXISTS');throw e;});
    await lock.writeFile(JSON.stringify({fingerprint,createdAt:new Date().toISOString(),articleKey}));
    await lock.close();
    report.fingerprint=fingerprint;report.statePath=statePath;report.lockPath=lockPath;
    }
    step('NEW_TAB');
    page=await context.newPage();
    const editorEntry=await openEditorInNewTab(page,context,{blogId:'spokedu77',directUrl:URL,allowManualAuthRecovery:true,authWaitMs:180000});
    page=editorEntry.page;
    report.editorEntry=editorEntry.diagnostics;
    await cancelOnlyRecognizedRestorePopup(page);
    await page.locator('.se-canvas .se-section-text .se-text-paragraph').first().waitFor({state:'visible',timeout:8000});
    await cancelOnlyRecognizedRestorePopup(page);
    const initial=await canvasSnapshot(page);
    if(!initial.canvas||initial.images.length||initial.body.some(t=>!blank(t))||!blank(initial.title))
      fail('EDITOR_NOT_EMPTY');
    if(MODE==='smoke'){
      report.outcome='EDITOR_SMOKE_PASS';
      step('READ_ONLY_SMOKE_COMPLETE');
    } else {
    step('TITLE_OVERLAY_PREFLIGHT');
    await ensureTitleOverlayClear(page,{report,phase:'after-editor-initialized'});
    step('TITLE');
    report.contentStarted=true;
    await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:'https://blog.naver.com'});
    report.titleAttempts=await enterTitleSafely(page,plan.title);
    const clean=await canvasSnapshot(page);
    if(clean.images.length!==0||clean.body.some(t=>!blank(t)))fail('BODY_CHANGED_DURING_TITLE');
    step('PHOTO_1_UPLOAD');
    report.photoUploadAttempts.push({index:1,file:prepared[0].photoPath});
    report.photoUploadAttempted=true;
    report.uploadMethod1=await uploadImageFromEmptyEditor(page,prepared[0].photoPath);
    for(let i=0;i<PHOTOS.length;i++){
      step(`PHOTO_${i+1}_VERIFY`);
      await page.waitForFunction(expected=>{
        const root=document.querySelector('.se-canvas');if(!root)return false;
        const images=[...root.querySelectorAll('.se-component')].filter(el=>el.getClientRects().length&&
          !el.parentElement?.closest('.se-component')&&
          (el.classList.contains('se-component-image')||el.querySelector('.se-section-image')));
        return images.length===expected&&images.every(el=>[...el.querySelectorAll('img')]
          .some(im=>im.complete&&im.naturalWidth>0));
      },i+1,{timeout:16000,polling:250});
      let prior=segments.slice(0,i).flatMap(x=>x.blocks);
      const afterPhoto=await detailedCanvasSnapshot(page);
      // Must already have every preceding paragraph, with the new image in tail position.
      report.stageVerifications.push({stage:`PHOTO_${i+1}`,detail:inspectSequentialCanvas(afterPhoto,plan.title,prior,i+1,PHOTO_AFTER)});
      step(`SEGMENT_${i+1}_PASTE`);
      const verification=await pasteSegmentAfterLastPhoto(page,prior,prepared[i].blocks,prepared[i].html,plan.title,i+1);
      report.stageVerifications.push({stage:`BODY_${i+1}`,detail:verification});
      prior=segments.slice(0,i+1).flatMap(x=>x.blocks);
      if(i<PHOTOS.length-1){
        step(`PHOTO_${i+2}_UPLOAD`);
        const method=await uploadNextImageAtPasteTail(page,prepared[i+1].photoPath,plan.title,prior,i+1);
        report[`uploadMethod${i+2}`]=method;
      }
    }
    step('FULL_FINAL_VERIFY');
    const final=await detailedCanvasSnapshot(page);
    report.finalDocument=final;
    const summary=inspectSequentialCanvas(final,plan.title,parsed.blocks,PHOTOS.length,PHOTO_AFTER);
    if(summary.paragraphs!==manifest.blockCount||summary.images!==PHOTOS.length||summary.headings!==manifest.headingIndexes.length)fail('FINAL_COUNTS_INVALID');
    report.finalVerify=summary;
    const expectedUrls=[...new Set(parsed.blocks.flatMap(b=>(b.text.match(/https?:\/\/[^\s<>]+/g)||[])))];
    const linkHrefs=await page.evaluate(()=>[...document.querySelectorAll('.se-canvas a[href]')].map(a=>a.href));
    report.linkAudit={expectedUrls,actualHrefs:linkHrefs};
    if(expectedUrls.some(u=>!linkHrefs.some(h=>h.replace(/\/$/,'')===u.replace(/\/$/,''))))fail('NAVER_LINKS_NOT_CLICKABLE');
    // Naver-native editorial enhancements happen only AFTER the proven complete
    // photo + full-text + clickable-link gates. Never repair via DOM injection.
    const assertDocumentIntact=async()=>{
      const snap=await detailedCanvasSnapshot(page);
      return inspectSequentialCanvas(snap,plan.title,parsed.blocks,PHOTOS.length,PHOTO_AFTER);
    };
    step('NATIVE_EDITORIAL_HEADINGS');
    report.nativeHeadingEvents=await enhanceNativeHeadings(page,nativePlan.headings,{verify:assertDocumentIntact,applyTextFormat});
    step('NATIVE_EDITORIAL_CAPTIONS');
    report.nativeCaptionEvents=await enhanceNativeCaptions(page,nativePlan.captions,{verify:assertDocumentIntact});
    step('NATIVE_EDITORIAL_VERIFY');
    report.nativeEditorial=judgeNativeEditorial(nativePlan,{headings:report.nativeHeadingEvents,captions:report.nativeCaptionEvents});
    report.nativeEditorialSnapshot=await readNativeEditorialSnapshot(page);
    report.finalVerifyAfterEditorial=await assertDocumentIntact();
    const finalHrefs=await page.evaluate(()=>[...document.querySelectorAll('.se-canvas a[href]')].map(a=>a.href));
    if(expectedUrls.some(u=>!finalHrefs.some(h=>h.replace(/\/$/,'')===u.replace(/\/$/,''))))fail('EDITORIAL_LINKS_CHANGED');
    report.visualReviewRequired=true;
    report.outcome=report.nativeEditorial.nativeEditorialComplete
      ?'DOM_PREVIEW_PASS_VISUAL_REVIEW_REQUIRED'
      :'DOM_PREVIEW_PASS_EDITORIAL_PARTIAL_VISUAL_REVIEW_REQUIRED';
    step('EDITORIAL_SCREENSHOT');
    const shot=join(REPORT_DIR,`photo-sequential-editorial-${token}.png`);
    try{await page.screenshot({path:shot,timeout:10000});report.editorialScreenshot=shot;}
    catch(e){report.editorialScreenshotError=String(e.message||e).slice(0,200);}
    step('COMPLETE');
    } // not smoke
  }
}catch(e){
  checkpoint('ERROR', {code:e.code||'UNEXPECTED'});
  report.outcome='PREVIEW_ERROR';report.failedStage=stage;
  report.code=e.code||'UNEXPECTED';report.error=String(e.message||e).slice(0,1700);
  report.errorStack=String(e.stack||'').slice(0,2000);
  if(e.diagnostics)report.titleOverlayFailure=e.diagnostics;
  if(e.entryDiagnostics)report.editorEntry=e.entryDiagnostics;
  if(page&&!page.isClosed()){
    try{report.failureCanvas=await detailedCanvasSnapshot(page);}catch(inner){
      report.failureCanvasError=String(inner.message||inner).slice(0,350);
    }
  }
}finally{
  if(page&&!page.isClosed()){
    try{
      const shot=join(REPORT_DIR,`photo-sequential-${token}.png`);
      await mkdir(REPORT_DIR,{recursive:true});
      await page.screenshot({path:shot,timeout:5000});report.screenshot=shot;
    }catch{}
  }
  if(report.lockPath){
    try{
      await writeFile(report.statePath,JSON.stringify({outcome:report.outcome,when:new Date().toISOString(),contentStarted:report.contentStarted===true||report.titleAttempts!==undefined||report.photoUploadAttempted===true,screenshot:report.screenshot||null,failedStage:report.failedStage||null},null,2)+'\n');
    }catch{}
    try{const {unlink}=await import('node:fs/promises');await unlink(report.lockPath);}catch{}
  }
  report.elapsedMs=Math.round(performance.now()-time0);
  const path=join(REPORT_DIR,`photo-sequential-${token}.json`);
  await mkdir(REPORT_DIR,{recursive:true});
  await writeFile(path,JSON.stringify(report,null,2)+'\n','utf8');
  checkpoint('FINAL_REPORT_WRITTEN',{outcome:report.outcome,failedStage:report.failedStage||null});
  console.log(JSON.stringify({outcome:report.outcome,reportPath:path,runId:RUN_ID,
    failedStage:report.failedStage??null,code:report.code??null,error:report.error??null,
    titleOverlay:lastOverlaySummary(report),
    factualReviewApproved:report.factualReviewApproved??false,localLlmSourceUsed:report.localLlmSourceUsed??false,visualReviewRequired:report.visualReviewRequired??true,
    editorEntryLast:report.editorEntry?.at(-1)??null,
    sourceValidated:report.sourceValidated,articleKey:report.articleKey,articleFolder:ARTICLE_DIR,expectedImages:PHOTOS.length,expectedBlocks:manifest?.blockCount,
    photoUploadsAttempted:report.photoUploadAttempts?.length??0,
    imageCount:report.finalVerify?.images??report.stageVerifications?.filter(x=>x.stage.startsWith('PHOTO_')).at(-1)?.detail?.images??null,
    paragraphCount:report.finalVerify?.paragraphs??report.stageVerifications?.filter(x=>x.stage.startsWith('BODY_')).at(-1)?.detail?.paragraphs??null,
    headings:report.finalVerifyAfterEditorial?.headings??report.finalVerify?.headings??null,textMatch:report.finalVerifyAfterEditorial?.textMatch??report.finalVerify?.textMatch??null,
    nativeEditorial:report.nativeEditorial??null,editorialScreenshot:report.editorialScreenshot??null,
    stageVerifications:report.stageVerifications?.map(x=>({stage:x.stage,images:x.detail.images,paragraphs:x.detail.paragraphs}))??null,
    elapsedMs:report.elapsedMs,saveDraftExecuted:false,publishExecuted:false},null,2));
  // The shared Chrome process and previous tabs remain untouched. No close().
  process.exit(['SOURCE_CHECK_PASS','EDITOR_SMOKE_PASS','DOM_PREVIEW_PASS_VISUAL_REVIEW_REQUIRED','DOM_PREVIEW_PASS_EDITORIAL_PARTIAL_VISUAL_REVIEW_REQUIRED'].includes(report.outcome)?0:2);
}
