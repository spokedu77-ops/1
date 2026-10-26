/** Article-specific layout is manifest data, not executable code. */
const norm=s=>String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
function fail(code){const e=new Error(code);e.code=code;throw e;}
export function validateArticle(parsed,manifest){
  const blocks=parsed.blocks||[];
  if(!manifest||!/^spokedu\.naver\.article\.preview\.v1$/.test(manifest.schema))fail('MANIFEST_SCHEMA_INVALID');
  if(!manifest.articleKey||!/^[a-zA-Z0-9_-]+$/.test(manifest.articleKey))fail('ARTICLE_KEY_INVALID');
  if(manifest.publicationAllowed!==false||manifest.draftSaveAllowed!==false)fail('PUBLICATION_SAFETY_GATE');
  if(!norm(parsed.title)||norm(parsed.title)!==norm(manifest.title))fail('TITLE_MISMATCH');
  if(!blocks.length||blocks.length>300||blocks.length!==manifest.blockCount)fail('BLOCK_COUNT_MISMATCH');
  if(blocks.some(b=>!['heading','paragraph'].includes(b.type)||!norm(b.text)))fail('EMPTY_OR_UNKNOWN_BLOCK');
  const headings=blocks.flatMap((b,i)=>b.type==='heading'?[i]:[]);
  if(JSON.stringify(headings)!==JSON.stringify(manifest.headingIndexes))fail('HEADING_INDEX_MISMATCH');
  if(!Array.isArray(manifest.photos)||manifest.photos.length<1||manifest.photos.length>12)fail('PHOTO_COUNT_INVALID');
  if(!Array.isArray(manifest.photoAfter)||manifest.photoAfter.length!==manifest.photos.length)fail('PHOTO_AFTER_INVALID');
  if(manifest.photoAfter[0]!==-1)fail('PHOTO_FIRST_REQUIRED');
  if(manifest.photos.some(p=>!p.name||!/^[-\w.]+\.(jpg|jpeg|png)$/i.test(p.name)||!(/^[a-f0-9]{64}$/).test(p.sha256)))fail('PHOTO_DECLARATION_INVALID');
  for(let i=0;i<manifest.photoAfter.length;i++){
    const after=manifest.photoAfter[i];
    if(!Number.isInteger(after)||after>=blocks.length-1||after< -1||i>0&&after<=manifest.photoAfter[i-1])fail('PHOTO_AFTER_ORDER_INVALID');
  }
  const segments=deriveSegments(blocks,manifest);
  if(!segments.length||segments.some(s=>!s.blocks.length||s.blocks.at(-1).type!=='paragraph'))fail('HEADING_AT_PHOTO_BOUNDARY');
  const all=blocks.map(b=>b.text).join('\n');
  // Completeness gate can be stricter in an editorial-approved manifest.
  if(manifest.editorialCompleteGate?.includes('contact_url')&&!/https?:\/\/\S+/.test(all))fail('CONTACT_LINK_MISSING');
  if(manifest.editorialCompleteGate?.includes('hashtags')&&!/#[가-힣a-zA-Z0-9_]+/.test(all))fail('HASHTAGS_MISSING');
  if(manifest.editorialCompleteGate?.includes('reflective_ending')&&!/다음 수업|지도|관찰|개선/.test(all))fail('EDITORIAL_ENDING_MISSING');
  return {headings:headings.length,segments};
}
export function deriveSegments(blocks,manifest){
 const after=manifest.photoAfter;const photos=manifest.photos;
 if(!Array.isArray(after)||!Array.isArray(photos)||after.length!==photos.length)fail('PHOTO_PLAN_INVALID');
 const out=[];
 for(let i=0;i<after.length;i++){
  const from=after[i]+1,to=i+1<after.length?after[i+1]:blocks.length-1;
  const part=blocks.slice(from,to+1);
  if(!part.length||part.at(-1).type!=='paragraph')fail('SEGMENT_BOUNDARY_INVALID');
  out.push({photo:photos[i].name,after:after[i],from,to,blocks:part});
 }
 if(out.flatMap(s=>s.blocks).length!==blocks.length)fail('SEGMENT_TEXT_LOSS');
 return out;
}
