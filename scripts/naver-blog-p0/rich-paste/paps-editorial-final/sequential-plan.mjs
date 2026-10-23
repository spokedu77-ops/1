/** Pure offline layout plan: photos BEFORE editable text segments.
 * Does not modify Naver DOM, upload photos, or assume caret control.
 */
const n=s=>String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
export const PHOTO_AFTER = Object.freeze([
  {photo:'01-cover-paps.jpg',after:-1},
  {photo:'02-fitness-pair.jpg',after:3},
  {photo:'03-movement-pair.jpg',after:8},
  {photo:'04-jump-single.jpg',after:13},
]);
export function verifyEditorialInput(parsed,plan){
  const blocks=parsed.blocks || [];
  if(blocks.length!==19||plan.paragraphs.length!==19)throw Object.assign(new Error('19 body paragraphs required'),{code:'ARTICLE_STRUCTURE_FAIL'});
  const head=blocks.flatMap((b,i)=>b.type==='heading'?[i]:[]);
  if(JSON.stringify(head)!=='[2,7,12]')throw Object.assign(new Error('Unexpected heading slots'),{code:'ARTICLE_STRUCTURE_FAIL'});
  if(blocks.some((b,i)=>n(b.text)!==n(plan.paragraphs[i])))throw Object.assign(new Error('Markdown-JSON text mismatch'),{code:'ARTICLE_TEXT_MISMATCH'});
  if(n(parsed.title)!==n(plan.title))throw Object.assign(new Error('Title mismatch'),{code:'ARTICLE_TITLE_MISMATCH'});
  if(/\bPOPS\b|팝스/i.test([parsed.title,...blocks.map(b=>b.text)].join(' ')))throw Object.assign(new Error('PAPS correction required'),{code:'PAPS_CORRECTION_REQUIRED'});
  return true;
}
export function deriveSegments(blocks,photos=PHOTO_AFTER){
  if(blocks.length!==19)throw new Error('Expect exactly 19 blocks');
  const sorted=[...photos].sort((a,b)=>a.after-b.after);
  if(JSON.stringify(sorted.map(v=>v.after))!=='[-1,3,8,13]')throw new Error('Unsupported photo slots');
  const out=[];
  for(let i=0;i<sorted.length;i++){
    const from=sorted[i].after+1;
    const to=i+1<sorted.length?sorted[i+1].after:18;
    const selection=blocks.slice(from,to+1);
    if(!selection.length)throw new Error('Empty segment not supported');
    out.push({photo:sorted[i].photo,after:sorted[i].after,from,to,blocks:selection});
  }
  if(out.flatMap(x=>x.blocks).length!==blocks.length ||
      out.flatMap(x=>x.blocks).some((b,i)=>b!==blocks[i]))throw new Error('Segment reconstruction mismatch');
  return out;
}
