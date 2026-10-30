import React,{useSyncExternalStore} from 'react';
const subscribe=(fn:()=>void)=>{window.addEventListener('popstate',fn);return()=>window.removeEventListener('popstate',fn)};
const snapshot=()=>location.pathname+location.search;
export function usePathname(){useSyncExternalStore(subscribe,snapshot);return location.pathname}
export function useSearchParams(){const s=useSyncExternalStore(subscribe,snapshot);return React.useMemo(()=>new URLSearchParams(s.split('?')[1]||''),[s])}
function navigate(href:string){(window as any).auditNavigations.push(href);if(!href.includes('/session')){(window as any).auditUnmount?.();return;}history.replaceState(null,'',href);window.dispatchEvent(new PopStateEvent('popstate'));}
const router={push:navigate,replace:navigate,back:()=>navigate('/audit-return'),prefetch:()=>Promise.resolve(),refresh:()=>{}};
export function useRouter(){return router}
export function redirect(href:string){navigate(href)}
