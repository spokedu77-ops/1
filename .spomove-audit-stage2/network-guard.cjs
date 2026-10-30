const deny=u=>{const s=String(u?.href||u?.hostname||u);if(!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(s))throw new Error('AUDIT_EXTERNAL_NETWORK_BLOCKED');};
const realFetch=globalThis.fetch;globalThis.fetch=(u,o)=>{deny(typeof u==='string'||u instanceof URL?u:u.url);return realFetch(u,o)};
for(const protocol of ['http','https']){const m=require(protocol);for(const key of ['request','get']){const original=m[key];m[key]=function(u,...args){deny(typeof u==='object'&&!(u instanceof URL)?protocol+'://'+(u.hostname||u.host||''):u);return original.call(this,u,...args)}}}
