import React from 'react';import {useRouter} from './navigation';
export default function Link({href,children,prefetch,...props}:any){const r=useRouter();return <a {...props} href={typeof href==='string'?href:'#'} onClick={e=>{e.preventDefault();r.push(href)}}>{children}</a>}
