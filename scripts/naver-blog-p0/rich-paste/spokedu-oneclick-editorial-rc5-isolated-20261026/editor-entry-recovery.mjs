/**
 * Non-destructive Naver Smart Editor entry recovery.
 * Operates only in the newly-created automation tab; never touches existing tabs.
 * A redirect to a blog homepage is NOT evidence of an expired login.
 */
const safeUrl = (url) => {
  try {
    const u = new URL(String(url));
    return ['blog.naver.com', 'nid.naver.com', 'www.naver.com'].includes(u.hostname)
      ? `${u.origin}${u.pathname}${u.search}` : `${u.origin}${u.pathname}`;
  } catch { return String(url || '').slice(0, 250); }
};

export function classifyEditorEntry({ url, editorReady = false, editorEmbedded = false } = {}) {
  let u;
  try { u = new URL(url); } catch { return 'UNKNOWN_URL'; }
  if (editorReady) return 'EDITOR_READY';
  if (editorEmbedded) return 'EDITOR_NOT_TOP_LEVEL';
  if (/^(nid\.naver\.com|nidlogin\.naver\.com)$/i.test(u.hostname)) return 'AUTH_PAGE';
  if (u.hostname === 'blog.naver.com' && /^\/PostWriteForm\.naver$/i.test(u.pathname)) return 'EDITOR_LOADING';
  if (u.hostname === 'blog.naver.com' && /^\/[^/]+\/?$/.test(u.pathname)) return 'BLOG_HOME';
  if (u.hostname === 'blog.naver.com') return 'NAVER_NON_EDITOR';
  return 'UNKNOWN_URL';
}

function entryError(code, diagnostics) {
  const e = new Error(`${code}: ${diagnostics.at(-1)?.url || ''}`);
  e.code = code;
  e.entryDiagnostics = diagnostics;
  return e;
}

async function probe(page) {
  const dom = await page.evaluate(() => ({
    editorReady: Boolean(document.querySelector('.se-canvas .se-section-text .se-text-paragraph') &&
      document.querySelector('.se-section-documentTitle .se-text-paragraph')),
    hasCanvas: Boolean(document.querySelector('.se-canvas')),
    frames: document.querySelectorAll('iframe').length,
  })).catch(() => ({ editorReady:false, hasCanvas:false, frames:0 }));
  const childEditor=[];
  if (!dom.editorReady) {
    for (const f of page.frames().filter(f => f !== page.mainFrame())) {
      const found=await f.evaluate(() => Boolean(document.querySelector('.se-canvas .se-section-text .se-text-paragraph') &&
        document.querySelector('.se-section-documentTitle .se-text-paragraph'))).catch(()=>false);
      if(found) childEditor.push(safeUrl(f.url()));
    }
  }
  const url=safeUrl(page.url());
  return { url, ...dom, childEditor, state:classifyEditorEntry({url,editorReady:dom.editorReady, editorEmbedded:childEditor.length>0}) };
}

async function awaitEditor(page, maxMs=2200) {
  const start=Date.now();
  let state=await probe(page);
  while(state.state === 'EDITOR_LOADING' && Date.now()-start<maxMs){
    await page.waitForTimeout(250);
    state=await probe(page);
  }
  return state;
}

