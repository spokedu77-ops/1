/**
 * Naver Smart Editor ONE title input, bound to new empty document only.
 * No DOM textContent mutations and no existing tab changes.
 * Read title/body after EVERY attempt: stop if either was unexpectedly changed.
 */
export const norm = s => String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
export const titleBlank = s => !norm(s) || norm(s)==='제목';

export function titlePointerLocations(rect){
  if(!rect || rect.width<10 || rect.height<8) return [];
  return [
    {x:Math.round(rect.x+Math.min(rect.width*.36,220)),y:Math.round(rect.y+Math.min(rect.height*.5,30))},
    {x:Math.round(rect.x+Math.min(rect.width*.16,90)),y:Math.round(rect.y+Math.min(rect.height*.65,42))},
  ].filter((p,i,a)=>a.findIndex(x=>x.x===p.x&&x.y===p.y)===i);
}

async function readFocus(page){
  return page.evaluate(() => {
    const el=document.activeElement;
    return {tag:el?.tagName||'',isEditable:!!el?.isContentEditable,
      className:String(el?.className||'').slice(0,100),
      inTitle:!!el?.closest?.('.se-section-documentTitle,.se-title-text')};
  });
}
function focusAcceptable(f){return f?.tag==='IFRAME'||f?.isEditable===true||f?.inTitle===true;}

async function diagnoseTitleHit(page,sel){
  return page.evaluate(selector=>{
    const el=document.querySelector(selector);
    if(!el)return {targetFound:false};
    el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
    const r=el.getBoundingClientRect();
    const rect={x:r.x,y:r.y,width:r.width,height:r.height};
    const pts=[
      {x:r.x+Math.min(r.width*.36,220),y:r.y+Math.min(r.height*.5,30)},
      {x:r.x+Math.min(r.width*.16,90),y:r.y+Math.min(r.height*.65,42)}
    ];
    return {targetFound:true,rect,
      hits:pts.map(q=>{
        const at=document.elementFromPoint(q.x,q.y);
        return {tag:at?.tagName||null,className:String(at?.className||'').slice(0,90),
          inTitle:!!(at&&(el.contains(at)||at.contains(el)))};
      })};
  },sel);
}

export async function enterTitleWithRecovery(page, expected, {snapshot, abort}={}){
  const title=page.locator('.se-section-documentTitle .se-text-paragraph').first();
  const wrapper=page.locator('.se-title-text').first();
  const readTitle=async()=>norm(await title.innerText().catch(()=>''));
  const original=await readTitle();
  if(!titleBlank(original)) abort('TITLE_NOT_BLANK');
  const attempts=[];
  async function gate(attempt,wrote=false){
    // SmartEditor content model may commit after key input completes.
    // Give it a bounded opportunity before ANY further click/write.
    if(wrote && typeof page.waitForFunction === 'function'){
      await page.waitForFunction(text => {
        const p=document.querySelector('.se-section-documentTitle .se-text-paragraph');
        const n=s=>String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
        return n(p?.innerText) === n(text);
      },expected,{timeout:1200,polling:80}).catch(()=>{});
    }
    await page.waitForTimeout(110);
    const current=await readTitle();
    attempt.after=current.slice(0,100);
    if(current===norm(expected))return true;
    const state=await snapshot(page);
    if(state.body.some(t=>norm(t)&&!norm(t).includes('글감과 함께 나의 일상을 기록해보세요')))
      abort('TITLE_WRITTEN_IN_BODY');
    if(!titleBlank(current))abort('TITLE_PARTIAL',current.slice(0,120));
    return false;
  }
  async function attemptClick(label,doClick,input){
    const a={method:label};attempts.push(a);
    let wrote=false;
    try{await doClick();a.focus=await readFocus(page);
      if(!focusAcceptable(a.focus)){a.skipped='TITLE_NOT_FOCUSED';return await gate(a);}
      if(input==='paste'){
        await page.evaluate(text=>navigator.clipboard.writeText(text),expected);
        await page.keyboard.press('Control+V');
      } else await page.keyboard.insertText(expected);
      wrote=true;
    }catch(e){a.error=String(e.message||e).slice(0,310);}
    return gate(a,wrote);
  }
  // v17 had three locator.click actionability timeouts. A force click bypasses
  // that actionability wait, but typing happens ONLY if focus is in editor.
  // Natural click first preserves the v5 proven path.
  if(await attemptClick('wrapper-natural',()=>wrapper.click({timeout:1500}),'insert'))return attempts;
  if(await attemptClick('wrapper-force',()=>wrapper.click({force:true,timeout:2200}),'insert'))return attempts;
  const hit=await diagnoseTitleHit(page,'.se-title-text').catch(e=>({error:String(e.message||e).slice(0,150)}));
  attempts.push({method:'hit-test-wrapper',diagnostics:hit});
  for(const [i,point] of titlePointerLocations(hit?.rect).entries()){
    if(await attemptClick('wrapper-mouse-'+(i+1),()=>page.mouse.click(point.x,point.y),'insert'))return attempts;
  }
  if(await attemptClick('paragraph-force',()=>title.click({force:true,timeout:2200}),'paste'))return attempts;
  if(await attemptClick('wrapper-force-paste',()=>wrapper.click({force:true,timeout:2200}),'paste'))return attempts;
  const final={titleAfter:await readTitle(),focus:await readFocus(page),titleHit:hit};
  attempts.push({method:'final-diagnostics',...final});
  abort('TITLE_INPUT_FAILED',JSON.stringify(attempts).slice(0,6000));
}
