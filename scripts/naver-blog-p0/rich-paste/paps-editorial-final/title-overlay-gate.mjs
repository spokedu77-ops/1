/**
 * Smart Editor ONE title overlay gate.
 * Never click through, hide, remove, or mutate an unknown modal/dimmer.
 * Only an unambiguous "resume previous writing" dialog may be cancelled.
 */
export const restoreDialogPattern = /(?:작성\s*중(?:이던|인)?\s*(?:글|게시글)|작성하던|작성했던|이어서\s*작성|이어쓰기|이전.{0,15}글.{0,15}(?:불러|복원)|(?:임시\s*저장|저장된).{0,35}(?:불러|이어|복원)|복원.{0,15}(?:글|게시글))/i;

export function classifyTitleOverlay(snapshot) {
  if (!snapshot?.blocked) return {status:'CLEAR'};
  const dialogs=(snapshot.dialogs||[]).filter(d=>d.visible);
  const candidates=dialogs.filter(d => d.kind==='restore-confirm'
    && restoreDialogPattern.test(d.text||'')
    && (d.buttons||[]).filter(b=>b==='취소').length===1);
  return candidates.length===1 && dialogs.length===1
    ? {status:'SAFE_RESTORE_CANCEL',dialogIndex:candidates[0].index}
    : {status:'BLOCKED_UNKNOWN',dialogCount:dialogs.length};
}

/** Read-only editor hit testing. This makes a delayed .se-popup-dim visible in reports. */
export async function readTitleOverlaySnapshot(page) {
  return page.evaluate(() => {
    const title=document.querySelector('.se-title-text');
    const cssVisible=el=>{
      if(!el?.getClientRects().length) return false;
      const s=getComputedStyle(el);
      return s.display!=='none' && s.visibility!=='hidden' && Number(s.opacity||1)>0.02;
    };
    const r=title?.getBoundingClientRect();
    const points=r && r.width>10 && r.height>8 ?
      [{x:r.left+Math.min(r.width*.36,220),y:r.top+r.height*.5},
       {x:r.left+Math.min(r.width*.16,90),y:r.top+r.height*.65}] : [];
    const hits=points.map(p=>{
      const h=document.elementFromPoint(p.x,p.y);
      return {tag:h?.tagName||null,cls:String(h?.className||'').slice(0,110),
        blocker:!!h?.closest?.('.se-popup-dim')};
    });
    const dims=[...document.querySelectorAll('.se-popup-dim')]
      .filter(el=>cssVisible(el) && getComputedStyle(el).pointerEvents!=='none');
    const potential=[...document.querySelectorAll('.se-popup-alert-confirm,[role="dialog"],.se-popup')]
      .filter(cssVisible).filter(el=>!el.classList.contains('se-popup-dim'));
    // Prefer the known confirm component over a nested generic popup wrapper.
    const confirms=potential.filter(el=>el.matches('.se-popup-alert-confirm'));
    const chosen=confirms.length ? confirms.filter(el=>!confirms.some(ch=>ch!==el&&el.contains(ch)))
      : potential.filter(el=>!potential.some(ch=>ch!==el&&el.contains(ch)));
    const dialogs=chosen.map((el,index)=>({index,
      kind:el.matches('.se-popup-alert-confirm')?'restore-confirm':'other-dialog',visible:true,
      className:String(el.className||'').slice(0,100),
      text:String(el.innerText||'').replace(/\s+/g,' ').trim().slice(0,350),
      buttons:[...el.querySelectorAll('button,[role="button"]')]
        .map(b=>String(b.innerText||b.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim())
        .filter(Boolean).slice(0,12)}));
    return {blocked:hits.some(h=>h.blocker) || dims.length>0,
      dimCount:dims.length,titleFound:!!title,hits,dialogs};
  });
}

/** Pure orchestration allows deterministic tests without Chrome or real dialogs. */
export async function runOverlayGate({inspect,cancelRestore,pause=async()=>{},now=Date.now,
  timeoutMs=6500,intervalMs=200}={}) {
  const began=now();
  const records=[];
  let cancelCount=0,consecutiveClear=0;
  while(now()-began<timeoutMs){
    const snap=await inspect();
    const verdict=classifyTitleOverlay(snap);
    records.push({atMs:now()-began,verdict:verdict.status,dimCount:snap.dimCount||0,
      hits:snap.hits||[],dialogs:snap.dialogs||[]});
    if(verdict.status==='CLEAR'){
      consecutiveClear++;
      if(consecutiveClear>=2)return {ok:true,cancelCount,records:records.slice(-12)};
    }else{
      consecutiveClear=0;
      if(verdict.status==='SAFE_RESTORE_CANCEL' && cancelCount===0){
        await cancelRestore();
        cancelCount++;
      }
    }
    await pause(intervalMs);
  }
  const last=records.at(-1)||{};
  const err=new Error('Title blocked by Naver overlay; no click-through permitted. '+
    JSON.stringify({dimCount:last.dimCount,hits:last.hits,dialogs:last.dialogs}).slice(0,1050));
  err.code='TITLE_OVERLAY_BLOCKED';
  err.diagnostics={cancelCount,records:records.slice(-12)};
  throw err;
}

export async function ensureTitleOverlayClear(page,{report,phase='TITLE',timeoutMs=6500}={}) {
  try {
    const r=await runOverlayGate({
      inspect:()=>readTitleOverlaySnapshot(page),
      cancelRestore:async()=>{
        const modal=page.locator('.se-popup-alert-confirm:visible');
        if(await modal.count()!==1)throw Object.assign(new Error('Ambiguous restore modal'),{code:'RESTORE_DIALOG_CHANGED'});
        const text=await modal.innerText();
        if(!restoreDialogPattern.test(text))throw Object.assign(new Error('Restore modal text changed'),{code:'RESTORE_DIALOG_CHANGED'});
        const cancel=modal.getByRole('button',{name:'취소',exact:true});
        if(await cancel.count()!==1)throw Object.assign(new Error('Restore cancel button changed'),{code:'RESTORE_DIALOG_CHANGED'});
        await cancel.click({timeout:2500});
        await modal.waitFor({state:'hidden',timeout:2500});
      },pause:ms=>page.waitForTimeout(ms),timeoutMs});
    if(report){(report.titleOverlayGates??=[]).push({phase,...r});}
    return r;
  }catch(error){
    if(report)(report.titleOverlayGates??=[]).push({phase,error:String(error.message||error).slice(0,1050),
      diagnostics:error.diagnostics||null});
    throw error;
  }
}
