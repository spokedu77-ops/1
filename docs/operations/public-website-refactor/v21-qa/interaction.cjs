const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext();const p=await ctx.newPage({viewport:{width:1440,height:1000}});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:3000',{waitUntil:'networkidle'});
 const nav=await p.locator('header nav > a').allTextContents();
 assert.deepEqual(nav,['SPOKEDU 소개','기관·학교 수업','개인·소그룹 수업','SPOMOVE','수업사례']);
 const hrefs=await p.locator('main a,header a').evaluateAll(ns=>[...new Set(ns.map(n=>n.getAttribute('href')))].filter(h=>h.startsWith('/')&&!h.startsWith('//')));
 const links=[];for(const href of hrefs){const r=await ctx.request.get('http://127.0.0.1:3000'+href);links.push({href,status:r.status()});assert.equal(r.status(),200,href);}
 await p.locator('header').screenshot({path:__dirname+'/after/gnb-desktop.png'});
 await p.setViewportSize({width:375,height:1000});await p.goto('http://127.0.0.1:3000/about',{waitUntil:'networkidle'});
 await p.addStyleTag({content:'nextjs-portal{display:none!important}'});
 const button=p.getByRole('button',{name:'메뉴 열기'});await button.click();
 const panel=p.locator('#mobile-nav-panel');assert.equal(await panel.locator('a[aria-current="page"]').innerText(),'SPOKEDU 소개');
 await p.screenshot({path:__dirname+'/after/gnb-mobile.png'});
 await p.keyboard.press('Escape');assert.equal(await panel.isVisible(),false);assert.equal(await button.evaluate(n=>n===document.activeElement),true);
 await button.click();await panel.getByRole('link',{name:'기관·학교 수업',exact:true}).click();await p.waitForURL('**/education');assert.equal(await panel.isVisible(),false);
 const inquiries=[];for(const type of ['dispatch','private','spomove']){await p.goto('http://127.0.0.1:3000/contact?type='+type,{waitUntil:'networkidle'});assert.equal(await p.locator(`[data-track="contact-submit-${type}"]`).count(),1);inquiries.push({type,selected:true,submitted:false});}
 await p.goto('http://127.0.0.1:3000/contact',{waitUntil:'networkidle'});assert.equal(await p.locator('button[type="submit"]').count(),0);
 assert.deepEqual(errors,[]);
 fs.writeFileSync(__dirname+'/interaction.json',JSON.stringify({nav,links,inquiries,bareContactUnselected:true,menu:{active:true,escape:true,focusRestored:true,navigationCloses:true},pageErrors:errors},null,2));
 await b.close();console.log(`GNB/menu/intent PASS; ${links.length} internal links HTTP 200; no form submission`);
})();
