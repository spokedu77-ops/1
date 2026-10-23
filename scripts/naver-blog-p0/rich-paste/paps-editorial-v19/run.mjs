#!/usr/bin/env node
/**
 * SPOKEDU PAPS Editorial v19: consolidated photo-first 4-photo / 19-block preview.
 * Original runtime logic copied intact from v13 (real Naver PASS: 2026-10-21).
 * Fresh document ONLY: photo first, then a Naver-owned blank paragraph after it.
 * No Enter, no DOM Range/caret relocation and no existing-text edits.
 * Each subsequent image is inserted at the editor caret left by the validated paste;
 * all preceding text blocks, photo modules, and heading formatting are verified at every stage.
 * Writes no drafts, never publishes, and never closes the browser or existing tabs.
 * The image IS uploaded to Naver if the filechooser succeeds.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { probeChromeProtocol, formatCdpError } from './cdp-health.mjs';
import { getHtmlClipboardScript } from '@jjlabsio/md-to-naver-blog';
import { buildExplicitEditorialHtml, verifyExplicitEditorialHtml } from './editorial-html.mjs';
import { pasteWithFreshBodyStyle } from './paste-focus-guard.mjs';
import { enterTitleWithRecovery } from './title-input.mjs';
import { ensureTitleOverlayClear } from './title-overlay-gate.mjs';
import {applyLeftAlignIfNeeded,applyTextFormat,applyBold,applyFontSize} from '../../naver-new-style-runner.mjs';
import {inspectSequentialCanvas,findNativeTailAnchor,gateNextImage} from './photo-sequential-core.mjs';
import { deriveSegments, verifyEditorialInput } from './sequential-plan.mjs';
import { loadStyleBlockPlan } from '../../naver-new-style-runner.mjs';
import { FINAL_EXPECTED_SHA256, finalMarkdownPath, finalNaverInputJsonPath,
  parseArticleForNaver, sha256Text } from '../../naver-article-pipeline.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = resolve(DIR,'../../../../reports/naver-new/rich-paste/paps-editorial-v19');
const ARTICLE_ID = process.argv.find(x => x.startsWith('--article-id='))?.split('=')[1] || '9fad3d9e6f847f36';
const MODE = process.argv.includes('--preview-full') ? 'preview-full' : process.argv.includes('--probe-style') ? 'probe-style' : process.argv.includes('--probe-title') ? 'probe-title' : 'offline';
const URL = 'https://blog.naver.com/PostWriteForm.naver?blogId=spokedu77';
const CDP_URL = process.env.NAVER_CDP_URL || 'http://127.0.0.1:9222';
const PHOTOS=[
{name:'01-cover-paps.jpg',sha256:'4a346f4329b0861aae0fab2a605c1699c693cd18f4ec13396efca86518acbcc1'},
{name:'02-fitness-pair.jpg',sha256:'440af414d608fec3b3f566808853cba77f87e0087097ec14fa3d0d96c3029a4e'},
{name:'03-movement-pair.jpg',sha256:'6e67fe36c38b8c870a5d32a2becea1a3a56ac9b628d944c1a4fbac1b90a4a549'},
{name:'04-jump-single.jpg',sha256:'161c8f0dd01d4457c7cd4903911ebfbe2a25a814978b5e8bbad4fcc858549ba1'}
];
const time0 = performance.now();
const norm = s => String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const token = new Date().toISOString().replace(/[:.]/g,'-');
const report = { schema:'spokedu.photo-sequential.v19', mode: MODE, articleId:ARTICLE_ID,
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
  const anchor=findNativeTailAnchor(pre,expectedTitle,previousBlocks,imageCount);
  report.segmentAnchors.push({photoCount:imageCount,pre:anchor});
  const para=p.locator('.se-canvas .se-section-text .se-text-paragraph').nth(anchor.bodyLocatorIndex);
  try{
    const applied=await applyLeftAlignIfNeeded(p,{paragraphIndex:anchor.bodyLocatorIndex});
    report.alignmentSteps.push({photoCount:imageCount,applied});
  }catch(e){fail('POST_PHOTO_ALIGN_SETUP_FAILED',String(e.message||e).slice(0,350));}
  const afterAlign=await detailedCanvasSnapshot(p);
  const ready=findNativeTailAnchor(afterAlign,expectedTitle,previousBlocks,imageCount);
  if(ready.bodyLocatorIndex!==anchor.bodyLocatorIndex||ready.componentIndex!==anchor.componentIndex)
    fail('POST_PHOTO_ANCHOR_CHANGED_ON_ALIGN');
  // v17: clipboard first, then restore Naver's native empty paragraph formatting.
  // IMPORTANT: v16 clicked the paragraph AFTER resetting style, which can
  // reactivate the previous heading format. Never click after final Bold OFF.
  const reset = await pasteWithFreshBodyStyle({
    putClipboard: async () => p.evaluate(getHtmlClipboardScript(html)),
    focusAnchor: async () => para.click({timeout:4000}),
    setBodyFormat: async () => applyTextFormat(p,'body'),
    setNormalSize: async () => applyFontSize(p,16),
    setBoldOff: async () => applyBold(p,false),
    readBeforePaste: async () => {
      const snap=await detailedCanvasSnapshot(p);
      const afterReset=findNativeTailAnchor(snap,expectedTitle,previousBlocks,imageCount);
      if(afterReset.bodyLocatorIndex!==anchor.bodyLocatorIndex||afterReset.componentIndex!==anchor.componentIndex)
        fail('BODY_STYLE_RESET_MOVED_ANCHOR');
      const t=await p.evaluate(() => {
        const active=document.activeElement;
        const boldButtons=[...document.querySelectorAll('.se-bold-toolbar-button,button[data-name="bold"]')];
        const boldActive=boldButtons.some(x=>x.classList.contains('se-is-activated'));
        const frameActive=active?.tagName==='IFRAME';
        const selection=window.getSelection();
        return { activeTag:active?.tagName||null,
          activeClass:String(active?.className||'').slice(0,120),
          activeFrame:frameActive,
          topSelectionCount:selection?.rangeCount||0,
          boldToolbarPresent:boldButtons.length>0,
          boldToolbarActive:boldActive };
      });
      return {...t,anchor:afterReset};
    },
    pressPaste: async () => p.keyboard.press('Control+V'),
  });
  report.formatResetSteps??=[];
  report.formatResetSteps.push({photoCount:imageCount,...reset,
    expectedBodyFont:16,expectedBold:false});
  await p.waitForTimeout(600);
  const after=await detailedCanvasSnapshot(p);
  report.lastFullCanvas=after;
  const total=[...previousBlocks,...segment];
  return inspectSequentialCanvas(after,expectedTitle,total,imageCount);
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
  const gate=gateNextImage(pre,expectedTitle,blocks,imageCount);
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
  if(!/^[0-9a-f]{16}$/i.test(ARTICLE_ID))fail('ARTICLE_ID_INVALID');
  const plan=await loadStyleBlockPlan(ARTICLE_ID);
  const pkg=JSON.parse(await readFile(finalNaverInputJsonPath(ARTICLE_ID),'utf8'));
  const source=(await readFile(pkg.source||finalMarkdownPath(ARTICLE_ID),'utf8')).replace(/\r\n/g,'\n');
  const sha=sha256Text(source);
  if(sha!==FINAL_EXPECTED_SHA256||pkg.source_sha256!==sha)fail('FINAL_SHA_MISMATCH');
  const parsed=parseArticleForNaver(source);
  verifyEditorialInput(parsed,plan);
  const segments=deriveSegments(parsed.blocks);
  if(segments.length!==4 || JSON.stringify(segments.map(x=>x.blocks.length))!=='[3,5,5,6]')
    fail('UNEXPECTED_SEGMENT_PLAN');
  report.segments=segments.map(s=>({after:s.after,photo:s.photo,from:s.from,to:s.to,blocks:s.blocks.length,
    headings:s.blocks.filter(b=>b.type==='heading').length}));
  report.sourceValidated=true;report.sha256=sha;report.title=plan.title;
  const prepared=[];
  for(let i=0;i<segments.length;i++){
    const photo=PHOTOS[i];
    if(segments[i].photo!==photo.name)fail('PHOTO_SEQUENCE_PLAN_CHANGED');
    const path=resolve(DIR,'editorial-assets',photo.name);
    const bytes=await readFile(path);
    const digest=createHash('sha256').update(bytes).digest('hex');
    if(digest!==photo.sha256||bytes[0]!==0xff||bytes[1]!==0xd8)
      fail('IMAGE_FILE_CHANGED',photo.name);
    // The upstream Markdown converter's plain <p> has no font-weight, so
    // Naver can inherit Bold from a heading preceding the previous image.
    // Render explicit normal body SPANS. Preserve v13 heading markup semantics.
    const segmentHtml=buildExplicitEditorialHtml(segments[i].blocks);
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
  if(MODE==='offline'){report.outcome='PAPS_SEQUENTIAL_OFFLINE_READY';}
  else{
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
    if(!initial.canvas||initial.images.length||initial.body.some(t=>!blank(t))||!blank(initial.title))
      fail('EDITOR_NOT_EMPTY');
    step('TITLE_OVERLAY_PREFLIGHT');
    await ensureTitleOverlayClear(page,{report,phase:'after-editor-initialized'});
    step('TITLE');
    await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:'https://blog.naver.com'});
    report.titleAttempts=await enterTitleSafely(page,plan.title);
    const clean=await canvasSnapshot(page);
    if(clean.images.length!==0||clean.body.some(t=>!blank(t)))fail('BODY_CHANGED_DURING_TITLE');
    // Title-only diagnostic: no uploads, no body edits, no save/publish.
    if(MODE==='probe-title'){
      report.titleProbeVerify={titleMatches:clean.title===norm(plan.title),images:clean.images.length,
        meaningfulBody:clean.body.filter(t=>!blank(t)).length};
      if(!report.titleProbeVerify.titleMatches||report.titleProbeVerify.images||report.titleProbeVerify.meaningfulBody)
        fail('TITLE_ONLY_GATE_FAILED');
      report.outcome='PAPS_TITLE_PROBE_PASS';
      step('TITLE_PROBE_COMPLETE');
    }else{
    step('PHOTO_1_UPLOAD');
    report.photoUploadAttempts.push({index:1,file:prepared[0].photoPath});
    report.photoUploadAttempted=true;
    report.uploadMethod1=await uploadImageFromEmptyEditor(page,prepared[0].photoPath);
    for(let i=0;i<4;i++){
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
      report.stageVerifications.push({stage:`PHOTO_${i+1}`,detail:inspectSequentialCanvas(afterPhoto,plan.title,prior,i+1)});
      step(`SEGMENT_${i+1}_PASTE`);
      const verification=await pasteSegmentAfterLastPhoto(page,prior,prepared[i].blocks,prepared[i].html,plan.title,i+1);
      report.stageVerifications.push({stage:`BODY_${i+1}`,detail:verification});
      prior=segments.slice(0,i+1).flatMap(x=>x.blocks);
      if(MODE==='probe-style' && i===1){
        const probeProof=inspectSequentialCanvas(await detailedCanvasSnapshot(page),plan.title,prior,2);
        report.styleProbeVerify=probeProof;
        report.outcome='PAPS_BODY_STYLE_PROBE_PASS';
        step('STYLE_PROBE_COMPLETE');
        break;
      }
      if(i<3){
        step(`PHOTO_${i+2}_UPLOAD`);
        const method=await uploadNextImageAtPasteTail(page,prepared[i+1].photoPath,plan.title,prior,i+1);
        report[`uploadMethod${i+2}`]=method;
      }
    }
    if(MODE!=='probe-style'){
    step('FULL_FINAL_VERIFY');
    const final=await detailedCanvasSnapshot(page);
    report.finalDocument=final;
    const summary=inspectSequentialCanvas(final,plan.title,parsed.blocks,4);
    if(summary.paragraphs!==19||summary.images!==4||summary.headings!==3)fail('FINAL_COUNTS_INVALID');
    report.finalVerify=summary;
    report.outcome='PAPS_FULL_EDITORIAL_PREVIEW_PASS';
    step('COMPLETE');
    }
    } // not probe-title
  }
}catch(e){
  report.outcome='PAPS_FULL_EDITORIAL_PREVIEW_ERROR';report.failedStage=stage;
  report.code=e.code||'UNEXPECTED';report.error=String(e.message||e).slice(0,1700);
  report.errorStack=String(e.stack||'').slice(0,2000);
  if(e.diagnostics)report.titleOverlayFailure=e.diagnostics;
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
  report.elapsedMs=Math.round(performance.now()-time0);
  const path=join(REPORT_DIR,`photo-sequential-${token}.json`);
  await mkdir(REPORT_DIR,{recursive:true});
  await writeFile(path,JSON.stringify(report,null,2)+'\n','utf8');
  console.log(JSON.stringify({outcome:report.outcome,reportPath:path,
    failedStage:report.failedStage??null,code:report.code??null,error:report.error??null,
    titleOverlay:lastOverlaySummary(report),
    sourceValidated:report.sourceValidated,
    photoUploadsAttempted:report.photoUploadAttempts?.length??0,
    imageCount:report.finalVerify?.images??report.stageVerifications?.filter(x=>x.stage.startsWith('PHOTO_')).at(-1)?.detail?.images??null,
    paragraphCount:report.finalVerify?.paragraphs??report.stageVerifications?.filter(x=>x.stage.startsWith('BODY_')).at(-1)?.detail?.paragraphs??null,
    headings:report.finalVerify?.headings??null,textMatch:report.finalVerify?.textMatch??null,
    stageVerifications:report.stageVerifications?.map(x=>({stage:x.stage,images:x.detail.images,paragraphs:x.detail.paragraphs}))??null,
    elapsedMs:report.elapsedMs,saveDraftExecuted:false,publishExecuted:false},null,2));
  // The shared Chrome process and previous tabs remain untouched. No close().
  process.exit(['PAPS_SEQUENTIAL_OFFLINE_READY','PAPS_TITLE_PROBE_PASS','PAPS_BODY_STYLE_PROBE_PASS','PAPS_FULL_EDITORIAL_PREVIEW_PASS'].includes(report.outcome)?0:2);
}
