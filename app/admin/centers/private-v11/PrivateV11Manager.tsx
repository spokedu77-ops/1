'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { toast } from 'sonner';
import { CONSUMING, daysSince, getHeadlineStats, getPaymentInfo, getSessionInfo, getWeekDays, isScheduledOn } from './core';
import type { Enrollment, Guardian, LessonLog, PrivateSnapshot, SaveGuardianChoice, Unit } from './types';
import { emptySnapshot } from './types';
import './v11.css';

const DAYS='일월화수목금토';
const ATTENDED=['출석','보강','당일결석','사전결석','우천취소/연기'] as const;
const MODULES=[
  {key:'checklist',name:'오늘 체크리스트',desc:'시간순 실행 도구'},
  {key:'week',name:'주간 뷰',desc:'요일별 미리보기'},
  {key:'logs',name:'수업일지',desc:'필드 입력'},
  {key:'feedback',name:'발송 이력',desc:'학부모 카톡 발송 여부'},
  {key:'report',name:'월간 리포트',desc:'학부모 공유용'},
  {key:'enrollment',name:'잔여 회차',desc:'등록 이력 기반 계산'},
  {key:'payment',name:'결제 이력 · 예정',desc:'매출집계는 SPOKEDU 정산'},
  {key:'memo',name:'현장 메모',desc:'현관 비번·주차'},
  {key:'trash',name:'휴지통',desc:'삭제 복원'},
] as const;
type ModuleKey=typeof MODULES[number]['key'];
type Tab='students'|'checklist'|'week'|'logs'|'trash';
const defaultSettings=Object.fromEntries(MODULES.map(x=>[x.key,true])) as Record<ModuleKey,boolean>;
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const newUnit=():Unit=>({id:'',revision:0,name:'',ageGrade:'',classType:'1:1 개인',coach:'',status:'active',neighborhood:'',placeType:'아파트 커뮤니티',address:'',subject:'',scheduleDays:[],scheduleTime:'',weekPattern:'every',memo:''});
const newEnrollment=(studentId=''):Enrollment=>({id:'',revision:0,studentId,enrolledAt:today(),sessions:0,amount:0,paidAt:today(),nextDueDate:'',expiresAt:'',memo:'',canceledAt:null});
const newLog=(studentId=''):LessonLog=>({id:'',revision:0,studentId,date:today(),attended:'출석',equipment:'',content:'',homework:'',deletedAt:null,sentAt:null});
const clampPhone=(phone:string)=>phone.replace(/[-\s]/g,'');
const safeCsvCell=(v:unknown)=>{const s=String(v??'');const guarded=/^[\s]*[=+@-]/.test(s)?`'${s}`:s;return `"${guarded.replace(/"/g,'""')}"`;};
function download(text:string,name:string,type:string){const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function requestApi(body:Record<string,unknown>){
  const response=await fetch('/api/admin/private-v11',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',cache:'no-store',body:JSON.stringify(body)});
  const result=await response.json().catch(()=>({error:'서버 응답을 확인하지 못했습니다.'})) as {ok?:boolean;error?:string;code?:string;result?:{id:string;revision:number}};
  if(!response.ok||!result.ok)throw new Error(result.error??`요청 실패 (${response.status})`);
  return result.result;
}
function useDialog(open:boolean){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{const el=ref.current;if(!el)return;if(open&&!el.open)el.showModal();if(!open&&el.open)el.close();},[open]);return ref;}
function Field({label,children,full=false}: {label:string;children:ReactNode;full?:boolean}){return <div className={`field${full?' full':''}`}><label>{label}</label>{children}</div>;}
function Badge({children,tone='muted'}:{children:ReactNode;tone?:'ok'|'bad'|'warn'|'muted'}){return <span className={`badge ${tone}`}>{children}</span>;}
const toastError=(e:unknown)=>toast.error(e instanceof Error?e.message:'요청을 완료하지 못했습니다.');

export default function PrivateV11Manager({onDirtyChange}:{onDirtyChange?:(dirty:boolean)=>void}={}){
  const [db,setDb]=useState<PrivateSnapshot>(emptySnapshot);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [tab,setTab]=useState<Tab>('students');
  const [search,setSearch]=useState('');
  const [range,setRange]=useState<'all'|'today'|'week'>('all');
  const [neighborhood,setNeighborhood]=useState('');
  const [statusFilter,setStatusFilter]=useState('');
  const [sortBy,setSortBy]=useState<'name'|'neighborhood'|'remain'>('name');
  const [group,setGroup]=useState(false);
  const [weekOffset,setWeekOffset]=useState(0);
  const [logFilter,setLogFilter]=useState('');
  const [logFrom,setLogFrom]=useState('');
  const [logTo,setLogTo]=useState('');
  const [settings,setSettings]=useState<Record<ModuleKey,boolean>>(defaultSettings);
  const [expanded,setExpanded]=useState<Record<string,boolean>>({});
  const [editUnit,setEditUnit]=useState<Unit|null>(null);
  const [guardianForm,setGuardianForm]=useState<{relation:string;phone:string;selectedId:string}>({relation:'어머님',phone:'',selectedId:''});
  const [draftEnroll,setDraftEnroll]=useState<Enrollment[]>([]);
  const [newEnr,setNewEnr]=useState<Enrollment>(newEnrollment());
  const [editLog,setEditLog]=useState<LessonLog|null>(null);
  const [reportId,setReportId]=useState<string|null>(null);
  const [showSettings,setShowSettings]=useState(false);
  const [savingText,setSavingText]=useState('');
  const [backupDue,setBackupDue]=useState(false);
  const unitOpeningHash=useRef('');const logOpeningHash=useRef('');
  useEffect(()=>{onDirtyChange?.(editUnit!==null||editLog!==null||busy);},[editUnit,editLog,busy,onDirtyChange]);
  useEffect(()=>{if(!editUnit&&!editLog&&!busy)return;const guard=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[editUnit,editLog,busy]);
  const unitDialog=useDialog(editUnit!==null);
  const logDialog=useDialog(editLog!==null);
  const reportDialog=useDialog(reportId!==null);
  const settingsDialog=useDialog(showSettings);

  const load=async()=>{
    setLoading(true);setError('');
    try{const response=await fetch('/api/admin/private-v11',{credentials:'include',cache:'no-store'});
      const json=await response.json().catch(()=>({error:'응답 오류'})) as {data?:PrivateSnapshot;error?:string};
      if(!response.ok||!json.data)throw new Error(json.error??`조회 실패 (${response.status})`);
      setDb(json.data);
      const previous=localStorage.getItem('spokedu.private.v11.last-backup');
      const days=previous?Math.floor((Date.now()-new Date(previous).getTime())/86400000):Infinity;
      setBackupDue(json.data.units.length>0&&(!previous||days>=7));
    }catch(e){setError(e instanceof Error?e.message:'DB 조회 실패');}
    finally{setLoading(false);}
  };
  useEffect(()=>{void load();try{const raw=window.localStorage.getItem('spokedu.private.v11.display.settings');if(raw){const obj=JSON.parse(raw) as Record<string,boolean>;setSettings(prev=>Object.fromEntries(Object.keys(prev).map(k=>[k,typeof obj[k]==='boolean'?obj[k]:prev[k as ModuleKey]])) as Record<ModuleKey,boolean>);}}catch{/* display preference only */}},[]);
  const toggleSetting=(key:ModuleKey)=>setSettings(old=>{const next={...old,[key]:!old[key]};try{localStorage.setItem('spokedu.private.v11.display.settings',JSON.stringify(next));}catch{}return next;});
  const refresh=async()=>{await load();};
  const change=async(body:Record<string,unknown>,message:string)=>{
    if(busy)throw new Error('저장 중입니다.');
    setBusy(true);setSavingText(message);
    try{const result=await requestApi(body);await refresh();toast.success(message);return result;}
    finally{setBusy(false);setSavingText('');}
  };
  const active=db.units.filter(u=>!u.deletedAt);
  const visibleLogs=db.logs.filter(l=>!l.deletedAt);
  const unitMap=useMemo(()=>new Map(db.units.map(u=>[u.id,u])),[db.units]);
  const guardianOf=(u:Unit):Guardian|undefined=>{
    const link=db.links.filter(l=>l.unitId===u.id).sort((a,b)=>a.position-b.position)[0];
    return db.guardians.find(g=>g.id===link?.guardianId);
  };
  const stats=getHeadlineStats(db.units,db.enrollments,db.logs);
  const neighborhoods=[...new Set(active.map(u=>u.neighborhood).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
  const filtered=active.filter(u=>{
    if(neighborhood&&u.neighborhood!==neighborhood)return false;
    const sess=getSessionInfo(u.id,db.enrollments,db.logs),pay=getPaymentInfo(u.id,db.enrollments,today());
    if(statusFilter==='active'&&u.status!=='active')return false;
    if(statusFilter==='paused'&&u.status!=='paused')return false;
    if(statusFilter==='unpaid'&&pay.unpaidAmount<=0)return false;
    if(statusFilter==='renewal'&&sess.remain>1)return false;
    if(range==='today'&&!isScheduledOn(u,new Date()))return false;
    if(range==='week'&&!getWeekDays().some(d=>isScheduledOn(u,d)))return false;
    const g=guardianOf(u);
    if(search.trim()&&![u.name,u.ageGrade,u.classType,u.coach,u.address,u.neighborhood,u.placeType,u.subject,u.memo,g?.phone,g?.relation].join(' ').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))return false;
    return true;
  }).sort((a,b)=>sortBy==='name'?a.name.localeCompare(b.name,'ko'):sortBy==='neighborhood'?(a.neighborhood.localeCompare(b.neighborhood,'ko')||a.name.localeCompare(b.name,'ko')):getSessionInfo(a.id,db.enrollments,db.logs).remain-getSessionInfo(b.id,db.enrollments,db.logs).remain);
  const weekDays=getWeekDays(weekOffset);
  const filteredLogs=visibleLogs.filter(l=>(!logFilter||l.studentId===logFilter)&&(!logFrom||l.date>=logFrom)&&(!logTo||l.date<=logTo)).sort((a,b)=>b.date.localeCompare(a.date));
  const trashCount=db.units.filter(u=>u.deletedAt).length+db.logs.filter(l=>l.deletedAt).length;
  const currentUnit=reportId?unitMap.get(reportId):undefined;
  const reportLogs=reportId?visibleLogs.filter(l=>l.studentId===reportId&&l.date.startsWith(today().slice(0,7))).sort((a,b)=>a.date.localeCompare(b.date)):[];

  const openUnit=(unit?:Unit)=>{
    const u=unit?{...unit,scheduleDays:[...unit.scheduleDays]}:newUnit();
    const g=unit?guardianOf(unit):undefined;
    setEditUnit(u);setGuardianForm({relation:g?.relation??'어머님',phone:g?.phone??'',selectedId:g?.id??''});
    setDraftEnroll(unit?db.enrollments.filter(e=>e.studentId===unit.id&&!e.canceledAt).map(x=>({...x})):[]);
    const en=unit?db.enrollments.filter(e=>e.studentId===unit.id&&!e.canceledAt).map(x=>({...x})):[];
    const guardian={relation:g?.relation??'어머님',phone:g?.phone??'',selectedId:g?.id??''};
    unitOpeningHash.current=JSON.stringify([u,guardian,en,newEnrollment(unit?.id||'')]);
    setNewEnr(newEnrollment(unit?.id||''));
  };
  const addDraftEnr=()=>{
    if(!Number.isInteger(newEnr.sessions)||newEnr.sessions<1){toast.error('등록 회차를 입력하세요.');return;}
    if(!Number.isInteger(newEnr.amount)||newEnr.amount<0){toast.error('금액을 확인하세요.');return;}
    setDraftEnroll(old=>[...old,{...newEnr,id:'',studentId:editUnit?.id??''}]);setNewEnr(newEnrollment(editUnit?.id||''));
  };
  const saveUnit=async(event:FormEvent)=>{
    event.preventDefault();if(!editUnit)return;
    if(!editUnit.name.trim()){toast.error('이름은 필수입니다.');return;}
    const original=editUnit.id?db.units.find(x=>x.id===editUnit.id):undefined;
    const originalGuardian=original?guardianOf(original):undefined;
    let guardian:SaveGuardianChoice={mode:'keep'};
    if(guardianForm.selectedId&&guardianForm.selectedId!==originalGuardian?.id)guardian={mode:'existing',guardianId:guardianForm.selectedId};
    else if(originalGuardian&&guardianForm.selectedId===originalGuardian.id){
      if(guardianForm.phone!==originalGuardian.phone||guardianForm.relation!==originalGuardian.relation)guardian={mode:'edit',guardianId:originalGuardian.id,revision:originalGuardian.revision,phone:guardianForm.phone,relation:guardianForm.relation};
    }else if(guardianForm.phone.trim())guardian={mode:'new',phone:guardianForm.phone,relation:guardianForm.relation};
    else if(originalGuardian)guardian={mode:'clear'};
    const removedIds=(original?db.enrollments.filter(e=>e.studentId===original.id&&!e.canceledAt&&!draftEnroll.some(d=>d.id===e.id)):[]);
    const adds=draftEnroll.filter(e=>!e.id);
    if(busy)return;
    setBusy(true);setSavingText('수강생 정보를 저장하는 중입니다.');
    try {
      // Atomic RPC: unit, guardian, new enrollments and cancellations all commit or all roll back.
      await requestApi({action:'saveUnit',unit:editUnit,guardian,addEnrollments:adds,cancelEnrollments:removedIds.map(e=>({id:e.id,revision:e.revision}))});
      await refresh();setEditUnit(null);toast.success('수강생 정보를 저장했습니다.');
    }catch(e){toastError(e);}finally{setBusy(false);setSavingText('');}

  };
  const openLog=(l?:LessonLog,studentId?:string)=>{const next=l?{...l}:newLog(studentId);logOpeningHash.current=JSON.stringify(next);setEditLog(next);};
  const closeUnit=()=>{if(editUnit&&unitOpeningHash.current!==JSON.stringify([editUnit,guardianForm,draftEnroll,newEnr])&&!confirm('저장하지 않은 변경사항을 버릴까요?'))return;setEditUnit(null);};
  const closeLog=()=>{if(editLog&&logOpeningHash.current!==JSON.stringify(editLog)&&!confirm('저장하지 않은 수업일지를 버릴까요?'))return;setEditLog(null);};
  const saveLog=async(event:FormEvent)=>{event.preventDefault();if(!editLog)return;
    if(!editLog.studentId||!editLog.date){toast.error('수강생과 일자는 필수입니다.');return;}
    const duplicate=db.logs.find(x=>x.studentId===editLog.studentId&&x.date===editLog.date&&!x.deletedAt&&x.id!==editLog.id);
    if(duplicate&&!window.confirm(`${editLog.date}에 이미 일지가 있습니다. 추가할까요?`))return;
    try{await change({action:'saveLog',value:editLog},'수업일지를 저장했습니다.');setEditLog(null);}catch(e){toastError(e);}
  };
  const mutate=async(action:'softDelete'|'restore'|'markSent',entity:'unit'|'log',id:string,revision:number)=>{
    if(action==='softDelete'&&!window.confirm('휴지통으로 이동하시겠습니까?'))return;
    try{await change({action,entity,id,revision},action==='restore'?'복원했습니다.':action==='markSent'?'발송 완료로 표시했습니다.':'휴지통으로 이동했습니다.');}
    catch(e){toastError(e);}
  };
  const copy=(s:string)=>navigator.clipboard.writeText(s).then(()=>toast.success('복사되었습니다.')).catch(()=>toast.error('클립보드 접근에 실패했습니다.'));
  const feedback=(l:LessonLog)=>{const u=unitMap.get(l.studentId),info=u?getSessionInfo(u.id,db.enrollments,db.logs):null;return `[SPOKEDU 피드백]\n■ 학생: ${u?.name??'수강생'} (${u?.subject||'체육'})\n■ 일자: ${l.date} (${l.attended})\n${settings.enrollment&&info?`■ 잔여: ${info.remain}/${info.total}회\n`:''}■ 교구: ${l.equipment||'기본'}\n\n[프로그램]\n${l.content||'-'}\n\n[피드백]\n${l.homework||'오늘 수업 안전하게 마쳤습니다!'}\n\n- 스포키듀 -`;};
  const reportText=()=>{if(!currentUnit)return '';const info=getSessionInfo(currentUnit.id,db.enrollments,db.logs);return `[SPOKEDU ${today().slice(0,7).replace('-','년 ')}월 리포트]\n■ 학생: ${currentUnit.name} (${currentUnit.subject||'체육'})\n■ 수업: ${reportLogs.length}회\n${settings.enrollment?`■ 잔여: ${info.remain}/${info.total}회\n`:''}[기록]\n${reportLogs.map(l=>`· ${l.date} (${l.attended}) ${l.content}`).join('\n')||'없음'}\n\n- 스포키듀 -`;};
  const exportJson=()=>{download(JSON.stringify({students:db.units.map(u=>({...u,guardianIds:db.links.filter(l=>l.unitId===u.id).map(l=>l.guardianId)})),guardians:db.guardians,enrollments:db.enrollments,logs:db.logs},null,2),`SPOKEDU_백업_${today()}.json`,'application/json');try{localStorage.setItem('spokedu.private.v11.last-backup',new Date().toISOString());}catch{}setBackupDue(false);};
  const exportCsv=()=>{
    const headers=['이름','연령','수업형태','담당코치','보호자관계','보호자연락처','동네','장소','주소','종목','요일','시간','반복','상태','등록회차','사용회차','잔여회차','총금액(만)','입금액(만)','미납(만)','다음결제','최근수업일','메모'];
    const rows=active.map(u=>{const sess=getSessionInfo(u.id,db.enrollments,db.logs),pay=getPaymentInfo(u.id,db.enrollments,today()),g=guardianOf(u);return [u.name,u.ageGrade,u.classType,u.coach,g?.relation,g?.phone,u.neighborhood,u.placeType,u.address,u.subject,u.scheduleDays.map(d=>DAYS[d]).join('·'),u.scheduleTime,u.weekPattern,u.status,sess.total,sess.used,sess.remain,pay.totalAmount,pay.paidAmount,pay.unpaidAmount,pay.upcoming,u.lastClassDate,u.memo];});
    download('\ufeff'+[headers,...rows].map(row=>row.map(safeCsvCell).join(',')).join('\n'),`SPOKEDU_수강생_${today()}.csv`,'text/csv;charset=utf-8');
  };
  const exportLogs=()=>{const headers=['날짜','학생','출석','교구','내용','피드백','발송'];download('\ufeff'+[headers,...filteredLogs.map(l=>[l.date,unitMap.get(l.studentId)?.name,l.attended,l.equipment,l.content,l.homework,l.sentAt?'발송':'미발송'])].map(row=>row.map(safeCsvCell).join(',')).join('\n'),`SPOKEDU_수업일지_${today()}.csv`,'text/csv;charset=utf-8');};

  useEffect(()=>{const handler=(e:KeyboardEvent)=>{if(!(e.ctrlKey||e.metaKey))return;if(e.key.toLowerCase()==='k'){e.preventDefault();document.querySelector<HTMLInputElement>('.private-v11 #privateSearch')?.focus();}if(e.key.toLowerCase()==='n'){e.preventDefault();openUnit();}};document.addEventListener('keydown',handler);return()=>document.removeEventListener('keydown',handler);},[db]); // eslint-disable-line react-hooks/exhaustive-deps

  const unitCard=(u:Unit)=>{
    const g=guardianOf(u),sess=getSessionInfo(u.id,db.enrollments,db.logs),pay=getPaymentInfo(u.id,db.enrollments,today());
    const scheduled=isScheduledOn(u,new Date()),paused=u.status==='paused',exhausted=!paused&&sess.remain<=0;
    const meta=[u.scheduleDays.map(d=>DAYS[d]).join('·')+(u.scheduleTime?' '+u.scheduleTime:''),u.subject].filter(Boolean).join(' · ');
    const hrefPhone=g?.phone?`tel:${g.phone.replace(/[^0-9+]/g,'')}`:'';
    const mapUrl=u.address?`https://map.kakao.com/?q=${encodeURIComponent(u.address)}`:'';
    const due=pay.unpaidAmount>0?<Badge tone="bad">미납 {pay.unpaidAmount}만</Badge>:pay.paidAmount>0?<Badge tone="ok">결제완료</Badge>:null;
    return <div className={`student-card${scheduled?' today':''}${paused?' paused':''}${exhausted?' exhausted':''}`} key={u.id}>
      <div className="card-top" onClick={()=>setExpanded(x=>({...x,[u.id]:!x[u.id]}))} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setExpanded(x=>({...x,[u.id]:!x[u.id]}));}}} aria-expanded={!!expanded[u.id]}>
        <div className="card-top-1"><span className="card-avatar">{u.name.charAt(0)||'?'}</span><span className="card-name">{u.name}</span>{paused&&<Badge>휴강</Badge>}<span className="card-meta-line">{meta}</span></div>
        <div className="card-top-2">{[u.neighborhood,g?.phone?`${g.relation||'보호자'} ${g.phone}`:''].filter(Boolean).join(' · ')}</div>
      </div>
      {settings.enrollment&&<div className={`session-block ${sess.level}`}><div className="session-header"><span className="session-label">잔여 회차</span><span className={`session-count ${sess.level}`}>{sess.remain} / {sess.total}회</span></div><div className="session-bar"><div className={`session-fill ${sess.level}`} style={{width:`${sess.pct}%`}}/></div>{!paused&&sess.remain<=1&&<div className={`session-note${sess.remain<0?' bad':''}`}>{sess.remain<0?`${-sess.remain}회 초과사용`:sess.remain===0?'재등록 필요':'재등록 임박'}</div>}</div>}
      {settings.payment&&<div className="payment-row"><div className="payment-info">{due}{pay.totalAmount>0&&<span className="fee-text">{pay.totalAmount.toLocaleString()}만</span>}{pay.lastPaidAt&&<span className="payment-date">· {pay.lastPaidAt} 입금</span>}{pay.upcoming&&<span className="next-due">· 다음 {pay.upcoming}</span>}</div>{u.lastClassDate&&<span className="last-class">최근 {u.lastClassDate}{daysSince(u.lastClassDate)!=null?` (${daysSince(u.lastClassDate)}일전)`:''}</span>}</div>}
      <div className="card-actions">{hrefPhone&&<a className="card-btn" href={hrefPhone}>📞 전화</a>}{mapUrl&&<a className="card-btn" href={mapUrl} target="_blank" rel="noopener noreferrer">🗺 길찾기</a>}<button className="card-btn" onClick={()=>openLog(undefined,u.id)}>📝 일지</button><button className="card-btn more" aria-label={`${u.name} 상세`} onClick={()=>setExpanded(x=>({...x,[u.id]:!x[u.id]}))}>⋯</button></div>
      {expanded[u.id]&&<div className="card-details" style={{display:'flex'}}>{([['주소',u.address],['장소',u.placeType],['연령',u.ageGrade],['형태',u.classType],['코치',u.coach]] as const).filter(([,v])=>v).map(([label,value])=><div className="detail-row" key={label}><strong>{label}</strong><span>{value}</span></div>)}{settings.memo&&u.memo&&<div className="detail-memo">{u.memo}</div>}<div style={{display:'flex',gap:6,flexWrap:'wrap'}}><button className="card-btn" onClick={()=>openUnit(u)}>✏️ 수정</button>{settings.report&&<button className="card-btn" onClick={()=>setReportId(u.id)}>📄 리포트</button>}<button className="card-btn" style={{color:'var(--red)'}} onClick={()=>void mutate('softDelete','unit',u.id,u.revision)}>🗑 삭제</button></div></div>}
    </div>;
  };

  return <div className="private-v11" aria-label="프라이빗 레슨 매니저 v11">
    <header className="app-header"><div className="brand-wrap"><div><span className="brand-title">프라이빗 레슨 매니저</span><span className="brand-sub">v11 · 개인 수업 DB</span></div></div><div className="header-actions">
      <button type="button" onClick={()=>setShowSettings(true)} title="모듈 사용 설정">⚙️</button>
      <button type="button" disabled title="운영 DB에는 예시 데이터 입력을 허용하지 않습니다.">⚡</button>
      <button type="button" onClick={exportJson} disabled={!!error||loading} title="백업 JSON 내려받기">💾</button>
      <button type="button" disabled title="서버 전체 복원은 별도 승인 후 제공">📥</button>
      <button type="button" onClick={exportCsv} disabled={!!error||loading} title="CSV">📊</button>
      <button type="button" onClick={()=>window.print()} title="인쇄">🖨</button>
      <button type="button" onClick={()=>void load()} disabled={loading||busy}>↻ 새로고침</button>
    </div></header>
    {backupDue&&!loading&&!error&&<div id="backupBanner" className="show"><span>⚠️ 마지막 백업이 7일 이상 지났거나 아직 백업하지 않았습니다.</span><button onClick={exportJson}>지금 백업</button></div>}
    {savingText&&<div role="status" className="form-error">{savingText} · 저장 중</div>}
    {loading&&<p className="hint" role="status">개인 수업 DB를 불러오는 중입니다.</p>}
    {error&&<div role="alert" className="form-error">{error} <button type="button" onClick={()=>void load()}>다시 시도</button></div>}
    {!loading&&!error&&<main>
      <section className="stats">
        {([['활성 수강생 🏃',stats.active,'팀',''],['오늘 수업 📅',stats.today,'건','green'],['이번주 🗓',stats.thisWeek,'건',''],['재등록 필요 🔔',stats.renewal,'팀','amber'],['미납 💳',stats.unpaid,'팀','red']] as const).map(([title,count,unit,tone])=><div className={`stat ${tone}`} key={title}><div className="stat-label">{title}</div><div className="stat-value">{count}<small>{unit}</small></div></div>)}
      </section>
      <div className="tabs" role="tablist">{([['students','수강생 / 팀'],['checklist','오늘 체크리스트'],['week','주간 뷰'],['logs','수업일지'],['trash',`휴지통 ${trashCount}`]] as const).filter(([k])=>k==='students'||k==='trash'||settings[k as ModuleKey]).map(([key,label])=><button role="tab" aria-selected={tab===key} key={key} className={`tab${tab===key?' active':''}`} onClick={()=>setTab(key)}>{label}</button>)}</div>
      {tab==='students'&&<section className="panel"><div className="toolbar">
        <input id="privateSearch" type="search" placeholder="🔍 이름, 종목, 동네, 코치, 보호자 검색" value={search} onChange={e=>setSearch(e.target.value)}/>
        <div className="chips">{(['all','today','week'] as const).map((k,i)=><button key={k} className={`chip${range===k?' active':''}`} onClick={()=>setRange(k)}>{['전체','오늘','이번주'][i]}</button>)}</div>
        <select value={neighborhood} onChange={e=>setNeighborhood(e.target.value)} aria-label="동네"><option value="">📍 동네</option>{neighborhoods.map(n=><option key={n} value={n}>{n}</option>)}</select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} aria-label="상태"><option value="">📊 상태</option>{[['active','활성'],['paused','휴강'],['unpaid','미납'],['renewal','재등록 필요']].map(([v,label])=><option value={v} key={v}>{label}</option>)}</select>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value as typeof sortBy)} aria-label="정렬"><option value="name">이름순</option><option value="neighborhood">동네순</option><option value="remain">잔여 적은순</option></select>
        <label className="check"><input type="checkbox" checked={group} onChange={e=>setGroup(e.target.checked)}/> 동네 묶기</label>
        <button className="primary" style={{marginLeft:'auto'}} onClick={()=>openUnit()} disabled={busy}>+ 신규</button>
      </div><div className="card-grid">{filtered.length===0?<div className="empty"><h3>{active.length===0?'등록된 수업이 없습니다':'조건에 맞는 수업이 없습니다'}</h3><button className="primary" onClick={()=>openUnit()}>+ 신규</button></div>:filtered.map((u,i)=><div key={u.id} style={{display:'contents'}}>{group&&(i===0||u.neighborhood!==filtered[i-1].neighborhood)&&<div className="group-header">📍 {u.neighborhood||'지역 미지정'} <span className="count">{filtered.filter(x=>x.neighborhood===u.neighborhood).length}</span></div>}{unitCard(u)}</div>)}</div></section>}
      {tab==='checklist'&&<section className="panel"><div className="toolbar"><strong style={{flex:1}}>오늘({today()}) 체크리스트</strong><button className="small" onClick={()=>void refresh()}>🔄</button></div><div className="checklist">{active.filter(u=>u.status!=='paused'&&isScheduledOn(u,new Date())).sort((a,b)=>a.scheduleTime.localeCompare(b.scheduleTime)).map(u=>{const log=visibleLogs.find(l=>l.studentId===u.id&&l.date===today());return <div key={u.id} className={`check-item${log?' done':''}`}><span className="check-time">{u.scheduleTime||'--:--'}</span><div style={{flex:1}}><span className="check-name">{u.name}</span><div className="check-meta">{u.subject} · {u.neighborhood} · 잔여 {getSessionInfo(u.id,db.enrollments,db.logs).remain}회</div></div><div>{log?<Badge tone="ok">완료 ({log.attended})</Badge>:<button className="status-btn scheduled" onClick={()=>openLog(undefined,u.id)}>📝 일지</button>}</div></div>;})}{active.filter(u=>u.status!=='paused'&&isScheduledOn(u,new Date())).length===0&&<div className="empty">오늘 수업이 없습니다.</div>}</div></section>}
      {tab==='week'&&<section className="panel"><div className="toolbar"><button onClick={()=>setWeekOffset(w=>w-1)}>◀ 이전</button><strong style={{flex:1,textAlign:'center'}}>{weekDays[0].getFullYear()}년 {weekDays[0].getMonth()+1}월 {weekDays[0].getDate()}일 ~ {weekDays[6].getMonth()+1}월 {weekDays[6].getDate()}일</strong><button onClick={()=>setWeekOffset(w=>w+1)}>다음 ▶</button><button onClick={()=>setWeekOffset(0)}>이번주</button></div><div className="week-grid">{weekDays.map(d=>{const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return <div className={`week-day${today()===iso?' today':''}`} key={iso}><div className="week-day-header"><span className="day-char">{DAYS[d.getDay()]}</span><span className="day-date">{d.getMonth()+1}/{d.getDate()}</span></div>{active.filter(u=>u.status!=='paused'&&isScheduledOn(u,d)).map(u=><button className="week-slot" style={{textAlign:'left'}} key={u.id} onClick={()=>{const l=visibleLogs.find(x=>x.studentId===u.id&&x.date===iso);openLog(l, u.id);setEditLog(x=>x?{...x,date:iso}:x);}}><div className="slot-time">{u.scheduleTime}</div><div className="slot-name">{u.name}</div></button>)}</div>;})}</div></section>}
      {tab==='logs'&&<section className="panel"><div className="toolbar"><select value={logFilter} onChange={e=>setLogFilter(e.target.value)}><option value="">전체 수강생</option>{active.map(u=><option value={u.id} key={u.id}>{u.name}</option>)}</select><input type="date" value={logFrom} onChange={e=>setLogFrom(e.target.value)}/><span>~</span><input type="date" value={logTo} onChange={e=>setLogTo(e.target.value)}/><button className="small" onClick={()=>{setLogFrom('');setLogTo('');}}>초기화</button><button className="small" onClick={exportLogs}>📊 CSV</button><button className="primary" style={{marginLeft:'auto'}} onClick={()=>openLog()}>+ 일지</button></div><div className="card-grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(min(440px,100%),1fr))'}}>{filteredLogs.map(l=><div className="log-card" key={l.id}><div className="log-head"><span className="log-date">{l.date}</span><Badge tone={CONSUMING.includes(l.attended)?'ok':'warn'}>{l.attended}</Badge><span className="log-student">{unitMap.get(l.studentId)?.name||'(삭제)'}</span><div className="actions">{settings.feedback&&(l.sentAt?<Badge tone="ok">발송됨</Badge>:<button className="icon" title="발송 완료" onClick={()=>void mutate('markSent','log',l.id,l.revision)}>📤</button>)}<button className="icon" title="복사" onClick={()=>void copy(feedback(l))}>📋</button><button className="icon" title="수정" onClick={()=>openLog(l)}>✏️</button><button className="icon danger" title="삭제" onClick={()=>void mutate('softDelete','log',l.id,l.revision)}>🗑</button></div></div>{l.equipment&&<div><Badge>{l.equipment}</Badge></div>}{l.content&&<div className="log-section"><div className="log-label">프로그램</div><div className="log-content">{l.content}</div></div>}{l.homework&&<div className="log-section"><div className="log-label">피드백</div><div className="log-content feedback">{l.homework}</div></div>}</div>)}{!filteredLogs.length&&<div className="empty">수업일지가 없습니다.</div>}</div></section>}
      {tab==='trash'&&<section className="panel"><div className="toolbar"><span style={{flex:1}}>삭제된 항목 — 복원 가능</span><button className="danger small" disabled title="영구 삭제는 별도 정책 승인 전까지 잠겨 있습니다.">전체 영구삭제 (승인 대기)</button></div><div className="card-grid">{db.units.filter(u=>u.deletedAt).map(u=><div className="log-card deleted" key={u.id}><div className="log-head"><Badge>학생</Badge><strong>{u.name}</strong><div className="actions"><button onClick={()=>void mutate('restore','unit',u.id,u.revision)}>↶ 복원</button><button disabled title="정책 승인 대기">영구삭제</button></div></div></div>)}{db.logs.filter(l=>l.deletedAt).map(l=><div className="log-card deleted" key={l.id}><div className="log-head"><Badge>일지</Badge><span>{l.date}</span><strong>{unitMap.get(l.studentId)?.name||'(삭제)'}</strong><div className="actions"><button onClick={()=>void mutate('restore','log',l.id,l.revision)}>↶ 복원</button><button disabled title="정책 승인 대기">영구삭제</button></div></div></div>)}{trashCount===0&&<div className="empty">휴지통이 비어있습니다.</div>}</div></section>}
      <p className="hint"><kbd>Ctrl</kbd>+<kbd>K</kbd> 검색 · <kbd>Ctrl</kbd>+<kbd>N</kbd> 신규 · 운영 DB 서버 저장</p>
    </main>}

    <dialog ref={unitDialog} onCancel={e=>{e.preventDefault();closeUnit();}} onClose={()=>setEditUnit(null)}>{editUnit&&<form onSubmit={e=>void saveUnit(e)}><div className="dialog-head"><span>{editUnit.id?'체육 수업 수정':'신규 체육 수업'}</span><button type="button" className="ghost" onClick={closeUnit}>✕</button></div><div className="dialog-body"><div className="form-grid">
      <Field label="이름 *"><input required value={editUnit.name} onChange={e=>setEditUnit(u=>u&&({...u,name:e.target.value}))}/></Field>
      <Field label="연령 / 학년"><input value={editUnit.ageGrade} onChange={e=>setEditUnit(u=>u&&({...u,ageGrade:e.target.value}))}/></Field>
      <Field label="수업 형태"><select value={editUnit.classType} onChange={e=>setEditUnit(u=>u&&({...u,classType:e.target.value}))}>{['1:1 개인','1:2 듀엣','소그룹 팀','센터(LAB)'].map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="담당 코치"><input value={editUnit.coach} onChange={e=>setEditUnit(u=>u&&({...u,coach:e.target.value}))}/></Field>
      <Field label="상태"><select value={editUnit.status} onChange={e=>setEditUnit(u=>u&&({...u,status:e.target.value as Unit['status']}))}><option value="active">활성</option><option value="paused">휴강</option></select></Field>
      <Field label="동네"><input value={editUnit.neighborhood} onChange={e=>setEditUnit(u=>u&&({...u,neighborhood:e.target.value}))}/></Field>
      <Field label="장소 구분"><select value={editUnit.placeType} onChange={e=>setEditUnit(u=>u&&({...u,placeType:e.target.value}))}>{['아파트 커뮤니티','야외 공원/운동장','가정 내(거실/마당)','스포키듀 LAB','대관 체육관'].map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="종목"><input value={editUnit.subject} onChange={e=>setEditUnit(u=>u&&({...u,subject:e.target.value}))}/></Field>
      <Field label="상세 주소" full><input value={editUnit.address} onChange={e=>setEditUnit(u=>u&&({...u,address:e.target.value}))}/></Field>
      <Field label="수업 요일" full><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{[0,1,2,3,4,5,6].map(d=><label className={`day-chip${editUnit.scheduleDays.includes(d)?' on':''}`} key={d}><input type="checkbox" style={{display:'none'}} checked={editUnit.scheduleDays.includes(d)} onChange={e=>setEditUnit(u=>u&&({...u,scheduleDays:e.target.checked?[...u.scheduleDays,d].sort():u.scheduleDays.filter(x=>x!==d)}))}/>{DAYS[d]}</label>)}</div></Field>
      <Field label="시간"><input type="time" value={editUnit.scheduleTime} onChange={e=>setEditUnit(u=>u&&({...u,scheduleTime:e.target.value}))}/></Field>
      <Field label="반복"><select value={editUnit.weekPattern} onChange={e=>setEditUnit(u=>u&&({...u,weekPattern:e.target.value as Unit['weekPattern']}))}><option value="every">매주</option><option value="odd">홀수주</option><option value="even">짝수주</option><option value="biweekly">격주</option></select></Field>
      <div className="section-header">👤 보호자</div>
      <Field label="관계"><input value={guardianForm.relation} onChange={e=>setGuardianForm(g=>({...g,relation:e.target.value}))}/></Field>
      <Field label="연락처"><input value={guardianForm.phone} onChange={e=>setGuardianForm(g=>({...g,phone:e.target.value}))} placeholder="010-0000-0000"/></Field>
      {editUnit.id&&guardianOf(editUnit)&&<div className="guardian-hint">보호자 연결 <button type="button" onClick={()=>setGuardianForm({relation:'',phone:'',selectedId:''})}>연결 해제</button></div>}
      {editUnit.id&&guardianForm.selectedId&&guardianForm.selectedId===guardianOf(editUnit)?.id&&guardianForm.phone!==guardianOf(editUnit)?.phone&&<div className="guardian-hint">공유된 보호자 정보는 임의 수정할 수 없습니다. <button type="button" onClick={()=>setGuardianForm(g=>({...g,selectedId:''}))}>새 보호자 정보로 분리</button></div>}
      {guardianForm.phone&&db.guardians.filter(g=>clampPhone(g.phone)===clampPhone(guardianForm.phone)&&g.id!==guardianForm.selectedId).length>0&&<div className="guardian-hint">같은 전화번호의 보호자가 있습니다. 동일인으로 확인한 경우에만 연결하십시오. {db.guardians.filter(g=>clampPhone(g.phone)===clampPhone(guardianForm.phone)&&g.id!==guardianForm.selectedId).map(g=><button key={g.id} type="button" onClick={()=>{if(confirm('같은 보호자로 명시적으로 연결하시겠습니까?'))setGuardianForm({relation:g.relation,phone:g.phone,selectedId:g.id});}}>{g.relation||'보호자'} · {db.links.filter(l=>l.guardianId===g.id).map(l=>unitMap.get(l.unitId)?.name).filter(Boolean).join('·')||'연결된 수강생 없음'} 연결</button>)}</div>}
      <div className="section-header">📋 등록 이력</div>
      <div className="enroll-section"><div className="enroll-table" style={{overflowX:'auto'}}><table className="enroll-table"><thead><tr>{['등록일','회차','금액(만)','결제일','다음결제','유효기간',''].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{draftEnroll.map((en,i)=><tr key={en.id||'new-'+i}><td>{en.enrolledAt}</td><td>{en.sessions}회</td><td>{en.amount}만</td><td>{en.paidAt||'미납'}</td><td>{en.nextDueDate||'-'}</td><td>{en.expiresAt||'-'}</td><td><button type="button" title="등록 취소" onClick={()=>setDraftEnroll(x=>x.filter((_,j)=>i!==j))}>🗑</button></td></tr>)}{!draftEnroll.length&&<tr><td colSpan={7} className="enroll-empty">등록 이력 없음</td></tr>}</tbody></table></div>
        <div className="enroll-add-row"><div className="input-group"><label>등록일</label><input type="date" value={newEnr.enrolledAt} onChange={e=>setNewEnr(n=>({...n,enrolledAt:e.target.value}))}/></div><div className="input-group"><label>등록 회차</label><input type="number" min={1} value={newEnr.sessions||''} onChange={e=>setNewEnr(n=>({...n,sessions:Number(e.target.value)}))}/></div><div className="input-group"><label>금액 (만원)</label><input type="number" min={0} value={newEnr.amount} onChange={e=>setNewEnr(n=>({...n,amount:Number(e.target.value)}))}/></div><div className="input-group"><label>결제일 (미입력=미납)</label><input type="date" value={newEnr.paidAt||''} onChange={e=>setNewEnr(n=>({...n,paidAt:e.target.value||null}))}/></div><div className="input-group"><label>다음 결제 예정일</label><input type="date" value={newEnr.nextDueDate} onChange={e=>setNewEnr(n=>({...n,nextDueDate:e.target.value}))}/></div><div className="input-group"><label>유효기간</label><input type="date" value={newEnr.expiresAt} onChange={e=>setNewEnr(n=>({...n,expiresAt:e.target.value}))}/></div><div className="btn-wrap"><button type="button" className="primary small" onClick={addDraftEnr}>+ 등록 이력 추가</button></div></div></div>
      <Field label="현장 메모" full><textarea value={editUnit.memo} onChange={e=>setEditUnit(u=>u&&({...u,memo:e.target.value}))}/></Field>
    </div></div><div className="dialog-foot"><div className="right"><button type="button" onClick={closeUnit}>취소</button><button type="submit" className="primary" disabled={busy}>저장</button></div></div></form>}</dialog>

    <dialog ref={logDialog} onCancel={e=>{e.preventDefault();closeLog();}} onClose={()=>setEditLog(null)}>{editLog&&<form onSubmit={e=>void saveLog(e)}><div className="dialog-head"><span>{editLog.id?'수업일지 수정':'수업일지'}</span><button type="button" className="ghost" onClick={closeLog}>✕</button></div><div className="dialog-body"><div className="form-grid">
      <Field label="수강생 *" full><select required value={editLog.studentId} onChange={e=>setEditLog(l=>l&&({...l,studentId:e.target.value}))}><option value="">수강생 선택</option>{active.map(u=><option key={u.id} value={u.id}>{u.name} (잔여 {getSessionInfo(u.id,db.enrollments,db.logs).remain}회)</option>)}</select></Field>
      <Field label="일자 *"><input type="date" required value={editLog.date} onChange={e=>setEditLog(l=>l&&({...l,date:e.target.value}))}/></Field>
      <Field label="출석"><select value={editLog.attended} onChange={e=>setEditLog(l=>l&&({...l,attended:e.target.value as LessonLog['attended']}))}>{ATTENDED.map(a=><option key={a}>{a}</option>)}</select></Field>
      <Field label="사용 교구" full><input value={editLog.equipment} onChange={e=>setEditLog(l=>l&&({...l,equipment:e.target.value}))}/></Field>
      <Field label="훈련 프로그램" full><textarea value={editLog.content} onChange={e=>setEditLog(l=>l&&({...l,content:e.target.value}))}/></Field>
      <Field label="코치 피드백 (학부모 공유용)" full><textarea value={editLog.homework} onChange={e=>setEditLog(l=>l&&({...l,homework:e.target.value}))}/></Field>
    </div></div><div className="dialog-foot"><div className="right"><button type="button" onClick={closeLog}>취소</button><button type="submit" className="primary" disabled={busy}>저장</button></div></div></form>}</dialog>

    <dialog ref={reportDialog} onClose={()=>setReportId(null)}>{currentUnit&&<><div className="dialog-head"><span>월간 리포트</span><button className="ghost" onClick={()=>setReportId(null)}>✕</button></div><div className="report-content"><h2 className="report-title">{currentUnit.name}</h2><div className="report-sub">{currentUnit.subject||'체육'} · {today().slice(0,7).replace('-','년 ')}월</div><div className="report-stats"><div className="report-stat"><div className="label">수업</div><div className="value">{reportLogs.length}회</div></div><div className="report-stat"><div className="label">출석률</div><div className="value">{reportLogs.length?Math.round(reportLogs.filter(l=>CONSUMING.includes(l.attended)).length/reportLogs.length*100):0}%</div></div>{settings.enrollment&&<div className="report-stat"><div className="label">잔여</div><div className="value">{getSessionInfo(currentUnit.id,db.enrollments,db.logs).remain}회</div></div>}</div><div className="report-logs">{reportLogs.map(l=><div className="report-log" key={l.id}><div className="report-log-date">{l.date} · {l.attended}</div>{l.content}{l.homework&&<div>💬 {l.homework}</div>}</div>)}</div></div><div className="dialog-foot"><button onClick={()=>void copy(reportText())}>📋 복사</button><div className="right"><button onClick={()=>setReportId(null)}>닫기</button></div></div></>}</dialog>
    <dialog ref={settingsDialog} onClose={()=>setShowSettings(false)}><div className="dialog-head"><span>⚙️ 모듈 사용 설정</span><button className="ghost" onClick={()=>setShowSettings(false)}>✕</button></div><div className="dialog-body"><p>표시 설정만 변경하며 수강생 데이터는 삭제되지 않습니다.</p>{MODULES.map(x=><div className="setting-row" key={x.key}><div style={{flex:1}}><div className="name">{x.name}</div><div className="desc">{x.desc}</div></div><button className={`toggle${settings[x.key]?' on':''}`} role="switch" aria-checked={settings[x.key]} aria-label={x.name} onClick={()=>toggleSetting(x.key)}/></div>)}</div><div className="dialog-foot"><div className="right"><button onClick={()=>setShowSettings(false)}>닫기</button></div></div></dialog>
  </div>;
}
