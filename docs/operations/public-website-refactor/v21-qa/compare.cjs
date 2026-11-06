const fs = require('node:fs');
const before = require('./before.json');
const after = require('./after.json');
const results = before.map((b, i) => {
  const a = after[i];
  const probes = Object.keys(b.probes).map(key => {
    const x = b.probes[key], y = a.probes[key];
    return { name:key, cssDifferences:Object.keys(x.css).filter(k=>x.css[k]!==y.css[k]).map(k=>({property:k,before:x.css[k],after:y.css[k]})),
      beforeBox:x.box, afterBox:y.box,
      sizeEqual:Math.abs(x.box.width-y.box.width)<.1 && Math.abs(x.box.height-y.box.height)<.1,
      classEqual:x.class===y.class,tagEqual:x.tag===y.tag };
  });
  return {width:b.width,probes,quickCardsAligned:a.quickCards.every(c=>Math.abs(c.height-a.quickCards[0].height)<.1&&Math.abs(c.linkBottom-a.quickCards[0].linkBottom)<.1),overflow:a.overflow,brokenImages:a.brokenImages};
});
fs.writeFileSync(__dirname+'/comparison.json',JSON.stringify(results,null,2));
for(const r of results) console.log(`${r.width}: CSS deltas=${r.probes.reduce((n,p)=>n+p.cssDifferences.length,0)}, resized=${r.probes.filter(p=>!p.sizeEqual).map(p=>p.name).join(',')||'none'}, cardsAligned=${r.quickCardsAligned}`);
