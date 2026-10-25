/**
 * Full text-control on the *clipboard content* rather than trusting the
 * active SmartEditor caret's inherited typography after the previous heading.
 * This is intentionally a pure renderer. The reviewed Cheongdam source is never rewritten.
 */
const htmlEscape = s => String(s ?? '')
 .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
 .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const norm = s => String(s ?? '').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();

export function buildExplicitEditorialHtml(blocks) {
  if (!Array.isArray(blocks) || !blocks.length) throw new Error('EMPTY_SEGMENT');
  const result=blocks.map((block,i)=>{
    if (!block || typeof block.text!=='string' || !norm(block.text))
      throw new Error(`INVALID_BLOCK_${i}`);
    let content=htmlEscape(block.text);
    // Preserve visible URL text exactly while requesting real clickable links.
    // The Naver editor may sanitize anchor tags; actual clickability needs browser review.
    if (block.type==='paragraph') {
      const links=['https://spokedu.kr/education','https://pf.kakao.com/_VGWxeb/chat'];
      for (const url of links) content=content.replaceAll(url,`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    }
    if(block.type==='heading'){
      // Replicate the known-working library h2 markup exactly. Only headings
      // carry bold semantics. Naver v6-v15 parsed this as 24px Bold.
      return `<h2 style="font-size: 1.5em; font-weight: bold; text-align:left !important;">${content}</h2>`;
    }
    if(block.type!=='paragraph')throw new Error(`UNEXPECTED_BLOCK_TYPE_${i}`);
    // Two explicit declarations are deliberate: SmartEditor may discard the
    // enclosing p's CSS or copy the active editor's prior heading style.
    // Avoid inheriting bold from a heading located directly before a photo.
    return `<p style="text-align:left !important; font-size:16px !important; font-weight:400 !important; line-height:1.8;"><span style="font-size:16px !important; font-weight:400 !important; font-style:normal !important;">${content}</span></p>`;
  });
  return result.join('\n');
}

export function verifyExplicitEditorialHtml(html,blocks){
  const tags=[...html.matchAll(/<(h2|p)\b[^>]*>/g)].map(m=>m[1]);
  if(tags.length!==blocks.length)throw new Error(`CLIPBOARD_BLOCK_COUNT:${tags.length}/${blocks.length}`);
  for(let i=0;i<blocks.length;i++){
    const role=blocks[i].type==='heading'?'h2':'p';
    if(tags[i]!==role)throw new Error(`CLIPBOARD_ROLE_MISMATCH:${i}`);
  }
  const ps=[...html.matchAll(/<p\b[^>]*>(.*?)<\/p>/gs)].map(m=>m[0]);
  if(ps.length!==blocks.filter(b=>b.type==='paragraph').length)
    throw new Error('CLIPBOARD_BODY_COUNT');
  for(const p of ps){
    if(/<\/?(?:strong|b|h[1-6])\b/i.test(p))throw new Error('CLIPBOARD_BODY_CONTAINS_BOLD');
    const span=p.match(/<span\s+style="([^"]+)"/);
    if(!span||!/font-weight\s*:\s*400\b/.test(span[1])||!/font-size\s*:\s*16px\b/.test(span[1]))
      throw new Error('CLIPBOARD_BODY_STYLE_MISSING');
  }
  return {blocks:tags.length,headings:tags.filter(t=>t==='h2').length,bodies:ps.length,
    noBodyBoldMarkup:true,bodyExplicitWeight400:true,bodyExplicit16Px:true};
}
