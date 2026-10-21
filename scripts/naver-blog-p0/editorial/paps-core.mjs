/** Pure PAPS terminology correction. Never edits historical class records or Drive. */
import { createHash } from 'node:crypto';
export const ARTICLE_ID = '9fad3d9e6f847f36';
export const ORIGINAL_SHA = '57895bcaf6f4bb412bbcf64289d9bde7bb8a34350d12fbeed8b5b2094db77849';
export const digest = value => createHash('sha256').update(value, 'utf8').digest('hex');
export const lf = value => String(value).replace(/\r\n/g,'\n');
export const hasWrongTerm = value => /POPS|팝스/i.test(value);
export const correctPaps = value => String(value).replace(/POPS/gi,'PAPS').replace(/팝스/g,'PAPS');
export const normalize = value => String(value??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
export function reconcileFinalPackage(pkg, parsed, newSha) {
  if (pkg.schema !== 'spokedu.naver.final_po_input.v1') throw new Error('SCHEMA_CHANGED');
  if (!pkg.naverCopy || !Array.isArray(pkg.naverCopy.paragraphs)) throw new Error('MISSING_NAVER_COPY');
  const corrected = structuredClone(pkg);
  corrected.title = parsed.title;
  corrected.body = parsed.bodyPlain;
  corrected.naverCopy.title = parsed.title;
  corrected.naverCopy.body = parsed.bodyPlain;
  corrected.naverCopy.paragraphs = parsed.paragraphsForEditor.slice();
  corrected.source_sha256 = newSha;
  if(Array.isArray(corrected.blocks) && corrected.blocks.length === parsed.blocks.length) {
    corrected.blocks = corrected.blocks.map((b,i)=>({...b,text:parsed.blocks[i].text}));
  }
  // Permissions are preserved. The editor runner still never performs remote save or publication.
  return corrected;
}
export function assertFinal(pkg, parsed, sha) {
  const issues=[];
  if(pkg.source_sha256!==sha) issues.push('SHA_MISMATCH');
  if(normalize(pkg.title)!==normalize(parsed.title)) issues.push('TITLE');
  if(normalize(pkg.body)!==normalize(parsed.bodyPlain)) issues.push('BODY');
  if(normalize(pkg.naverCopy?.body)!==normalize(parsed.bodyPlain)) issues.push('COPY_BODY');
  if(pkg.naverCopy?.paragraphs?.length!==19) issues.push('PARAGRAPHS_COUNT');
  if(parsed.blocks.length!==19) issues.push('MARKDOWN_BLOCKS_COUNT');
  if(parsed.blocks.filter(b=>b.type==='heading').length!==3) issues.push('HEADING_COUNT');
  for(let i=0;i<19;i++) if(normalize(pkg.naverCopy?.paragraphs?.[i])!==normalize(parsed.blocks[i]?.text)) issues.push('PARAGRAPH_'+i);
  if(hasWrongTerm(parsed.title)||parsed.blocks.some(b=>hasWrongTerm(b.text))) issues.push('WRONG_TERM');
  if(issues.length) throw new Error('FINAL_RECONCILIATION_FAILED:'+issues.join(','));
  return {paragraphCount:19,headingCount:3,terminology:'PAPS'};
}
