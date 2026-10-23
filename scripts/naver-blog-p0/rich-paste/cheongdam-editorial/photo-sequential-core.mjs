/** Pure integrity and insertion gate for all SPOKEDU Cheongdam photo-first stages. */
const norm=s=>String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
function fail(code,info=''){const e=new Error(info||code);e.code=code;throw e;}
export const IMAGE_AFTER=Object.freeze([-1,5,9]);
export const HEADING_INDEXES=Object.freeze([2,6,10]);
export function inspectSequentialCanvas(snap,title,expectedBlocks,imageCount){
  if(!snap?.canvas)fail('CANVAS_NOT_READY');
  if(norm(snap.title)!==norm(title))fail('TITLE_CHANGED');
  if(!Number.isInteger(imageCount)||imageCount<1||imageCount>3)fail('INVALID_IMAGE_GATE');
  const photos=(snap.components||[]).flatMap((el,i)=>el.kind==='image'?[i]:[]);
  if(photos.length!==imageCount||snap.images?.length!==imageCount)
    fail('PHOTO_COUNT_CHANGED',`expected=${imageCount}, modules=${photos.length}, photos=${snap.images?.length}`);
  if(snap.images.some(im=>!im.loaded))fail('PHOTO_NOT_LOADED');
  if(photos.some((c,i)=>i>0&&c<=photos[i-1]))fail('PHOTO_ORDER_CHANGED');
  const body=(snap.paragraphs||[]).filter(v=>norm(v.text));
  if(body.length!==expectedBlocks.length)fail('TEXT_COUNT_CHANGED',`expected=${expectedBlocks.length},actual=${body.length}`);
  let previousComponent=-1;
  const checked=[];
  for(let i=0;i<body.length;i++){
    const el=body[i],expected=expectedBlocks[i];
    if(norm(el.text)!==norm(expected.text))fail('TEXT_CONTENT_CHANGED',`block=${i} text=${JSON.stringify(el.text?.slice(0,100))}`);
    if(el.kind!=='text'||el.componentIndex<previousComponent)fail('TEXT_COMPONENT_ORDER_BROKEN',`block=${i}`);
    previousComponent=el.componentIndex;
    if(!['left','start'].includes(el.align))fail('TEXT_ALIGNMENT_CHANGED',`block=${i},align=${el.align}`);
    if(expected.type==='heading'){
      if(!el.fullBold)fail('HEADING_BOLD_LOST',`block=${i}`);
      if(!(el.fontSizes||[]).some(v=>parseFloat(v)>=20))fail('HEADING_SIZE_LOST',`block=${i},sizes=${el.fontSizes}`);
    } else {
      // 2026-10-21 v14 false PASS: following a heading/photo, Naver may inherit
      // 24px bold into ordinary prose. Validate actual rendered text leaf styles.
      if(el.fullBold || (el.fontWeights||[]).some(w=>Number(w)>=600))
        fail('BODY_BOLD_LEAK',`block=${i},weights=${JSON.stringify(el.fontWeights||[])},text=${JSON.stringify(el.text?.slice(0,70))}`);
      const sizes=el.fontSizes||[];
      if(!sizes.length || sizes.some(v=>!Number.isFinite(parseFloat(v))||parseFloat(v)>18))
        fail('BODY_FONT_SIZE_LEAK',`block=${i},sizes=${JSON.stringify(sizes)},text=${JSON.stringify(el.text?.slice(0,70))}`);
    }
    const segmentIndex=IMAGE_AFTER.findLastIndex(after=>i>after);
    if(segmentIndex<0||segmentIndex>=imageCount)fail('PARAGRAPH_PHOTO_SEGMENT_INVALID',`block=${i} photoSegment=${segmentIndex}`);
    if(el.componentIndex<=photos[segmentIndex])fail('TEXT_BEFORE_ITS_PHOTO',`block=${i},component=${el.componentIndex},photo=${photos[segmentIndex]}`);
    if(segmentIndex+1<imageCount&&el.componentIndex>=photos[segmentIndex+1])
      fail('TEXT_AFTER_NEXT_PHOTO',`block=${i},component=${el.componentIndex},nextPhoto=${photos[segmentIndex+1]}`);
    checked.push(el.componentIndex);
  }
  for(let j=1;j<imageCount;j++){
    // Previous segment must be complete before the next photograph.
    const cutoff=IMAGE_AFTER[j];
    if(body.length<cutoff+1)fail('PHOTO_BEFORE_SEGMENT_COMPLETE',`photo=${j+1}`);
    if(body[cutoff].componentIndex>=photos[j])fail('PHOTO_NOT_AFTER_PRIOR_BODY',`photo=${j+1}`);
  }
  return {images:imageCount,paragraphs:body.length,headings:body.filter((_,i)=>expectedBlocks[i]?.type==='heading').length,
    textMatch:true,leftAligned:true,headingFormatting:true,imageComponentIndexes:photos,
    paragraphComponentIndexes:checked};
}
export function findNativeTailAnchor(snap,title,expectedBlocks,imageCount){
  const integrity=inspectSequentialCanvas(snap,title,expectedBlocks,imageCount);
  const lastPhoto=integrity.imageComponentIndexes.at(-1);
  const tail=(snap.paragraphs||[]).filter(p=>p.kind==='text'&&p.bodyLocatorIndex>=0&&
    p.componentIndex>lastPhoto&&!norm(p.text));
  if(!tail.length)fail('POST_PHOTO_NATIVE_ANCHOR_MISSING','No Naver-owned empty text paragraph after last photo; no Enter allowed.');
  const anchor=tail[0];
  return {bodyLocatorIndex:anchor.bodyLocatorIndex,componentIndex:anchor.componentIndex,
    imageComponentIndex:lastPhoto,candidateCount:tail.length};
}
export function gateNextImage(snap,title,blocks,imageCount){
  const proof=inspectSequentialCanvas(snap,title,blocks,imageCount);
  const lastBlockIdx=IMAGE_AFTER[imageCount];
  if(blocks.length!==lastBlockIdx+1)fail('IMAGE_INSERT_STAGE_INVALID',`imageCount=${imageCount},body=${blocks.length},expected=${lastBlockIdx+1}`);
  const lastImagePos=proof.imageComponentIndexes.at(-1);
  const lastBodyPos=proof.paragraphComponentIndexes.at(-1);
  if(lastBodyPos<=lastImagePos)fail('NEXT_IMAGE_NO_TEXT_TAIL');
  return {imageCount,bodyCount:blocks.length,lastBodyComponentIndex:lastBodyPos};
}