/** Read-only discovery of the blog's own writing action in top + child frames. */
async function locateNativeWriteAction(page) {
  const roots=[page,...page.frames().filter(f=>f!==page.mainFrame())];
  for(let ri=0;ri<roots.length;ri++){
    const root=roots[ri];
    const matches=await root.evaluate(() => {
      const els=[...document.querySelectorAll('a, button, [role="button"]')];
      return els.map((el,index)=>{
        const label=(el.innerText||el.getAttribute('aria-label')||el.title||'').replace(/\s+/g,' ').trim();
        const href=el.getAttribute('href')||'';
        const r=el.getBoundingClientRect();
        const css=getComputedStyle(el);
        const visible=r.width>0&&r.height>0&&css.display!=='none'&&css.visibility!=='hidden';
        return {index,label:label.slice(0,60),href:href.slice(0,200),visible,
          suitable:/^(글쓰기|글 쓰기|새 글쓰기|글쓰기 바로가기)$/.test(label)||
            /(?:PostWriteForm|GoBlogWrite|Redirect=Write)/i.test(href)};
      }).filter(x=>x.suitable&&x.visible).slice(0,8);
    }).catch(()=>[]);
    if(matches.length){
      const preferred=matches.find(x=>/^(글쓰기|글 쓰기|새 글쓰기|글쓰기 바로가기)$/.test(x.label))||matches[0];
      return {root, frameIndex:ri, index:preferred.index, label:preferred.label, href:preferred.href,
        count:matches.length};
    }
  }
  return null;
}

/**
 * @param {import('playwright-core').Page} originalPage - NEW automation tab, never a pre-existing tab
 * @param {import('playwright-core').BrowserContext} context
 * @param {{ blogId:string, directUrl:string }} opts
 * @returns {Promise<{page:import('playwright-core').Page,diagnostics:Array<object>} >}
 */
export async function openEditorInNewTab(originalPage,context,{blogId,directUrl}){
  if(!/^[a-z0-9_-]{2,45}$/i.test(blogId)) throw new Error('BLOG_ID_INVALID');
  const diagnostics=[];
  let page=originalPage;
  const inspect=async(label)=>{
    const v=await awaitEditor(page);
    diagnostics.push({phase:label,...v});
    if(v.state==='AUTH_PAGE') throw entryError('NAVER_AUTH_PAGE',diagnostics);
    if(v.state==='EDITOR_NOT_TOP_LEVEL') throw entryError('NAVER_EDITOR_FRAME_CHANGED',diagnostics);
    return v.state==='EDITOR_READY';
  };
  const navigate=async(label,url)=>{
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});
    return inspect(label);
  };
  if(await navigate('direct',directUrl))return {page,diagnostics};

  if(classifyEditorEntry({url:page.url()})==='BLOG_HOME'){
    let candidate=null;
    const started=Date.now();
    while(Date.now()-started<Number(process.env.NAVER_ENTRY_HOME_MAX_MS||8000)){
      candidate=await locateNativeWriteAction(page);
      if(candidate)break;
      await page.waitForTimeout(350);
      const p=await probe(page);
      if(p.state==='AUTH_PAGE')throw entryError('NAVER_AUTH_PAGE',diagnostics.concat([{phase:'homepage_wait',...p}]));
      if(p.state==='EDITOR_READY')return {page,diagnostics:diagnostics.concat([{phase:'homepage_wait',...p}])};
    }
    diagnostics.push({phase:'native_write_discovery',url:safeUrl(page.url()),waitedMs:Date.now()-started,
      candidate:candidate?{frameIndex:candidate.frameIndex,index:candidate.index,label:candidate.label,
        href:candidate.href,count:candidate.count}:null});
    if(candidate){
      const oldPages=new Set(context.pages());
      try{
        await candidate.root.locator('a, button, [role="button"]').nth(candidate.index).click({timeout:4000});
        await page.waitForTimeout(500);
        const added=context.pages().filter(p=>!oldPages.has(p));
        if(added.length){page=added.at(-1);await page.waitForLoadState('domcontentloaded',{timeout:12000}).catch(()=>{});}
        if(await inspect('native_write_click'))return {page,diagnostics};
      }catch(e){
        if(e.code==='NAVER_AUTH_PAGE'||e.code==='NAVER_EDITOR_FRAME_CHANGED')throw e;
        diagnostics.push({phase:'native_write_click_error',error:String(e.message||e).slice(0,350)});
      }
    }
  }

  // No guessing undocumented write URLs or bypassing authentication.
  throw entryError('NAVER_EDITOR_ENTRY_UNRESOLVED',diagnostics);
}
