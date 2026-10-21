/**
 * Pure and fail-closed Naver canvas integrity checks for the second image.
 * No browser access, no editor mutations, no private Naver API use.
 */
const norm = s => String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const error = (code,msg)=>{const e=new Error(msg||code);e.code=code;throw e;};

function checkTextAndFormatting(snap,title,blocks){
  if(!snap?.canvas)error('CANVAS_MISSING');
  if(norm(snap.title)!==norm(title))error('TITLE_CHANGED');
  if(!Array.isArray(blocks)||blocks.length!==3||blocks[2].type!=='heading')error('FIRST_SEGMENT_PLAN_INVALID');
  const body=(snap.paragraphs||[]).filter(p=>norm(p.text));
  if(body.length!==3)error('FIRST_SEGMENT_COUNT_CHANGED',`actual=${body.length} expected=3`);
  for(let i=0;i<3;i++){
    if(norm(body[i].text)!==norm(blocks[i].text))error('FIRST_SEGMENT_TEXT_CHANGED',`paragraph=${i}`);
    if(!['left','start'].includes(body[i].align))error('FIRST_SEGMENT_ALIGNMENT_CHANGED',`paragraph=${i} align=${body[i].align}`);
  }
  if(!body[2].fullBold || !(body[2].fontSizes||[]).some(v=>parseFloat(v)>=20))
    error('FIRST_HEADING_FORMAT_CHANGED');
  return body;
}

/** Gate BEFORE clicking the toolbar. Must be exactly one photo and complete first segment. */
export function selectUploadNextImageGate(snap,title,blocks){
  const body=checkTextAndFormatting(snap,title,blocks);
  const images=(snap.components||[]).flatMap((c,i)=>c.kind==='image'?[i]:[]);
  if(snap.images?.length!==1 || images.length!==1 || !snap.images[0].loaded)
    error('INITIAL_IMAGE_CHANGED');
  if(body.some(p=>p.componentIndex<=images[0]))error('BODY_NOT_AFTER_COVER');
  return {approvedForSecondImageClick:true,firstImageComponentIndex:images[0],
    lastBodyComponentIndex:body[2].componentIndex,meaningfulParagraphs:3};
}

/** Gate AFTER Naver has created a real loaded image module. */
export function verifySecondImageAfterFirstSegment(snap,title,blocks){
  const body=checkTextAndFormatting(snap,title,blocks);
  const positions=(snap.components||[]).flatMap((c,i)=>c.kind==='image'?[i]:[]);
  if(positions.length!==2 || snap.images?.length!==2)error('SECOND_IMAGE_MODULE_COUNT_INVALID',
    `components=${positions.length},images=${snap.images?.length}`);
  if(snap.images.some(im=>!im.loaded))error('IMAGE_NOT_LOADED');
  if(body.some(p=>p.componentIndex<=positions[0]))error('COVER_NOT_FIRST');
  if(positions[1]<=Math.max(...body.map(p=>p.componentIndex)))
    error('SECOND_IMAGE_NOT_AFTER_FIRST_SEGMENT',`imageIndex=${positions[1]},bodyIndex=${body[2].componentIndex}`);
  if(positions[1]<=positions[0])error('IMAGE_ORDER_CHANGED');
  return {images:2,paragraphs:3,textMatch:true,headingBold:true,leftAligned:true,
    order:'photo1 → body[0..2] → photo2',imageComponentIndexes:positions,
    bodyComponentIndexes:body.map(p=>p.componentIndex)};
}
