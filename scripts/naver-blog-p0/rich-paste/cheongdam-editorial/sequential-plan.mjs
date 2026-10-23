/** Stable 3-photo / 14-block layout for the verified Cheongdam diary. */
const norm=s=>String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
export const PHOTO_AFTER=Object.freeze([
  {photo:'01-cooperation.jpg',after:-1},
  {photo:'02-spider.jpg',after:5},
  {photo:'03-play.jpg',after:9},
]);
export function verifyEditorialInput(parsed,manifest){
  const blocks=parsed.blocks||[];
  if(blocks.length!==manifest.blockCount)throw new Error('ARTICLE_STRUCTURE_FAIL');
  const headings=blocks.flatMap((b,i)=>b.type==='heading'?[i]:[]);
  if(JSON.stringify(headings)!==JSON.stringify(manifest.headingIndexes))throw new Error('HEADING_INDEX_MISMATCH');
  if(norm(parsed.title)!==norm(manifest.title))throw new Error('ARTICLE_TITLE_MISMATCH');
  if(blocks.some(b=>!norm(b.text)||!['heading','paragraph'].includes(b.type)))throw new Error('EMPTY_OR_UNSUPPORTED_BLOCK');
  const bodyText=blocks.filter(b=>b.type==='paragraph').map(b=>b.text).join('\n');
  const h=blocks.filter(b=>b.type==='heading').map(b=>b.text).join('\n');
  // Publishability gate: technical paste PASS is not editorial completeness.
  if(!/수업을 마치며/.test(h) || !/기관 방문 체육수업 안내/.test(h))throw new Error('EDITORIAL_CLOSING_HEADING_MISSING');
  if(!/승패|스포츠맨십/.test(bodyText)||!/다음 수업/.test(bodyText))throw new Error('REFLECTION_MISSING');
  if(!/https?:\/\/pf\.kakao\.com\/_VGWxeb\/chat/.test(bodyText))throw new Error('CONTACT_LINK_MISSING');
  if(!/#스포키듀/.test(bodyText)||!/#센터체육수업/.test(bodyText))throw new Error('HASHTAGS_MISSING');
  if(!/서울 및 경기/.test(bodyText)||!/60~120분/.test(bodyText))throw new Error('OPERATING_TERMS_MISSING');
  if(manifest.publicationAllowed!==false||manifest.draftSaveAllowed!==false)throw new Error('PUBLICATION_NOT_BLOCKED');
  if(JSON.stringify(manifest.photoAfter)!==JSON.stringify(PHOTO_AFTER.map(v=>v.after)))throw new Error('PHOTO_PLAN_MISMATCH');
  return true;
}
export function deriveSegments(blocks,photos=PHOTO_AFTER){
  const sorted=[...photos].sort((a,b)=>a.after-b.after);
  if(sorted.length!==3||sorted[0].after!==-1)throw new Error('EXPECTED_THREE_PHOTOS');
  const out=[];
  for(let i=0;i<sorted.length;i++){
    const from=sorted[i].after+1;
    const to=i+1<sorted.length?sorted[i+1].after:blocks.length-1;
    const chunk=blocks.slice(from,to+1);
    if(!chunk.length||chunk.at(-1).type!=='paragraph')throw new Error('SEGMENT_END_MUST_BE_NORMAL_BODY');
    out.push({photo:sorted[i].photo,after:sorted[i].after,from,to,blocks:chunk});
  }
  if(out.flatMap(x=>x.blocks).length!==blocks.length||out.flatMap(x=>x.blocks).some((b,i)=>b!==blocks[i]))throw new Error('SEGMENTS_NOT_EXACT');
  return out;
}
