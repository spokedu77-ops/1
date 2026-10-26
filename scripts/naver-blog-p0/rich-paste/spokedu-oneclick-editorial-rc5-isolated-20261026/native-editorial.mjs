/**
 * SPOKEDU SmartEditor ONE post-composition enhancements.
 * Conservative: don't change the Naver document until all source/photo gates PASS.
 * Native UI only; never mutate editor DOM as an alternative to real toolbar input.
 * A missing/ambiguous native control is NOT a pass. It is reported for manual review.
 * Does not click save, publish, delete, or close any tab.
 */
const norm=s=>String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const bad=s=>{const e=new Error(s);e.code=s;throw e;};
export const EDITORIAL_CAPTION_MAX=125;
export function buildNativeEditorialPlan(parsed,manifest) {
  const headings=(parsed?.blocks||[]).filter(b=>b.type==='heading').map(b=>b.text);
  const pictures=(manifest?.photos||[]);
  if(!headings.length)bad('EDITORIAL_HEADING_PLAN_EMPTY');
  const captions=pictures.map((p,i)=>({index:i,photo:p.name,caption:norm(p.caption||''),isGraphic:/graphic|banner|typographic/i.test(p.source||'')}));
  if(captions.some(x=>x.caption.length>EDITORIAL_CAPTION_MAX))bad('EDITORIAL_CAPTION_TOO_LONG');
  if(captions.some(x=>!x.caption && !x.isGraphic))bad('EDITORIAL_CAPTION_MISSING');
  if(new Set(headings.map(norm)).size!==headings.length)bad('EDITORIAL_DUPLICATE_HEADING');
  return {version:'native-editorial-v1',headings,captions,
    editorialReference:'source-photography-3-plus-CTA; blue-native-headings; minimal-captions',
    preservePhotos:true,preserveText:true,saveOrPublish:false};
}
function info(code,other={}){return {code,...other};}
export async function readNativeEditorialSnapshot(page){
  return page.evaluate(()=>{
    const norm=s=>String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
    const root=document.querySelector('.se-canvas');
    if(!root)return {ready:false};
    const visible=e=>e.getClientRects().length>0;
    const imgs=[...root.querySelectorAll('.se-component-image')].filter(e=>visible(e)&&!e.parentElement?.closest('.se-component-image'));
    const text=[...root.querySelectorAll('.se-section-text .se-text-paragraph,.se-sectionTitle .se-text-paragraph')].filter(visible).map(e=>({text:norm(e.innerText),kind:e.closest('.se-sectionTitle')?'sectionTitle':'body',fontSize:getComputedStyle(e).fontSize,fontWeight:getComputedStyle(e).fontWeight,color:getComputedStyle(e).color}));
    return {ready:true,images:imgs.map((img,i)=>({index:i,caption:norm(img.querySelector('.se-caption,.se-image-caption')?.innerText||''),captionEditable:img.querySelectorAll('.se-caption [contenteditable="true"],.se-image-caption [contenteditable="true"],.se-caption[contenteditable="true"],.se-image-caption[contenteditable="true"]').length})),text};
  });
}
/** Verify exact source text + photo positions using caller's proven canvas gate. */
async function verifySafe(verify,phase){
  try { const data=await verify();return info('DOCUMENT_INTACT',{phase,summary:data}); }
  catch(e){const err=new Error(`EDITORIAL_DOCUMENT_CHANGED_AFTER_${phase}: ${String(e.message||e)}`);err.code='EDITORIAL_DOCUMENT_CHANGED';throw err;}
}
/** Validate unique exact-heading target and isolate native section title side-effects. */
export async function enhanceNativeHeadings(page,headingTexts,{verify,applyTextFormat}){
  const events=[];
  for(const heading of headingTexts){
    const state=await page.evaluate(expected=>{
      const norm=s=>String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
      const ps=[...document.querySelectorAll('.se-canvas .se-section-text .se-text-paragraph,.se-canvas .se-sectionTitle .se-text-paragraph')];
      const matches=ps.filter(el=>norm(el.innerText)===norm(expected)&&el.getClientRects().length);
      if(matches.length!==1)return {code:matches.length?'HEADING_AMBIGUOUS':'HEADING_NOT_FOUND',count:matches.length};
      const p=matches[0]; const comp=p.closest('.se-component');
      const whole=norm(comp?.innerText||'');
      return {code:'READY',existingNative:!!p.closest('.se-sectionTitle'),isolated:whole===norm(expected),className:String(comp?.className||'').slice(0,100)};
    },heading);
    if(state.code!=='READY'){events.push(info(state.code,{heading}));continue;}
    if(state.existingNative){events.push(info('HEADING_ALREADY_NATIVE',{heading}));continue;}
    if(!state.isolated){events.push(info('HEADING_NOT_ISOLATED_SKIP',{heading}));continue;}
    // Preflight UI before mutation; never issue a text-format action blind.
    const hasToolbar=await page.locator('.se-text-format-toolbar-button,button[data-name="text-format"]').first().isVisible().catch(()=>false);
    if(!hasToolbar){events.push(info('NATIVE_HEADING_TOOLBAR_UNAVAILABLE',{heading}));continue;}
    const loc=page.locator('.se-canvas .se-section-text .se-text-paragraph').filter({hasText:heading});
    if(await loc.count()!==1){events.push(info('HEADING_LOCATOR_AMBIGUOUS',{heading}));continue;}
    await loc.first().click({timeout:4000});
    await applyTextFormat(page,'sectionTitle');
    await verifySafe(verify,'HEADING');
    const after=await page.evaluate(expected=>{
      const norm=s=>String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
      return [...document.querySelectorAll('.se-canvas .se-sectionTitle .se-text-paragraph')].filter(el=>norm(el.innerText)===norm(expected)).length;
    },heading);
    if(after!==1)bad('NATIVE_HEADING_NOT_APPLIED');
    events.push(info('HEADING_NATIVE_APPLIED',{heading}));
  }
  return events;
}
/** Native image caption. Never insert into the body if caption editor cannot be identified. */
export async function enhanceNativeCaptions(page,entries,{verify}){
  const events=[];
  for(const entry of entries){
    if(entry.isGraphic){events.push(info('GRAPHIC_CAPTION_SKIPPED',{image:entry.index+1}));continue;}
    const count=await page.locator('.se-canvas .se-component-image').count();
    if(count!==entries.length)bad('IMAGE_COUNT_CHANGED_BEFORE_CAPTION');
    const photo=page.locator('.se-canvas .se-component-image').nth(entry.index);
    const before=await photo.innerText().catch(()=>'' );
    if(norm(before).includes(entry.caption)){events.push(info('CAPTION_ALREADY_PRESENT',{image:entry.index+1}));continue;}
    await photo.locator('img').first().click({timeout:4000});
    const selector='.se-caption [contenteditable="true"],.se-image-caption [contenteditable="true"],.se-caption[contenteditable="true"],.se-image-caption[contenteditable="true"]';
    let editable=photo.locator(selector);
    let candidates=await editable.count();
    if(candidates!==1){
      const placeholder=photo.getByText('사진 설명을 입력하세요',{exact:true});
      if(await placeholder.count()===1){await placeholder.click({timeout:4000});editable=photo.locator(selector);candidates=await editable.count();}
    }
    if(candidates!==1){events.push(info('CAPTION_NATIVE_EDITOR_NOT_FOUND',{image:entry.index+1,found:candidates}));continue;}
    const activeText=norm(await editable.first().innerText().catch(()=>''));
    if(activeText && activeText!=='사진 설명을 입력하세요'){
      events.push(info('CAPTION_EXISTING_TEXT_PROTECTED',{image:entry.index+1,current:activeText.slice(0,120)}));continue;
    }
    // Playwright fill delegates to the real native contenteditable, not DOM mutation.
    await editable.first().fill(entry.caption,{timeout:5000});
    const got=norm(await editable.first().innerText());
    if(got!==entry.caption)bad('NATIVE_CAPTION_TEXT_MISMATCH');
    await verifySafe(verify,'CAPTION');
    events.push(info('CAPTION_NATIVE_APPLIED',{image:entry.index+1,caption:entry.caption}));
  }
  return events;
}
export function judgeNativeEditorial(plan,{headings=[],captions=[]}={}){
  const headingOk=headings.filter(e=>['HEADING_NATIVE_APPLIED','HEADING_ALREADY_NATIVE'].includes(e.code)).length;
  const targets=plan.captions.filter(c=>!c.isGraphic);
  const captionOk=captions.filter(e=>['CAPTION_NATIVE_APPLIED','CAPTION_ALREADY_PRESENT'].includes(e.code)).length;
  return {headingExpected:plan.headings.length,headingNativeVerified:headingOk,
    captionExpected:targets.length,captionNativeVerified:captionOk,
    nativeEditorialComplete:headingOk===plan.headings.length&&captionOk===targets.length,
    limitedFeatures:['2-column photo groups','horizontal dividers','image cover overlay'].map(name=>({name,status:'NOT_AUTOMATED_IN_THIS_RELEASE'})),
    verdict:headingOk===plan.headings.length&&captionOk===targets.length?'NATIVE_EDITORIAL_PASS_VISUAL_REVIEW_REQUIRED':'EDITORIAL_PARTIAL_MANUAL_REVIEW_REQUIRED'};
}
