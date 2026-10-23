import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildExplicitEditorialHtml, verifyExplicitEditorialHtml} from './editorial-html.mjs';
const blocks=[
  {type:'paragraph',text:'서울 목원초등학교 PAPS 체력 향상 수업입니다.'},
  {type:'heading',text:'Chapter 01. 움직임 놀이체육'},
  {type:'paragraph',text:'이번 회차의 교육 목표는 기초 체력 향상입니다.'},
  {type:'paragraph',text:'2025년 9월 10일 은빛놀터에서 진행했습니다.'},
];
test('exact order and role for photo followed by body after heading',()=>{
 const out=buildExplicitEditorialHtml(blocks);
 assert.deepEqual(verifyExplicitEditorialHtml(out,blocks), {blocks:4,headings:1,bodies:3,noBodyBoldMarkup:true,bodyExplicitWeight400:true,bodyExplicit16Px:true});
});
test('normal paragraph has explicit font weight AND size, never strong',()=>{
 const out=buildExplicitEditorialHtml(blocks);
 const ps=[...out.matchAll(/<p\b[^>]*>(.*?)<\/p>/gs)].map(x=>x[0]);
 assert.equal(ps.length,3);
 for(const p of ps){assert.match(p,/<span style="font-size:16px !important; font-weight:400 !important/);assert.doesNotMatch(p,/<strong|<b\b/)}
});
test('heading retains bold and 1.5em originally used by converter',()=>{
 assert.match(buildExplicitEditorialHtml(blocks),/<h2 style="font-size: 1.5em; font-weight: bold;/);
});
test('escapes HTML-sensitive input rather than injecting markup',()=>{
 const out=buildExplicitEditorialHtml([{type:'paragraph',text:'A & B <C> "test"'}]);
 assert.match(out,/A &amp; B &lt;C&gt; &quot;test&quot;/);
 assert.doesNotMatch(out,/<C>/);
});
test('rejects unknown structural role',()=>{
 assert.throws(()=>buildExplicitEditorialHtml([{type:'blockquote',text:'x'}]),/UNEXPECTED_BLOCK_TYPE/);
});
test('rejects HTML without explicit body normal style',()=>{
 assert.throws(()=>verifyExplicitEditorialHtml('<p>123</p>',[{type:'paragraph',text:'123'}]),/CLIPBOARD_BODY_STYLE_MISSING/);
});
test('rejects body bold markup',()=>{
 assert.throws(()=>verifyExplicitEditorialHtml('<p style="font-weight:400"><span style="font-weight:400;font-size:16px"><strong>A</strong></span></p>',[{type:'paragraph',text:'A'}]),/CLIPBOARD_BODY_CONTAINS_BOLD/);
});
test('no inline original text changes in renderer',()=>{
 const out=buildExplicitEditorialHtml(blocks);
 const stripped=out.replace(/<[^>]+>/g,'').split('\n');
 assert.deepEqual(stripped,blocks.map(x=>x.text));
});
